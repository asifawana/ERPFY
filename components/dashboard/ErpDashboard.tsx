/**
 * Complete ERP Dashboard preserving the approved Figma erpfy-dashboard design
 * and extending it with truthful database-backed operational metrics, dynamic
 * plugin capability scoping, and truthful zero-data empty states.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 40, 88, 90, 99. Design: DESIGN.md.
 */

'use client';

import { useState, useMemo, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  CornerDownLeft,
  CreditCard,
  DollarSign,
  FileText,
  Inbox,
  Layers,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Target,
  TrendingUp,
  Undo2,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { formatMoney } from '@/lib/dashboard-currencies';
import { ErpfyErrorBoundary } from '@/lib/design-system';
import { DashboardFilterBar } from './DashboardFilterBar';

import {
  PaymentSentReceivedChart,
  SalesPurchasesChart,
  ShareChart,
} from './DashboardCharts';
import { KpiSparkline } from '@/components/ui/stats-widget';
import type {
  TimeRangeKey,
  WarehouseInfo,
  DashboardDataResult,
} from '@/lib/dashboard/data-service';
import {
  getActiveDashboardWidgets,
  getActiveQuickActions,
  sortWidgetsByOrder,
} from '@/lib/dashboard/widget-registry';
import {
  resolveDashboardForUser,
  type UserDashboardPreferences,
  type CompanyDashboardDefault,
} from '@/lib/dashboard/personalization';

/** 11 KPI Metrics matching Figma erpfy-dashboard + CRM capabilities */
const FIGURES: {
  id: string;
  label: string;
  icon: LucideIcon;
  app: string;
  money: boolean;
  pluginSlug: string;
  emptySubtitle?: string;
}[] = [
  {
    id: 'stat-sales',
    label: 'Sales',
    icon: DollarSign,
    app: 'Sales App',
    money: true,
    pluginSlug: 'erpfy.sales',
  },
  {
    id: 'stat-purchases',
    label: 'Purchases',
    icon: Calendar,
    app: 'Purchasing App',
    money: true,
    pluginSlug: 'erpfy.purchasing',
  },
  {
    id: 'stat-returns',
    label: 'Sales Return',
    icon: Undo2,
    app: 'Sales App',
    money: true,
    pluginSlug: 'erpfy.sales',
  },
  {
    id: 'stat-returns',
    label: 'Purchases Return',
    icon: CornerDownLeft,
    app: 'Purchasing App',
    money: true,
    pluginSlug: 'erpfy.purchasing',
  },
  {
    id: 'stat-due',
    label: 'Sales Due',
    icon: AlertCircle,
    app: 'Sales App',
    money: true,
    pluginSlug: 'erpfy.sales',
  },
  {
    id: 'stat-due',
    label: 'Purchase Due',
    icon: Clock,
    app: 'Purchasing App',
    money: true,
    pluginSlug: 'erpfy.purchasing',
  },
  {
    id: 'stat-sales',
    label: 'Invoices',
    icon: FileText,
    app: 'Sales App',
    money: false,
    pluginSlug: 'erpfy.sales',
  },
  {
    id: 'stat-profit',
    label: 'Profit',
    icon: TrendingUp,
    app: 'Accounting App',
    money: true,
    pluginSlug: 'erpfy.accounting',
  },
  {
    id: 'crm-total-parties',
    label: 'Total Contacts',
    icon: Users,
    app: 'CRM App',
    money: false,
    pluginSlug: 'erpfy.contacts_crm',
    emptySubtitle: 'No contacts yet',
  },
  {
    id: 'crm-active-leads',
    label: 'Active Leads',
    icon: Target,
    app: 'CRM App',
    money: false,
    pluginSlug: 'erpfy.contacts_crm',
    emptySubtitle: 'No active leads',
  },
  {
    id: 'crm-organizations',
    label: 'Organizations',
    icon: Building2,
    app: 'CRM App',
    money: false,
    pluginSlug: 'erpfy.contacts_crm',
    emptySubtitle: 'No organizations',
  },
  {
    id: 'crm.activities_due',
    label: 'Activities Due',
    icon: Calendar,
    app: 'CRM App',
    money: false,
    pluginSlug: 'erpfy.contacts_crm',
    emptySubtitle: 'No pending activities',
  },
];

export type ErpDashboardSale = {
  reference: string;
  customer: string;
  warehouse: string;
  status: string;
  total: number;
  paid: number;
  due: number;
  paymentStatus: string;
};

export function ErpDashboard({
  greeting,
  subline,
  currency = 'USD',
  defaultPeriod = '7d',
  action,
  children,
  sales,
  widgetOrder,
  showSampleData = false,
  installedAppSlugs,
  companySlug = '',
  companyId = '',
  initialData,
  warehouses: propWarehouses,
  userPreferences: propUserPreferences,
  companyDefaults: propCompanyDefaults,
  userPermissions: propUserPermissions = [],
}: {
  greeting: string;
  subline: string;
  currency?: string;
  defaultPeriod?: TimeRangeKey;
  action?: ReactNode;
  children?: ReactNode;
  sales?: ErpDashboardSale[];
  widgetOrder?: string[];
  showSampleData?: boolean;
  installedAppSlugs?: string[];
  companySlug?: string;
  companyId?: string;
  initialData?: DashboardDataResult;
  warehouses?: WarehouseInfo[];
  userPreferences?: UserDashboardPreferences | null;
  companyDefaults?: CompanyDashboardDefault | null;
  userPermissions?: string[];
}) {
  const [period, setPeriod] = useState<TimeRangeKey>(defaultPeriod);
  const [warehouse, setWarehouse] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currency);
  const [customDates, setCustomDates] = useState<{ from: string; to: string }>({
    from: '2026-09-09',
    to: '2026-09-16',
  });
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic server/API data state
  const [liveData, setLiveData] = useState<DashboardDataResult | null>(initialData || null);

  // User Personalization Layer (User Preferences + Company Defaults + RBAC)
  const [personalization, setPersonalization] = useState<{
    userPreferences?: UserDashboardPreferences | null;
    companyDefaults?: CompanyDashboardDefault | null;
  }>({
    userPreferences: propUserPreferences || null,
    companyDefaults: propCompanyDefaults || null,
  });

  useEffect(() => {
    if (!companyId && !companySlug) return;
    const target = companyId || companySlug;
    fetch(`/api/companies/${encodeURIComponent(target)}/dashboard/preferences`)
      .then((res) => (res.ok ? (res.json() as Promise<{ preferences?: UserDashboardPreferences; companyDefaults?: CompanyDashboardDefault; resolved?: unknown }>) : null))
      .then((data) => {
        if (data && 'resolved' in data && data.resolved) {
          setPersonalization({
            userPreferences: data.preferences || null,
            companyDefaults: data.companyDefaults || null,
          });
        }
      })
      .catch(() => {});
  }, [companyId, companySlug]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_dashboard_currency');
      if (saved && saved !== currency) {
        queueMicrotask(() => {
          setSelectedCurrency(saved);
        });
      }
    } catch {}
  }, [currency]);

  const handleCurrencyChange = (c: string) => {
    setSelectedCurrency(c);
    try {
      localStorage.setItem('erpfy_dashboard_currency', c);
    } catch {}
  };

  // Re-fetch data on period/warehouse changes or explicit refresh
  const refetchData = async () => {
    if (!companyId && !companySlug) return;
    setRefreshing(true);
    try {
      const targetId = companyId || companySlug;
      const q = new URLSearchParams({
        period,
        warehouse,
        from: customDates.from,
        to: customDates.to,
      });
      const res = await fetch(`/api/companies/${encodeURIComponent(targetId)}/dashboard?${q.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const payload = (await res.json()) as { data?: DashboardDataResult };
        if (payload?.data) {
          setLiveData(payload.data);
        }
      }
    } catch {
      // Keep existing data on network interruption
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    void refetchData();
  };

  // Plugin capability scoping
  const activeInstalledSlugs = useMemo(() => {
    if (installedAppSlugs !== undefined) return installedAppSlugs;
    if (liveData?.installedAppSlugs) return liveData.installedAppSlugs;
    return [];
  }, [installedAppSlugs, liveData]);

  const hasAnyApps = activeInstalledSlugs.length > 0;
  const hasSales = activeInstalledSlugs.includes('erpfy.sales');
  const hasPurchasing = activeInstalledSlugs.includes('erpfy.purchasing');
  const hasInventory = activeInstalledSlugs.includes('erpfy.inventory');
  const hasCatalog = activeInstalledSlugs.includes('erpfy.catalog');
  const _hasCrm =
    activeInstalledSlugs.includes('erpfy.contacts_crm') ||
    activeInstalledSlugs.includes('contacts-crm');
  const _hasAccounting = activeInstalledSlugs.includes('erpfy.accounting');
  const hasPayments = activeInstalledSlugs.includes('erpfy.payments');
  const hasPos = activeInstalledSlugs.includes('erpfy.pos');

  // Warehouses list
  const activeWarehouses = useMemo<WarehouseInfo[]>(() => {
    if (propWarehouses && propWarehouses.length > 0) return propWarehouses;
    if (liveData?.warehouses && liveData.warehouses.length > 0) return liveData.warehouses;
    return [{ id: 'all', name: 'All Warehouses' }];
  }, [propWarehouses, liveData]);

  // Dynamic figures & chart data based on real data
  const activeData = useMemo(() => {
    const realFigures: Record<string, number> = {
      Sales: liveData?.figures?.Sales ?? 0,
      Purchases: liveData?.figures?.Purchases ?? 0,
      'Sales Return': liveData?.figures?.['Sales Return'] ?? 0,
      'Purchases Return': liveData?.figures?.['Purchases Return'] ?? 0,
      'Sales Due': liveData?.figures?.['Sales Due'] ?? 0,
      'Purchase Due': liveData?.figures?.['Purchase Due'] ?? 0,
      Invoices: liveData?.figures?.Invoices ?? 0,
      Profit: liveData?.figures?.Profit ?? 0,
      'Total Contacts': liveData?.figures?.['Total Contacts'] ?? 0,
      'Active Leads': liveData?.figures?.['Active Leads'] ?? 0,
      Organizations: liveData?.figures?.Organizations ?? 0,
      'Activities Due': liveData?.figures?.['Activities Due'] ?? 0,
    };

    if (sales && sales.length > 0) {
      realFigures.Sales = sales.reduce((sum, s) => sum + s.total, 0);
      realFigures['Sales Due'] = sales.reduce((sum, s) => sum + s.due, 0);
      realFigures.Invoices = sales.length;
    }

    return {
      figures: realFigures,
      salesPurchases: liveData?.salesPurchases ?? [],
      paymentSentReceived: liveData?.paymentSentReceived ?? [],
      topProducts: liveData?.topProducts ?? [],
      topCustomers: liveData?.topCustomers ?? [],
      salesByPayment: liveData?.salesByPayment ?? [],
      stockValues: liveData?.stockValues ?? [],
      topSellingList: liveData?.topSellingList ?? [],
      totalUnits: liveData?.totalUnits ?? 0,
    };
  }, [liveData, sales]);

  // Filtered recent sales table: only real company records
  const filteredSales = useMemo(() => {
    const list = sales !== undefined ? sales : (liveData?.recentSales ?? []);
    if (warehouse === 'all') return list;
    return list.filter((s) => s.warehouse === warehouse);
  }, [sales, liveData, warehouse]);

  const resolvedDashboard = useMemo(() => {
    return resolveDashboardForUser({
      installedAppSlugs: activeInstalledSlugs,
      userPermissions: propUserPermissions,
      companySlug,
      companyId,
      companyDefaults: personalization.companyDefaults,
      userPreferences: personalization.userPreferences,
    });
  }, [activeInstalledSlugs, propUserPermissions, companySlug, companyId, personalization]);

  // Active widgets registered and sorted by saved order
  const activeWidgets = useMemo(() => {
    if (widgetOrder && widgetOrder.length > 0) {
      const registered = getActiveDashboardWidgets({
        installedAppSlugs: activeInstalledSlugs,
      });
      return sortWidgetsByOrder(registered, widgetOrder);
    }
    return resolvedDashboard.widgets;
  }, [activeInstalledSlugs, widgetOrder, resolvedDashboard]);

  const activeWidgetIds = useMemo(
    () => new Set(activeWidgets.filter((w) => (w as unknown as { visible?: boolean }).visible !== false).map((w) => w.id)),
    [activeWidgets],
  );

  // Filter KPI Figures based on installed business capabilities & active widget settings
  const visibleFigures = useMemo(() => {
    const visibleKpiWidgets = resolvedDashboard.zones.kpi.filter((w) => w.visible);
    const matchedFigures: typeof FIGURES = [];

    for (const kw of visibleKpiWidgets) {
      const fig = FIGURES.find(
        (f) =>
          f.id === kw.id ||
          f.label.toLowerCase() === kw.title.toLowerCase() ||
          f.label.toLowerCase() === kw.label?.toLowerCase(),
      );
      if (fig && !matchedFigures.some((mf) => mf.label === fig.label)) {
        matchedFigures.push(fig);
      }
    }

    for (const fig of FIGURES) {
      const isInstalled = activeInstalledSlugs.some((slug) => {
        const s = slug.toLowerCase();
        return (
          s === fig.pluginSlug.toLowerCase() ||
          (fig.pluginSlug === 'erpfy.contacts_crm' && s === 'contacts-crm')
        );
      });
      if (
        isInstalled &&
        activeWidgetIds.has(fig.id) &&
        !matchedFigures.some((mf) => mf.label === fig.label)
      ) {
        matchedFigures.push(fig);
      }
    }

    return matchedFigures;
  }, [resolvedDashboard, activeInstalledSlugs, activeWidgetIds]);

  // Quick action shortcuts dynamically resolved from active plugins via registry and capability checks
  const quickActions = useMemo(() => {
    const actions: { label: string; href: string; icon: LucideIcon }[] = [];
    const targetComp = companySlug ? `?company=${encodeURIComponent(companySlug)}` : '';

    if (hasPos) actions.push({ label: 'POS', href: `/account/pos${targetComp}`, icon: Store });
    if (hasSales) actions.push({ label: 'New sale', href: `/account/orders${targetComp}`, icon: ShoppingCart });
    if (hasPurchasing) actions.push({ label: 'New purchase', href: `/account/purchasing${targetComp}`, icon: ShoppingBag });
    if (hasCatalog || hasInventory) actions.push({ label: 'Add product', href: `/account/products${targetComp}`, icon: Tag });

    // Dynamic plugin contributions from registry (e.g. Contacts & CRM)
    const raw = getActiveQuickActions({
      installedAppSlugs: activeInstalledSlugs,
      companySlug,
    });
    const ICON_MAP: Record<string, LucideIcon> = {
      UserPlus,
      Building2,
      Target,
      ShoppingCart,
      ShoppingBag,
      Store,
      Tag,
      Layers,
      Calendar,
      DollarSign,
      CreditCard,
      BarChart3,
    };
    for (const reg of raw) {
      if (!actions.some((a) => a.label === reg.label)) {
        actions.push({
          label: reg.label,
          href: reg.href,
          icon: ICON_MAP[reg.icon] || Store,
        });
      }
    }

    return actions;
  }, [hasPos, hasSales, hasPurchasing, hasCatalog, hasInventory, activeInstalledSlugs, companySlug]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Exact Figma Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111827]">
              {greeting}
            </h1>
            {showSampleData && (
              <span className="rounded-md border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#B45309]">
                Sample data
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#4B5563]">{subline}</p>
        </div>
        {action}
      </header>

      {children && <div className="space-y-4">{children}</div>}

      {/* 2. Stocky-Style Filter Bar: Today/7D/30D/MTD/YTD/Custom + Warehouses + 156 Currencies + Refresh */}
      <DashboardFilterBar
        period={period}
        onPeriodChange={setPeriod}
        warehouse={warehouse}
        onWarehouseChange={setWarehouse}
        currency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
        customDates={customDates}
        onCustomDatesChange={setCustomDates}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showWarehouse={hasInventory && activeWarehouses.length > 1}
        warehouses={activeWarehouses}
        customizeHref={companySlug ? `/account/settings/dashboard?company=${encodeURIComponent(companySlug)}` : undefined}
      />

      {/* CASE A: Fresh Company with No Business Capability Apps Installed */}
      {!hasAnyApps ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center shadow-xs">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
              <Store className="size-7 text-[var(--erpfy-brand)]" />
            </div>
            <h2 className="mt-3.5 text-base font-bold text-[#111827]">
              No business apps installed yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-[#4B5563]">
              Install apps from the App Store to start managing contacts, sales, inventory, and accounting.
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href={`/account/app-store?company=${encodeURIComponent(companySlug)}`}
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <Store className="size-3.5" />
                Browse App Store
              </Link>
            </div>
          </div>

          {quickActions.length > 0 && (
            <Panel title="Quick actions">
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map((act) => (
                  <Link
                    key={act.label}
                    href={act.href}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-2xs transition-all hover:bg-[#F9FAFB] hover:border-[#D1D5DB] cursor-pointer active:scale-95 text-center"
                  >
                    <div className="grid size-8 place-items-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
                      <act.icon className="size-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#374151]">
                      {act.label}
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      ) : (
        <>

          {/* 3. Exact Figma KPI Cards Grid Filtered to Installed Capabilities */}
          {visibleFigures.length > 0 && (
            <ErpfyErrorBoundary scope="DashboardKPIs">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleFigures.map((figure) => {
                  const value = activeData.figures[figure.label] ?? 0;
                  const sparkPoints = [10, 10, 10, 10, 10, 10, 10];
                  const trend = '0.0%';

                  return (
                    <article
                      key={figure.label}
                      className={cn(
                        'group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs erpfy-card-hover transition-all duration-200 hover:border-[var(--erpfy-brand-line,#b7d7c2)] hover:shadow-md dark:bg-[#1f2937] dark:border-gray-800',
                        refreshing && 'opacity-60 scale-[0.99]',
                      )}
                    >
                      {/* Top row: Label & Brand Soft Icon */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-[#4B5563] dark:text-gray-300">
                          {figure.label}
                        </p>
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] group-hover:scale-110 transition-transform duration-200">
                          <figure.icon className="size-4" aria-hidden />
                        </span>
                      </div>

                      {/* Middle & Bottom row: Amount + Animated Sparkline Curve */}
                      <div className="mt-2.5 flex items-end justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[22px] font-bold leading-7 tracking-tight text-[#111827] dark:text-white xl:text-[24px]">
                            {figure.money
                              ? formatMoney(value, selectedCurrency)
                              : value.toLocaleString('en')}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#4B5563] dark:bg-gray-800 dark:text-gray-300">
                              {figure.app}
                            </span>
                            {value === 0 && figure.emptySubtitle ? (
                              <span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-medium text-[#6B7280] dark:bg-gray-800 dark:text-gray-400">
                                {figure.emptySubtitle}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-bold text-[#6B7280] dark:bg-gray-800 dark:text-gray-400">
                                {trend}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Animated Bezier Sparkline Chart */}
                        <div className="h-10 w-24 shrink-0 pb-0.5 sm:w-28">
                          <KpiSparkline
                            data={sparkPoints}
                            isPositive={true}
                            width={100}
                            height={36}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </ErpfyErrorBoundary>
          )}

          {/* 4. Charts Section: Sales & Purchases + Top Selling Products */}
          {(activeWidgetIds.has('sales-purchases-chart') || activeWidgetIds.has('top-products-chart')) && (
            <ErpfyErrorBoundary scope="DashboardCharts">
              <div
                className={cn(
                  'grid gap-5',
                  activeWidgetIds.has('sales-purchases-chart') && activeWidgetIds.has('top-products-chart')
                    ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'
                    : 'grid-cols-1',
                )}
              >
                {activeWidgetIds.has('sales-purchases-chart') && (
                  <Panel title="Sales & Purchases" tag="Daily Activity">
                    {activeData.salesPurchases.length === 0 ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <BarChart3 className="size-5" />
                        </div>
                        <p className="mt-2.5 text-xs font-semibold text-[#111827]">No transaction data yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Activity will appear here as sales and purchase orders are logged.
                        </p>
                      </div>
                    ) : (
                      <SalesPurchasesChart
                        data={activeData.salesPurchases}
                        currency={selectedCurrency}
                      />
                    )}
                  </Panel>
                )}

                {activeWidgetIds.has('top-products-chart') && (
                  <Panel title="Top Selling Products">
                    {activeData.topProducts.length === 0 ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <Tag className="size-5" />
                        </div>
                        <p className="mt-2.5 text-xs font-semibold text-[#111827]">No sales data yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Product sales distributions will appear once orders are completed.
                        </p>
                      </div>
                    ) : (
                      <ShareChart
                        data={activeData.topProducts}
                        currency={selectedCurrency}
                        unit="units"
                        centre={{ value: `${activeData.totalUnits}`, label: 'Total Units' }}
                        rows={activeData.topProducts.map((p) => ({
                          label: p.name,
                          value: `${p.value} units`,
                        }))}
                      />
                    )}
                  </Panel>
                )}
              </div>
            </ErpfyErrorBoundary>
          )}

          {/* 5. Extended Section: Payment Sent & Received + Top Customers */}
          {(activeWidgetIds.has('payment-sent-received-chart') || activeWidgetIds.has('top-customers-chart')) && (
            <ErpfyErrorBoundary scope="DashboardCashFlow">
              <div
                className={cn(
                  'grid gap-5',
                  activeWidgetIds.has('payment-sent-received-chart') && activeWidgetIds.has('top-customers-chart')
                    ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'
                    : 'grid-cols-1',
                )}
              >
                {activeWidgetIds.has('payment-sent-received-chart') && (
                  <Panel title="Payment Sent & Received" tag="Cash Flow">
                    {activeData.paymentSentReceived.length === 0 ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <TrendingUp className="size-5" />
                        </div>
                        <p className="mt-2.5 text-xs font-semibold text-[#111827]">No payment activity yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Cash flow movements will appear here once payments are posted.
                        </p>
                      </div>
                    ) : (
                      <PaymentSentReceivedChart
                        data={activeData.paymentSentReceived}
                        currency={selectedCurrency}
                      />
                    )}
                  </Panel>
                )}

                {activeWidgetIds.has('top-customers-chart') && (
                  <Panel title="Top customers" tag="CRM App">
                    {activeData.topCustomers.length === 0 ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <Users className="size-5" />
                        </div>
                        <p className="mt-2.5 text-xs font-semibold text-[#111827]">No customer order data yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Customer share breakdowns will calculate as orders are placed.
                        </p>
                      </div>
                    ) : (
                      <ShareChart
                        data={activeData.topCustomers}
                        currency={selectedCurrency}
                        unit="percent"
                        variant="pie"
                      />
                    )}
                  </Panel>
                )}
              </div>
            </ErpfyErrorBoundary>
          )}

          {/* 6. Extended Section: Sales by Payment + Stock Value & Quick Actions */}
          {((activeWidgetIds.has('sales-by-payment') && hasPayments) ||
            activeWidgetIds.has('stock-value') ||
            quickActions.length > 0) && (
            <ErpfyErrorBoundary scope="DashboardOperations">
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Sales by Payment */}
                {activeWidgetIds.has('sales-by-payment') && hasPayments && (
                  <Panel title="Sales by Payment" tag="Payments App">
                    {activeData.salesByPayment.length === 0 ? (
                      <div className="flex min-h-[160px] flex-col items-center justify-center py-6 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <CreditCard className="size-5" />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#111827]">No payment data yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Payment breakdowns will appear once transactions are processed.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {activeData.salesByPayment.map((item) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
                              <CreditCard className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#111827]">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-[#111827]">
                                    {formatMoney(item.amount, selectedCurrency)}
                                  </span>
                                  <span className="w-8 text-right text-[11px] text-[#6B7280]">
                                    {item.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${item.percentage}%`,
                                    backgroundColor: item.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}

                {/* Stock Value & Quick Actions */}
                <div className="space-y-5">
                  {activeWidgetIds.has('stock-value') && (
                    <Panel title="Stock Value" tag="Inventory App">
                      {activeData.stockValues.length === 0 ? (
                        <div className="flex min-h-[140px] flex-col items-center justify-center py-6 text-center">
                          <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                            <Inbox className="size-5" />
                          </div>
                          <p className="mt-2 text-xs font-semibold text-[#111827]">No stock records yet</p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280]">
                            Inventory valuation will calculate when stock items are added.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeData.stockValues.map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[#4B5563]">
                                  {item.label}
                                </span>
                                <span className={`text-base font-bold ${item.color}`}>
                                  {formatMoney(item.value, selectedCurrency)}
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: item.value > 0 ? '70%' : '0%',
                                    backgroundColor: item.barColor,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  )}

                  {activeWidgetIds.has('quick-actions') && quickActions.length > 0 && (
                    <Panel title="Quick actions">
                      <div className="grid grid-cols-3 gap-3">
                        {quickActions.map((act) => (
                          <Link
                            key={act.label}
                            href={act.href}
                            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-2xs transition-all hover:bg-[#F9FAFB] hover:border-[#D1D5DB] cursor-pointer active:scale-95 text-center"
                          >
                            <div className="grid size-8 place-items-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
                              <act.icon className="size-4" />
                            </div>
                            <span className="text-[11px] font-semibold text-[#374151]">
                              {act.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </Panel>
                  )}
                </div>
              </div>
            </ErpfyErrorBoundary>
          )}

          {/* 7. Extended Section: Stock Alert + Top Selling Products Ranked List */}
          {(activeWidgetIds.has('stock-alert') || activeWidgetIds.has('top-selling-list')) && (
            <ErpfyErrorBoundary scope="DashboardInventory">
              <div className="grid gap-5 lg:grid-cols-2">
                {activeWidgetIds.has('stock-alert') && (
                  <Panel
                    title="Stock Alert"
                    tag="Inventory App"
                    action={
                      <Link
                        href={`/account/products${companySlug ? `?company=${encodeURIComponent(companySlug)}` : ''}`}
                        className="text-xs font-semibold text-[var(--erpfy-brand)] hover:underline"
                      >
                        View all
                      </Link>
                    }
                  >
                    <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                      <div className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                        <Inbox className="size-6" />
                      </div>
                      <p className="mt-2.5 text-sm font-semibold text-[#111827]">
                        No low-stock items
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        All inventory stock levels are healthy.
                      </p>
                    </div>
                  </Panel>
                )}

                {activeWidgetIds.has('top-selling-list') && (
                  <Panel title="Top Selling Products" tag="Catalog App">
                    {activeData.topSellingList.length === 0 ? (
                      <div className="flex min-h-[160px] flex-col items-center justify-center py-6 text-center">
                        <div className="grid size-10 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                          <Tag className="size-5" />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#111827]">No products sold yet</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">
                          Top rankings will calculate automatically as sales orders occur.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeData.topSellingList.map((prod) => (
                          <div key={prod.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="grid size-5 place-items-center rounded-full bg-[var(--erpfy-brand-soft)] text-[10px] font-bold text-[var(--erpfy-brand-soft-ink)]">
                                  {prod.rank}
                                </span>
                                <span className="font-semibold text-[#111827]">
                                  {prod.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#111827]">
                                  {formatMoney(prod.amount, selectedCurrency)}
                                </span>
                                <span className="text-[11px] text-[#6B7280]">
                                  {prod.soldCount} Sold
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                              <div
                                className="h-full rounded-full bg-[var(--erpfy-brand)] transition-all duration-300"
                                style={{ width: `${prod.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}
              </div>
            </ErpfyErrorBoundary>
          )}

          {/* 8. Extended Section: Recent Sales Data Table */}
          {activeWidgetIds.has('recent-sales') && (
            <ErpfyErrorBoundary scope="DashboardRecentSales">
              <Panel
                title="Recent Sales"
                tag="Sales App"
                action={
                  <Link
                    href={`/account/orders${companySlug ? `?company=${encodeURIComponent(companySlug)}` : ''}`}
                    className="text-xs font-semibold text-[var(--erpfy-brand)] hover:underline"
                  >
                    View all
                  </Link>
                }
              >
                {filteredSales.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center py-8 text-center">
                    <div className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                      <Inbox className="size-6" />
                    </div>
                    <p className="mt-2.5 text-sm font-semibold text-[#111827]">
                      No sales recorded yet
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      Create a new sale or register an order to see recent transactions here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-[#6B7280]">
                          <th className="pb-3 font-semibold">Reference</th>
                          <th className="pb-3 font-semibold">Customer</th>
                          <th className="pb-3 font-semibold">Warehouse</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Total</th>
                          <th className="pb-3 font-semibold">Paid</th>
                          <th className="pb-3 font-semibold">Due</th>
                          <th className="pb-3 font-semibold">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3F4F6]">
                        {filteredSales.map((sale) => (
                          <tr key={sale.reference} className="hover:bg-[#F9FAFB]">
                            <td className="py-3 font-semibold text-[#111827]">
                              {sale.reference}
                            </td>
                            <td className="py-3 text-[#374151]">{sale.customer}</td>
                            <td className="py-3 text-[#6B7280]">{sale.warehouse}</td>
                            <td className="py-3">
                              <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                                {sale.status}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-[#111827]">
                              {formatMoney(sale.total, selectedCurrency)}
                            </td>
                            <td className="py-3 font-medium text-[#111827]">
                              {formatMoney(sale.paid, selectedCurrency)}
                            </td>
                            <td className="py-3 font-medium text-[#6B7280]">
                              {formatMoney(sale.due, selectedCurrency)}
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  'rounded-md px-2 py-0.5 text-[10px] font-bold capitalize',
                                  sale.paymentStatus === 'paid'
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : sale.paymentStatus === 'partial'
                                        ? 'bg-[#FEF3C7] text-[#B45309]'
                                        : 'bg-[#FEE2E2] text-[#DC2626]',
                                )}
                              >
                                {sale.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </ErpfyErrorBoundary>
          )}
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  tag,
  action,
  children,
}: {
  title: string;
  tag?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight text-[#111827]">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {tag && (
            <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
              {tag}
            </span>
          )}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}
