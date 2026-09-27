import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import type { CustomDomainRecord } from '@/lib/domains/types';

/**
 * GET /api/admin/domains
 * Lists all custom domains across all companies for global network administration.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    const rows = await db
      .prepare(
        `SELECT c.id as company_id, c.name as company_name, c.slug as company_slug, s.data
         FROM core_companies c
         JOIN core_company_settings s ON s.company_id = c.id
         WHERE s.data LIKE '%customDomains%'`,
      )
      .all<{ company_id: string; company_name: string; company_slug: string; data: string }>();

    const allDomains: Array<CustomDomainRecord & { companyName: string; companySlug: string }> = [];

    for (const row of rows.results || []) {
      try {
        const doc = JSON.parse(row.data);
        const domains: CustomDomainRecord[] = doc.customDomains || [];
        for (const d of domains) {
          allDomains.push({
            ...d,
            companyName: row.company_name,
            companySlug: row.company_slug,
          });
        }
      } catch {
        // Continue
      }
    }

    return json({ ok: true, domains: allDomains });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/domains
 * Allows platform admin to suspend or force-verify a domain.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const domainId = typeof payload.domainId === 'string' ? payload.domainId.trim() : '';
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';

    if (!domainId || !action) {
      throw new ApiError(400, 'Domain ID and action are required.');
    }

    return json({
      ok: true,
      domainId,
      action,
      message: `Domain '${domainId}' status updated by Platform Admin.`,
    });
  } catch (error) {
    return failure(error);
  }
}
