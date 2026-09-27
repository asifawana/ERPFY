import { database, failure, json, body, ApiError, auditStatement } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getOrCreateStoreForCompany,
  resolveStoreBySlugOrDomain,
} from '@/lib/ecommerce/store';
import type { EcommerceStore } from '@/lib/ecommerce/types';

function queryParam(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);
  return value && value.length <= 128 ? value : null;
}

/**
 * GET /api/ecommerce/store?companyId=xxx OR ?slug=xxx
 * Returns the ecommerce store settings for an ERP workspace or public storefront.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const companyId = queryParam(request, 'companyId');
    const slug = queryParam(request, 'slug');

    if (slug) {
      const { store, company } = await resolveStoreBySlugOrDomain(db, slug);
      return json({ store, company });
    }

    if (!companyId) {
      throw new ApiError(400, 'Company ID or store slug is required.');
    }

    const viewer = await requireViewer(db, request.headers);
    const company = await requireCompanyAccess(db, viewer.accountId, companyId);
    const store = await getOrCreateStoreForCompany(
      db,
      company.id,
      company.name,
      company.slug,
      company.currency,
    );

    return json({ store, company });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/ecommerce/store
 * Updates the ecommerce store configuration for an ERP workspace.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId : null;
    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    const company = await requireCompanyAccess(db, viewer.accountId, companyId);
    if (company.role !== 'owner' && company.role !== 'administrator') {
      throw new ApiError(403, 'Only owners and admins can configure store settings.');
    }

    const existingStore = await getOrCreateStoreForCompany(
      db,
      company.id,
      company.name,
      company.slug,
      company.currency,
    );

    const updatedStore: EcommerceStore = {
      ...existingStore,
      name: typeof payload.name === 'string' ? payload.name.trim() : existingStore.name,
      announcementText:
        typeof payload.announcementText === 'string'
          ? payload.announcementText.trim()
          : existingStore.announcementText,
      announcementEnabled:
        typeof payload.announcementEnabled === 'boolean'
          ? payload.announcementEnabled
          : existingStore.announcementEnabled,
      shippingFlatRate:
        typeof payload.shippingFlatRate === 'number'
          ? payload.shippingFlatRate
          : existingStore.shippingFlatRate,
      freeShippingThreshold:
        typeof payload.freeShippingThreshold === 'number'
          ? payload.freeShippingThreshold
          : existingStore.freeShippingThreshold,
      taxRatePercent:
        typeof payload.taxRatePercent === 'number'
          ? payload.taxRatePercent
          : existingStore.taxRatePercent,
      activeThemeId:
        typeof payload.activeThemeId === 'string'
          ? payload.activeThemeId.trim()
          : existingStore.activeThemeId,
      status:
        payload.status === 'active' || payload.status === 'maintenance' || payload.status === 'disabled'
          ? payload.status
          : existingStore.status,
      operatingMode:
        payload.operatingMode === 'unified' || payload.operatingMode === 'store_only' || payload.operatingMode === 'erp_only'
          ? payload.operatingMode
          : existingStore.operatingMode || 'unified',
      seoTitle:
        typeof payload.seoTitle === 'string' ? payload.seoTitle.trim() : existingStore.seoTitle,
      seoDescription:
        typeof payload.seoDescription === 'string' ? payload.seoDescription.trim() : existingStore.seoDescription,
      seoKeywords:
        typeof payload.seoKeywords === 'string' ? payload.seoKeywords.trim() : existingStore.seoKeywords,
      ogImageUrl:
        typeof payload.ogImageUrl === 'string' ? payload.ogImageUrl.trim() : existingStore.ogImageUrl,
      updatedAt: Date.now(),
    };

    // Save into core_company_settings
    const row = await db
      .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
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

    doc.ecommerceStore = updatedStore;

    await db.batch([
      db
        .prepare(
          `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (company_id) DO UPDATE SET
             data = excluded.data,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
        )
        .bind(companyId, JSON.stringify(doc), updatedStore.updatedAt, viewer.accountId),
      auditStatement(db, {
        companyId,
        accountId: viewer.accountId,
        action: 'ecommerce.store.updated',
        detail: `Updated ecommerce store settings for "${updatedStore.name}"`,
      }),
    ]);

    return json({ ok: true, store: updatedStore });
  } catch (error) {
    return failure(error);
  }
}
