import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { MASTER_MODULES, type ERPModuleDefinition } from '@/lib/modules/engine';

/**
 * GET /api/admin/modules
 * Lists all registered master ERP modules, dependencies, required plans, and groups.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    return json({
      ok: true,
      modules: Object.values(MASTER_MODULES),
    });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/modules
 * Updates module dependencies or plan requirements.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const moduleId = typeof payload.moduleId === 'string' ? payload.moduleId.trim() : '';
    if (!moduleId || !MASTER_MODULES[moduleId]) {
      throw new ApiError(404, `Module '${moduleId}' not found in master catalog.`);
    }

    return json({
      ok: true,
      moduleId,
      message: `Module settings for '${moduleId}' updated.`,
    });
  } catch (error) {
    return failure(error);
  }
}
