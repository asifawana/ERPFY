import { database, failure, json, body, queryParam, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getCompanySubscription,
  updateCompanySubscription,
  checkQuota,
  type QuotaResource,
} from '@/lib/billing/guard';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/lib/billing/plans';

import { getPaymentProvider } from '@/lib/billing/providers';

/**
 * GET /api/billing/subscription?companyId=xxx
 * Retrieves active subscription, quotas, available plans, and payment invoices.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = queryParam(request, 'companyId');

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);
    const subscription = await getCompanySubscription(db, companyId);

    const resources: QuotaResource[] = [
      'users',
      'products',
      'orders',
      'branches',
      'modules',
    ];
    const quotas: Record<string, unknown> = {};

    for (const res of resources) {
      quotas[res] = await checkQuota(db, companyId, res);
    }

    const provider = getPaymentProvider();
    const invoices = await provider.getInvoices(companyId);

    return json({
      ok: true,
      subscription,
      quotas,
      availablePlans: Object.values(SUBSCRIPTION_PLANS),
      paymentProvider: {
        name: provider.name,
        isLiveMode: provider.isLiveMode,
        mode: provider.isLiveMode ? 'live' : 'test',
      },
      invoices,
    });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/billing/subscription
 * Upgrades subscription tier or initiates checkout session via payment provider adapter.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId.trim() : '';
    const tier = typeof payload.tier === 'string' ? payload.tier.trim() : '';
    const billingCycle = payload.billingCycle === 'annual' ? 'annual' : 'monthly';
    const action = typeof payload.action === 'string' ? payload.action.trim() : 'direct_update';

    if (!companyId || !tier) {
      throw new ApiError(400, 'Company ID and subscription tier are required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);

    const validTiers: SubscriptionTier[] = [
      'free',
      'starter',
      'professional',
      'business',
      'enterprise',
    ];
    if (!validTiers.includes(tier as SubscriptionTier)) {
      throw new ApiError(400, `Invalid subscription tier: ${tier}`);
    }

    const provider = getPaymentProvider();

    // If client requested checkout session creation for paid plan
    if (action === 'checkout' && tier !== 'free') {
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const checkout = await provider.createCheckoutSession({
        companyId,
        companyName: `Tenant ${companyId}`,
        planTier: tier as SubscriptionTier,
        billingCycle,
        successUrl: `${origin}/account/settings?company=${companyId}&tab=subscription&billing_status=success`,
        cancelUrl: `${origin}/account/settings?company=${companyId}&tab=subscription&billing_status=cancelled`,
      });

      return json({
        ok: true,
        action: 'checkout_redirect',
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        mode: checkout.mode,
        provider: checkout.provider,
      });
    }

    // Direct update (free plan or verified payment webhook)
    const updated = await updateCompanySubscription(
      db,
      companyId,
      tier as SubscriptionTier,
      billingCycle,
    );

    return json({
      ok: true,
      subscription: updated,
      mode: provider.isLiveMode ? 'live' : 'test',
      provider: provider.name,
    });
  } catch (error) {
    return failure(error);
  }
}
