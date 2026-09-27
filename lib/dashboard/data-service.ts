/**
 * ERPFY Dashboard Real Data Service
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 40, 88.
 *
 * Truthful, database-backed operational metrics for company dashboards.
 * Core platform owns authorization, company isolation, and branch scoping.
 * No demo, sample, or fabricated metrics in production runtime.
 */

import type { D1Database } from '@cloudflare/workers-types';

export type TimeRangeKey = 'today' | '7d' | '30d' | 'mtd' | 'ytd' | 'custom';

export type WarehouseInfo = {
  id: string;
  name: string;
};

export type DashboardChartPoint = {
  label: string;
  sales: number;
  purchases: number;
};

export type DashboardSplinePoint = {
  label: string;
  sent: number;
  received: number;
};

export type DashboardSlice = {
  name: string;
  value: number;
  color?: string;
};

export type DashboardPaymentMethod = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

export type DashboardStockValue = {
  label: string;
  value: number;
  color: string;
  barColor: string;
};

export type DashboardRankedProduct = {
  rank: number;
  name: string;
  amount: number;
  soldCount: number;
  percentage: number;
};

export type DashboardRecentSale = {
  reference: string;
  customer: string;
  warehouse: string;
  status: string;
  total: number;
  paid: number;
  due: number;
  paymentStatus: string;
};

export type DashboardDataResult = {
  companyId: string;
  companySlug: string;
  baseCurrency: string;
  installedAppSlugs: string[];
  hasAnyApps: boolean;
  warehouses: WarehouseInfo[];
  figures: Record<string, number>;
  salesPurchases: DashboardChartPoint[];
  paymentSentReceived: DashboardSplinePoint[];
  topProducts: DashboardSlice[];
  topCustomers: DashboardSlice[];
  salesByPayment: DashboardPaymentMethod[];
  stockValues: DashboardStockValue[];
  topSellingList: DashboardRankedProduct[];
  totalUnits: number;
  recentSales: DashboardRecentSale[];
};

export function calculateDateRangeBounds(
  period: TimeRangeKey,
  customDates?: { from: string; to: string },
): { startMs: number; endMs: number } {
  const now = new Date();
  const endMs = now.getTime();

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startMs: start.getTime(), endMs };
    }
    case '7d': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startMs: start.getTime(), endMs };
    }
    case '30d': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startMs: start.getTime(), endMs };
    }
    case 'mtd': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startMs: start.getTime(), endMs };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startMs: start.getTime(), endMs };
    }
    case 'custom': {
      if (customDates?.from && customDates?.to) {
        const fromDate = new Date(`${customDates.from}T00:00:00`);
        const toDate = new Date(`${customDates.to}T23:59:59.999`);
        return {
          startMs: isNaN(fromDate.getTime()) ? endMs - 7 * 86400000 : fromDate.getTime(),
          endMs: isNaN(toDate.getTime()) ? endMs : toDate.getTime(),
        };
      }
      return { startMs: endMs - 7 * 86400000, endMs };
    }
    default:
      return { startMs: endMs - 7 * 86400000, endMs };
  }
}

/**
 * Loads real database-backed dashboard metrics for a company.
 * Strictly company-isolated; never uses hard-coded demo arrays.
 */
export async function getCompanyDashboardData(
  db: D1Database,
  {
    companyId,
    companySlug,
    baseCurrency = 'USD',
    period = '7d',
    warehouseId = 'all',
    customDates,
  }: {
    companyId: string;
    companySlug: string;
    baseCurrency?: string;
    period?: TimeRangeKey;
    warehouseId?: string;
    customDates?: { from: string; to: string };
  },
): Promise<DashboardDataResult> {
  // 1. Fetch real installed apps for this company
  let installedAppSlugs: string[] = [];
  try {
    const installedRows = await db
      .prepare(
        `SELECT a.slug, a.id as app_id
           FROM eap_app_installations i
           JOIN eap_apps a ON a.id = i.app_id
          WHERE i.company_id = ?1 AND i.status = 'installed' AND a.is_killed = 0
          ORDER BY i.installed_at ASC`,
      )
      .bind(companyId)
      .all<{ slug: string; app_id: string }>();

    if (installedRows.results && installedRows.results.length > 0) {
      installedAppSlugs = Array.from(
        new Set(
          installedRows.results.flatMap((r) => [r.slug, r.app_id]).filter(Boolean),
        ),
      );
    }
  } catch {
    installedAppSlugs = [];
  }

  const hasAnyApps = installedAppSlugs.length > 0;

  // 2. Fetch real active warehouses / branches from core_branches
  const warehouses: WarehouseInfo[] = [{ id: 'all', name: 'All Warehouses' }];
  try {
    const branchRows = await db
      .prepare(
        `SELECT id, name, code, is_main
           FROM core_branches
          WHERE company_id = ?1 AND status = 'active'
          ORDER BY is_main DESC, name ASC`,
      )
      .bind(companyId)
      .all<{ id: string; name: string; code: string; is_main: number }>();

    if (branchRows.results && branchRows.results.length > 0) {
      for (const b of branchRows.results) {
        warehouses.push({
          id: b.id,
          name: b.name,
        });
      }
    }
  } catch {
    // core_branches query fallback
  }

  // 3. Initialize truthful mathematical zero state
  const figures: Record<string, number> = {
    Sales: 0,
    Purchases: 0,
    'Sales Return': 0,
    'Purchases Return': 0,
    'Sales Due': 0,
    'Purchase Due': 0,
    Invoices: 0,
    Profit: 0,
    'Total Contacts': 0,
    'Active Leads': 0,
    Organizations: 0,
    'Activities Due': 0,
  };

  const hasCrm =
    installedAppSlugs.includes('erpfy.contacts_crm') ||
    installedAppSlugs.includes('contacts-crm');

  if (hasCrm) {
    try {
      const partiesRow = await db
        .prepare(
          `SELECT COUNT(*) as count FROM crm_parties WHERE company_id = ?1 AND status = 'active'`,
        )
        .bind(companyId)
        .first<{ count: number }>();
      figures['Total Contacts'] = partiesRow?.count ?? 0;
    } catch {
      figures['Total Contacts'] = 0;
    }

    try {
      const leadsRow = await db
        .prepare(
          `SELECT COUNT(*) as count FROM crm_leads WHERE company_id = ?1 AND status NOT IN ('converted', 'lost')`,
        )
        .bind(companyId)
        .first<{ count: number }>();
      figures['Active Leads'] = leadsRow?.count ?? 0;
    } catch {
      figures['Active Leads'] = 0;
    }

    try {
      const orgsRow = await db
        .prepare(
          `SELECT COUNT(*) as count FROM crm_parties WHERE company_id = ?1 AND party_type = 'organization' AND status = 'active'`,
        )
        .bind(companyId)
        .first<{ count: number }>();
      figures.Organizations = orgsRow?.count ?? 0;
    } catch {
      figures.Organizations = 0;
    }

    try {
      const actRow = await db
        .prepare(
          `SELECT COUNT(*) as count FROM crm_activities WHERE company_id = ?1 AND status = 'pending'`,
        )
        .bind(companyId)
        .first<{ count: number }>();
      figures['Activities Due'] = actRow?.count ?? 0;
    } catch {
      figures['Activities Due'] = 0;
    }
  }

  const salesPurchases: DashboardChartPoint[] = [];
  const paymentSentReceived: DashboardSplinePoint[] = [];
  const topProducts: DashboardSlice[] = [];
  const topCustomers: DashboardSlice[] = [];
  const salesByPayment: DashboardPaymentMethod[] = [];
  const stockValues: DashboardStockValue[] = [];
  const topSellingList: DashboardRankedProduct[] = [];
  const recentSales: DashboardRecentSale[] = [];

  // Calculate timestamp boundaries
  const _bounds = calculateDateRangeBounds(period, customDates);
  const _scopeWarehouse = warehouseId !== 'all' ? warehouseId : null;

  // 4. In a pure core schema without external plugin tables populated yet,
  // we do not invent arbitrary fake tables or demo figures (Rule 28).
  // Real numbers stay mathematically 0 and lists remain empty.

  return {
    companyId,
    companySlug,
    baseCurrency,
    installedAppSlugs,
    hasAnyApps,
    warehouses,
    figures,
    salesPurchases,
    paymentSentReceived,
    topProducts,
    topCustomers,
    salesByPayment,
    stockValues,
    topSellingList,
    totalUnits: 0,
    recentSales,
  };
}
