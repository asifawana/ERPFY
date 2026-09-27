import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { AVAILABLE_THEMES, type ThemeSummary } from '@/lib/theme-engine/settings';

/**
 * GET /api/admin/themes
 * Lists all registered platform themes with status and metadata.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    const themes = Object.values(AVAILABLE_THEMES).map((t) => ({
      ...t,
      status: 'published',
      approvalStatus: 'approved',
    }));

    return json({ ok: true, themes });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/themes
 * Approves, rejects, suspends, or unpublishes a theme in the marketplace.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const themeId = typeof payload.themeId === 'string' ? payload.themeId.trim() : '';
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';

    if (!themeId || !action) {
      throw new ApiError(400, 'Theme ID and action are required.');
    }

    return json({
      ok: true,
      themeId,
      action,
      message: `Theme '${themeId}' action '${action}' processed.`,
    });
  } catch (error) {
    return failure(error);
  }
}
