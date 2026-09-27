import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { getAdminCategories, saveAdminCategory } from '@/lib/categories/admin-registry';

/**
 * GET /api/admin/categories
 * Lists all active categories (built-in 22 blueprints + admin defined).
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    const categories = await getAdminCategories(db);
    return json({ ok: true, categories });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/categories
 * Creates or updates an admin category definition or feature flag.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const slug = typeof payload.slug === 'string' ? payload.slug.trim().toLowerCase() : '';
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';

    if (!slug || !name) {
      throw new ApiError(400, 'Category slug and name are required.');
    }

    const saved = await saveAdminCategory(
      db,
      {
        slug,
        name,
        icon: typeof payload.icon === 'string' ? payload.icon : undefined,
        description: typeof payload.description === 'string' ? payload.description : undefined,
        isCustom: true,
        isActive: payload.isActive !== false,
        recommendedModules: payload.recommendedModules as any,
        requiredModules: payload.requiredModules as any,
        optionalModules: payload.optionalModules as any,
        dashboardWidgets: payload.dashboardWidgets as any,
        terminology: payload.terminology as any,
        featureFlags: payload.featureFlags as Record<string, boolean> | undefined,
      },
      viewer.accountId,
    );


    return json({ ok: true, category: saved });
  } catch (error) {
    return failure(error);
  }
}
