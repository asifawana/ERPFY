import type { D1Database } from '@cloudflare/workers-types';
import { SUBSCRIPTION_PLANS, type SubscriptionTier, type CompanySubscription, type PlanLimits } from './plans';

interface CompanySettingsPayload {
  subscription?: CompanySubscription;
  customDomains?: unknown[];
  enabledModules?: string[];
  [key: string]: unknown;
}

export type QuotaResource =
  | 'users'
  | 'products'
  | 'orders'
  | 'branches'
  | 'custom_domains'
  | 'modules';

export interface QuotaCheckResult {
  allowed: boolean;
  resource: QuotaResource;
  currentUsage: number;
  limit: number;
  tier: SubscriptionTier;
  message?: string;
}

/**
 * Retrieves the active subscription for a company. Defaults to 'professional' for demonstration/testing or 'starter'.
 */
export async function getCompanySubscription(
  db: D1Database,
  companyId: string,
): Promise<CompanySubscription> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  let tier: SubscriptionTier = 'professional';
  let status: CompanySubscription['status'] = 'active';
  let billingCycle: 'monthly' | 'annual' = 'monthly';

  if (row?.data) {
    try {
      const parsed = JSON.parse(row.data) as CompanySettingsPayload;
      if (parsed.subscription) {
        return parsed.subscription;
      }
    } catch {
      // Fallback
    }
  }

  const planDef = SUBSCRIPTION_PLANS[tier];
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    tier,
    status,
    billingCycle,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    cancelAtPeriodEnd: false,
    limits: planDef.limits,
  };
}

/**
 * Checks if a company is within its quota limits for a given resource.
 */
export async function checkQuota(
  db: D1Database,
  companyId: string,
  resource: QuotaResource,
): Promise<QuotaCheckResult> {
  const sub = await getCompanySubscription(db, companyId);
  const limits: PlanLimits = sub.limits;

  let currentUsage = 0;
  let limit = 0;

  switch (resource) {
    case 'users': {
      limit = limits.maxUsers;
      const count = await db
        .prepare(`SELECT COUNT(*) as cnt FROM core_company_accounts WHERE company_id = ?1`)
        .bind(companyId)
        .first<{ cnt: number }>();
      currentUsage = count?.cnt || 0;
      break;
    }
    case 'products': {
      limit = limits.maxProducts;
      const count = await db
        .prepare(`SELECT COUNT(*) as cnt FROM inv_items WHERE company_id = ?1`)
        .bind(companyId)
        .first<{ cnt: number }>();
      currentUsage = count?.cnt || 0;
      break;
    }
    case 'orders': {
      limit = limits.maxOrdersPerMonth;
      const count = await db
        .prepare(`SELECT COUNT(*) as cnt FROM sales_orders WHERE company_id = ?1`)
        .bind(companyId)
        .first<{ cnt: number }>();
      currentUsage = count?.cnt || 0;
      break;
    }
    case 'branches': {
      limit = limits.maxBranches;
      const count = await db
        .prepare(`SELECT COUNT(*) as cnt FROM org_branches WHERE company_id = ?1`)
        .bind(companyId)
        .first<{ cnt: number }>();
      currentUsage = count?.cnt || 1;
      break;
    }
    case 'custom_domains': {
      limit = limits.maxCustomDomains;
      const row = await db
        .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
        .bind(companyId)
        .first<{ data: string }>();
      if (row?.data) {
        try {
          const parsed = JSON.parse(row.data) as CompanySettingsPayload;
          currentUsage = parsed.customDomains?.length || 0;
        } catch {
          currentUsage = 0;
        }
      }
      break;
    }
    case 'modules': {
      limit = limits.maxActiveModules;
      const row = await db
        .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
        .bind(companyId)
        .first<{ data: string }>();
      if (row?.data) {
        try {
          const parsed = JSON.parse(row.data) as CompanySettingsPayload;
          currentUsage = parsed.enabledModules?.length || 6;
        } catch {
          currentUsage = 6;
        }
      }
      break;
    }
  }

  const allowed = currentUsage < limit;

  return {
    allowed,
    resource,
    currentUsage,
    limit,
    tier: sub.tier,
    message: allowed
      ? undefined
      : `Plan limit reached for ${resource} (${currentUsage}/${limit}). Please upgrade to a higher tier plan.`,
  };
}

/**
 * Updates a company's subscription plan tier.
 */
export async function updateCompanySubscription(
  db: D1Database,
  companyId: string,
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<CompanySubscription> {
  const planDef = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;
  const now = new Date();
  const nextPeriod = new Date(now);
  if (billingCycle === 'annual') {
    nextPeriod.setFullYear(nextPeriod.getFullYear() + 1);
  } else {
    nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  }

  const subscription: CompanySubscription = {
    tier,
    status: 'active',
    billingCycle,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextPeriod.toISOString(),
    cancelAtPeriodEnd: false,
    limits: planDef.limits,
  };

  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  let settingsDoc: CompanySettingsPayload = {};
  if (settingsRow?.data) {
    try {
      settingsDoc = JSON.parse(settingsRow.data);
    } catch {
      settingsDoc = {};
    }
  }

  settingsDoc.subscription = subscription;

  const company = await db
    .prepare('SELECT created_by FROM core_companies WHERE id = ?1 LIMIT 1')
    .bind(companyId)
    .first<{ created_by: string }>();
  const actorId = company?.created_by || 'acc_admin';
  const timestamp = Date.now();

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (company_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(companyId, JSON.stringify(settingsDoc), timestamp, actorId)
    .run();

  return subscription;
}
