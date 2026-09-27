import { ApiError, body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePermission } from '@/lib/core/authorization';
import { requireCompanyAccess, requireCompanyAccessBySlug, type CompanyAccess } from '@/lib/core/company';
import {
  loadCompanyDashboardDefault,
  saveCompanyDashboardDefault,
  resetCompanyDashboardDefault,
} from '@/lib/core/settings';

export async function GET(
  request: Request,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    let access: CompanyAccess;
    try {
      access = await requireCompanyAccess(db, viewer.accountId, companyId);
    } catch {
      access = await requireCompanyAccessBySlug(db, viewer.accountId, companyId);
    }

    await requirePermission(
      db,
      viewer.accountId,
      access.id,
      'settings.view',
    );

    const defaults = await loadCompanyDashboardDefault(db, access.id);
    return json({ defaults });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    let access: CompanyAccess;
    try {
      access = await requireCompanyAccess(db, viewer.accountId, companyId);
    } catch {
      access = await requireCompanyAccessBySlug(db, viewer.accountId, companyId);
    }

    // Authority: setting company defaults strictly requires settings.manage authority
    await requirePermission(
      db,
      viewer.accountId,
      access.id,
      'settings.manage',
    );

    const payload = await body(request);

    if (payload.action === 'reset') {
      await resetCompanyDashboardDefault(db, access.id, viewer.accountId);
      return json({ success: true, reset: true });
    }

    const rawList = payload.widgets || payload.defaultWidgets;
    if (!Array.isArray(rawList)) {
      throw new ApiError(400, 'Widgets must be an array.');
    }

    const allowedSizes = ['kpi', 'small', 'medium', 'large', 'full'] as const;
    type WidgetSize = (typeof allowedSizes)[number];
    const sanitizedWidgets = rawList.map((w: Record<string, unknown>) => {
      if (typeof w.id !== 'string') {
        throw new ApiError(400, 'Each widget preference must have a string id.');
      }
      return {
        id: w.id,
        visible: typeof w.visible === 'boolean' ? w.visible : true,
        order: typeof w.order === 'number' ? w.order : undefined,
        size: typeof w.size === 'string' && allowedSizes.includes(w.size as WidgetSize) ? (w.size as WidgetSize) : undefined,
        collapsed: typeof w.collapsed === 'boolean' ? w.collapsed : false,
      };
    });

    const saved = await saveCompanyDashboardDefault(
      db,
      access.id,
      { widgets: sanitizedWidgets },
      viewer.accountId,
    );

    return json({ success: true, defaults: saved });
  } catch (error) {
    return failure(error);
  }
}
