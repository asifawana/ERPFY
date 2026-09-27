import { database, failure, json, body, queryParam, ApiError } from '@/lib/core/server';
import { currentViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import { checkQuota } from '@/lib/billing/guard';
import { dispatchWebhook } from '@/lib/webhooks/dispatcher';
import { randomUUID } from 'crypto';

/**
 * Authenticates API request via session or API token.
 */
async function authenticateApiRequest(db: D1Database, request: Request, companyId: string) {
  const viewer = await currentViewer(db, request.headers);
  if (viewer) {
    await requireCompanyAccess(db, viewer.accountId, companyId);
    return { accountId: viewer.accountId };
  }

  // Token authentication check (Bearer or X-API-Key)
  const authHeader = request.headers.get('authorization') || '';
  const apiKeyHeader = request.headers.get('x-api-key') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader.trim();

  if (!token) {
    throw new ApiError(401, 'Authentication required. Provide a valid session or API key.');
  }

  // Verify company exists
  const company = await db
    .prepare('SELECT id FROM core_companies WHERE id = ?1 AND state != ?2')
    .bind(companyId, 'cancelled')
    .first();

  if (!company) {
    throw new ApiError(404, 'That ERP could not be found.');
  }

  return { accountId: 'api-token' };
}

/**
 * GET /api/v1/products?companyId=xxx&limit=50&offset=0&search=xxx
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const companyId = queryParam(request, 'companyId') || request.headers.get('x-company-id');
    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await authenticateApiRequest(db, request, companyId);

    const rawLimit = parseInt(queryParam(request, 'limit') || '50', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const offset = Math.max(parseInt(queryParam(request, 'offset') || '0', 10), 0);
    const search = queryParam(request, 'search') || '';

    // Query items from company settings / products catalog
    const row = await db
      .prepare('SELECT data FROM core_company_settings WHERE company_id = ?1')
      .bind(companyId)
      .first<{ data: string }>();

    let products: Array<Record<string, unknown>> = [];
    if (row?.data) {
      try {
        const doc = JSON.parse(row.data);
        if (Array.isArray(doc.productsCatalog)) {
          products = doc.productsCatalog;
        }
      } catch {
        products = [];
      }
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          (typeof p.name === 'string' && p.name.toLowerCase().includes(q)) ||
          (typeof p.sku === 'string' && p.sku.toLowerCase().includes(q)),
      );
    }


    const total = products.length;
    const paginated = products.slice(offset, offset + limit);

    return json({
      ok: true,
      data: paginated,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/v1/products
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const payload = await body(request);

    const companyId =
      typeof payload.companyId === 'string'
        ? payload.companyId.trim()
        : queryParam(request, 'companyId') || request.headers.get('x-company-id') || '';

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await authenticateApiRequest(db, request, companyId);

    // Enforce subscription quota
    const quotaCheck = await checkQuota(db, companyId, 'products');
    if (!quotaCheck.allowed) {
      throw new ApiError(402, quotaCheck.message || 'Product limit reached for your plan.');
    }

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw new ApiError(400, 'Product name is required.');
    }

    const id = `item_${randomUUID().slice(0, 16)}`;
    const now = new Date().toISOString();

    const newProduct = {
      id,
      companyId,
      name,
      sku: typeof payload.sku === 'string' ? payload.sku.trim() : `SKU-${Date.now().toString().slice(-6)}`,
      barcode: typeof payload.barcode === 'string' ? payload.barcode.trim() : undefined,
      description: typeof payload.description === 'string' ? payload.description.trim() : '',
      salesPrice: typeof payload.salesPrice === 'number' ? payload.salesPrice : 0,
      costPrice: typeof payload.costPrice === 'number' ? payload.costPrice : 0,
      stockQuantity: typeof payload.stockQuantity === 'number' ? payload.stockQuantity : 10,
      unitOfMeasure: typeof payload.unitOfMeasure === 'string' ? payload.unitOfMeasure : 'pcs',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Persist into company products catalog
    const row = await db
      .prepare('SELECT data FROM core_company_settings WHERE company_id = ?1')
      .bind(companyId)
      .first<{ data: string }>();

    let doc: Record<string, unknown> = {};
    if (row?.data) {
      try {
        doc = JSON.parse(row.data);
      } catch {
        doc = {};
      }
    }

    const catalog = Array.isArray(doc.productsCatalog)
      ? (doc.productsCatalog as Array<Record<string, unknown>>)
      : [];
    catalog.unshift(newProduct);
    doc.productsCatalog = catalog;

    await db
      .prepare(
        `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
         VALUES (?1, ?2, ?3, 'api_v1')
         ON CONFLICT (company_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at`,
      )
      .bind(companyId, JSON.stringify(doc), Date.now())
      .run();

    // Dispatch webhook event
    dispatchWebhook(db, companyId, 'product.created', newProduct).catch(() => {});

    return json({ ok: true, data: newProduct }, 201);
  } catch (error) {
    return failure(error);
  }
}
