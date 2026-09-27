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

  const authHeader = request.headers.get('authorization') || '';
  const apiKeyHeader = request.headers.get('x-api-key') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader.trim();

  if (!token) {
    throw new ApiError(401, 'Authentication required. Provide a valid session or API key.');
  }

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
 * GET /api/v1/orders?companyId=xxx&limit=50&offset=0&status=xxx
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
    const status = queryParam(request, 'status') || '';

    const row = await db
      .prepare('SELECT data FROM core_company_settings WHERE company_id = ?1')
      .bind(companyId)
      .first<{ data: string }>();

    let orders: Array<Record<string, unknown>> = [];
    if (row?.data) {
      try {
        const doc = JSON.parse(row.data);
        if (Array.isArray(doc.ecommerceOrders)) {
          orders = doc.ecommerceOrders;
        }
      } catch {
        orders = [];
      }
    }

    if (status) {
      orders = orders.filter((o) => o.fulfillmentStatus === status || o.paymentStatus === status);
    }

    const total = orders.length;
    const paginated = orders.slice(offset, offset + limit);

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
 * POST /api/v1/orders
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

    // Enforce quota
    const quotaCheck = await checkQuota(db, companyId, 'orders');
    if (!quotaCheck.allowed) {
      throw new ApiError(402, quotaCheck.message || 'Order limit reached for your plan.');
    }

    const id = `ord_${randomUUID().slice(0, 16)}`;
    const orderNumber = `SO-${Date.now().toString().slice(-6)}`;
    const now = Date.now();

    const newOrder = {
      id,
      orderNumber,
      companyId,
      customerName: typeof payload.customerName === 'string' ? payload.customerName.trim() : 'B2B Customer',
      customerEmail: typeof payload.customerEmail === 'string' ? payload.customerEmail.trim() : 'orders@customer.local',
      items: Array.isArray(payload.items) ? payload.items : [],
      subtotal: typeof payload.subtotal === 'number' ? payload.subtotal : 0,
      taxAmount: typeof payload.taxAmount === 'number' ? payload.taxAmount : 0,
      shippingFee: typeof payload.shippingFee === 'number' ? payload.shippingFee : 0,
      discountAmount: typeof payload.discountAmount === 'number' ? payload.discountAmount : 0,
      total: typeof payload.total === 'number' ? payload.total : 0,
      paymentMethod: payload.paymentMethod || 'bank_transfer',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      placedAt: now,
    };

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

    const orders = Array.isArray(doc.ecommerceOrders)
      ? (doc.ecommerceOrders as Array<Record<string, unknown>>)
      : [];
    orders.unshift(newOrder);
    doc.ecommerceOrders = orders;

    await db
      .prepare(
        `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
         VALUES (?1, ?2, ?3, 'api_v1')
         ON CONFLICT (company_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at`,
      )
      .bind(companyId, JSON.stringify(doc), now)
      .run();

    // Dispatch webhook event
    dispatchWebhook(db, companyId, 'order.created', newOrder).catch(() => {});

    return json({ ok: true, data: newOrder }, 201);
  } catch (error) {
    return failure(error);
  }
}
