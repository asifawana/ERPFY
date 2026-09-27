import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { getCompanySubscription } from '@/lib/billing/guard';

/**
 * GET /api/admin/companies
 * Platform Admin view of all tenant companies across the network.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    const companies = await db
      .prepare(
        `SELECT id, name, slug, industry, category, status, created_at, created_by
         FROM core_companies
         ORDER BY created_at DESC LIMIT 100`,
      )
      .all<{
        id: string;
        name: string;
        slug: string;
        industry: string;
        category?: string;
        status?: string;
        created_at: number;
        created_by: string;
      }>();

    const results = [];
    for (const comp of companies.results || []) {
      const sub = await getCompanySubscription(db, comp.id);
      const userCountRow = await db
        .prepare(`SELECT count(*) as cnt FROM core_memberships WHERE company_id = ?1`)
        .bind(comp.id)
        .first<{ cnt: number }>();

      results.push({
        ...comp,
        category: comp.category || comp.industry || 'general-retail',
        status: comp.status || 'active',
        subscription: sub,
        userCount: userCountRow?.cnt || 1,
      });
    }

    return json({ ok: true, companies: results });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/companies
 * Updates company status (e.g. suspend/re-activate) or category assignment.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId : null;
    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    const action = payload.action;
    const now = Date.now();

    if (action === 'suspend' || action === 'activate') {
      const newStatus = action === 'suspend' ? 'suspended' : 'active';
      await db
        .prepare(`UPDATE core_companies SET status = ?1 WHERE id = ?2`)
        .bind(newStatus, companyId)
        .run();
      return json({ ok: true, companyId, status: newStatus });
    }

    if (action === 'assign_category') {
      const category = typeof payload.category === 'string' ? payload.category : 'general-retail';
      await db
        .prepare(`UPDATE core_companies SET category = ?1 WHERE id = ?2`)
        .bind(category, companyId)
        .run();
      return json({ ok: true, companyId, category });
    }

    throw new ApiError(400, `Unknown admin company action: ${action}`);
  } catch (error) {
    return failure(error);
  }
}
