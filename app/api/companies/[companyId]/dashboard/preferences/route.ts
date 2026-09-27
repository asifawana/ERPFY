import { ApiError, body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess, requireCompanyAccessBySlug, type CompanyAccess } from '@/lib/core/company';
import {
  loadUserDashboardPreferences,
  saveUserDashboardPreferences,
  resetUserDashboardPreferences,
  loadCompanyDashboardDefault,
} from '@/lib/core/settings';
import { resolveDashboardForUser } from '@/lib/dashboard/personalization';

export async function GET(
  request: Request,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    // Verify membership and basic access to company by id or slug
    let access: CompanyAccess;
    try {
      access = await requireCompanyAccess(db, viewer.accountId, companyId);
    } catch {
      access = await requireCompanyAccessBySlug(db, viewer.accountId, companyId);
    }

    const userPreferences = await loadUserDashboardPreferences(
      db,
      viewer.accountId,
      access.id,
    );
    const companyDefaults = await loadCompanyDashboardDefault(db, access.id);

    // Resolve installed apps
    const installedRows = await db
      .prepare(
        `SELECT a.slug, a.id as app_id
           FROM eap_app_installations i
           JOIN eap_apps a ON a.id = i.app_id
          WHERE i.company_id = ?1 AND i.status = 'installed' AND a.is_killed = 0
          ORDER BY i.installed_at ASC`,
      )
      .bind(access.id)
      .all<{ slug: string; app_id: string }>();
    const installedSlugs = (installedRows.results || []).map((r) => r.slug);

    // Resolve user permissions
    const userRolePerms = await db
      .prepare(
        `SELECT DISTINCT rp.permission_key
           FROM core_membership_roles mr
           JOIN core_roles r ON r.id = mr.role_id
           JOIN core_role_permissions rp ON rp.role_id = r.id
          WHERE mr.company_id = ?1 AND mr.account_id = ?2`,
      )
      .bind(access.id, viewer.accountId)
      .all<{ permission_key: string }>();
    const userPermissions = access.role === 'owner'
      ? ['*']
      : (userRolePerms.results || []).map((r) => r.permission_key);

    const resolved = resolveDashboardForUser({
      user: {
        id: viewer.accountId,
        accountId: viewer.accountId,
        email: viewer.email,
        role: access.role,
      },
      companyId: access.id,
      companySlug: access.slug,
      installedAppSlugs: installedSlugs,
      userPermissions,
      companyDefaults,
      userPreferences,
    });

    return json({
      preferences: userPreferences,
      companyDefaults,
      resolved,
    });
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

    const payload = await body(request);

    if (payload.action === 'reset') {
      await resetUserDashboardPreferences(db, viewer.accountId, access.id);
      return json({ success: true, reset: true });
    }

    const rawList = payload.widgets || payload.preferences;
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

    const saved = await saveUserDashboardPreferences(
      db,
      viewer.accountId,
      access.id,
      { widgets: sanitizedWidgets },
    );

    return json({ success: true, preferences: saved });
  } catch (error) {
    return failure(error);
  }
}
