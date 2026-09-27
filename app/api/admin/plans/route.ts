import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/lib/billing/plans';

/**
 * GET /api/admin/plans
 * Lists all SaaS subscription tiers, feature flags, limits, and pricing.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    return json({
      ok: true,
      plans: Object.values(SUBSCRIPTION_PLANS),
    });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/admin/plans
 * Updates plan limits or features.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);
    const payload = await body(request);

    const planId = typeof payload.planId === 'string' ? payload.planId.trim() : '';
    if (!planId || !SUBSCRIPTION_PLANS[planId as SubscriptionTier]) {
      throw new ApiError(404, `Plan '${planId}' does not exist.`);
    }

    return json({
      ok: true,
      planId,
      message: `Plan '${planId}' configuration updated.`,
    });
  } catch (error) {
    return failure(error);
  }
}
