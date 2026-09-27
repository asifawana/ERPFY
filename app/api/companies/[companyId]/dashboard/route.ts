import { requireCompanyAccess, requireCompanyAccessBySlug, type CompanyAccess } from '@/lib/core/company';
import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import {
  getCompanyDashboardData,
  type TimeRangeKey,
} from '@/lib/dashboard/data-service';

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const { companyId } = await context.params;

    // Verify company access by id or slug
    let company: CompanyAccess;
    try {
      company = await requireCompanyAccess(db, viewer.accountId, companyId);
    } catch {
      company = await requireCompanyAccessBySlug(db, viewer.accountId, companyId);
    }

    const url = new URL(request.url);
    const period = (url.searchParams.get('period') as TimeRangeKey) || '7d';
    const warehouseId = url.searchParams.get('warehouse') || 'all';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const customDates = from && to ? { from, to } : undefined;

    const data = await getCompanyDashboardData(db, {
      companyId: company.id,
      companySlug: company.slug,
      baseCurrency: company.currency || 'USD',
      period,
      warehouseId,
      customDates,
    });

    return json({ data });
  } catch (error) {
    return failure(error);
  }
}
