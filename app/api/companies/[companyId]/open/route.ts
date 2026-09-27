import { requireCompanyAccess } from '@/lib/core/company';
import { body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const db = database();
    await body(request);
    const viewer = await requireViewer(db, request.headers);
    const { companyId } = await context.params;
    const company = await requireCompanyAccess(db, viewer.accountId, companyId);
    const openedAt = Date.now();

    await db
      .prepare(
        `INSERT INTO core_company_visits (account_id, company_id, last_opened_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT (account_id, company_id)
         DO UPDATE SET last_opened_at = excluded.last_opened_at`,
      )
      .bind(viewer.accountId, company.id, openedAt)
      .run();

    return json({ companyId: company.id, slug: company.slug, openedAt });
  } catch (error) {
    return failure(error);
  }
}
