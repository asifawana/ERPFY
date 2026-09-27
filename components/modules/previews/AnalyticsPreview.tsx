import type { Metadata } from 'next';
import {
  Calendar,
  ChevronDown,
  Download,
  DollarSign,
  Package,
  Scale,
  Target,
} from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { niceScale, tickLabel } from '@/lib/charts';
import { SampleDataBadge } from '@/components/modules/ModuleShell';

export const metadata: Metadata = { title: 'Analytics' };

const KPI_METRICS = [
  {
    label: 'Total Revenue',
    value: '$45,230.00',
    delta: '+12.5%',
    rising: true,
    icon: DollarSign,
    iconBg: 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]',
  },
  {
    label: 'Total Orders',
    value: '1,284',
    delta: '+8.3%',
    rising: true,
    icon: Package,
    iconBg: 'bg-[#FEF3C7] text-[#D97706]',
  },
  {
    label: 'Avg Order Value',
    value: '$35.22',
    delta: '-2.1%',
    rising: false,
    icon: Scale,
    iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
  },
  {
    label: 'Conversion Rate',
    value: '3.2%',
    delta: '+0.4%',
    rising: true,
    icon: Target,
    iconBg: 'bg-[#FEE2E2] text-[#DC2626]',
  },
];

/**
 * Dollars, and they add up: revenue sums to the $45,230 the KPI above claims and to the
 * category breakdown below it, and each month's profit is that month's revenue less its
 * expenses. They were pixel heights doing double duty as figures in thousands, which made
 * the chart contradict both — a $900k chart under a $45,230 total.
 */
const MONTHLY_DATA = [
  { month: 'Jan', revenue: 5200, expenses: 3400, profit: 1800 },
  { month: 'Feb', revenue: 6100, expenses: 3900, profit: 2200 },
  { month: 'Mar', revenue: 7000, expenses: 4300, profit: 2700 },
  { month: 'Apr', revenue: 7600, expenses: 4500, profit: 3100 },
  { month: 'May', revenue: 8900, expenses: 5100, profit: 3800 },
  { month: 'Jun', revenue: 10430, expenses: 5600, profit: 4830 },
];

/**
 * Dollars. The bar widths used to be a separate hand-written percentage that did not follow
 * these figures at all — the largest category drew at 75% of its track. Derived now.
 */
const CATEGORY_REVENUE = [
  { name: 'Electronics', amount: 18540 },
  { name: 'Clothing & Apparel', amount: 12300 },
  { name: 'Food & Groceries', amount: 8420 },
  { name: 'Home & Living', amount: 4120 },
  { name: 'Sports Equipment', amount: 1850 },
];
const CATEGORY_PEAK = Math.max(
  ...CATEGORY_REVENUE.map((category) => category.amount),
);

/** The plot's height in pixels, and the scale its gridlines stand for. */
const PLOT = 224;
const SCALE = niceScale(
  MONTHLY_DATA.flatMap((month) => [
    month.revenue,
    month.expenses,
    month.profit,
  ]),
);
const barHeight = (value: number) =>
  Math.max(2, Math.round((value / SCALE.top) * PLOT));

const GLOBAL_PERFORMANCE = [
  {
    region: 'North America',
    orders: '580',
    revenue: '$20,300',
    growth: '+14.2%',
    rising: true,
  },
  {
    region: 'Europe Union',
    orders: '412',
    revenue: '$14,420',
    growth: '+8.6%',
    rising: true,
  },
  {
    region: 'East Asia',
    orders: '210',
    revenue: '$7,350',
    growth: '+11.5%',
    rising: true,
  },
  {
    region: 'Latin America',
    orders: '58',
    revenue: '$2,030',
    growth: '-1.8%',
    rising: false,
  },
  {
    region: 'Middle East',
    orders: '24',
    revenue: '$1,130',
    growth: '+5.4%',
    rising: true,
  },
];

export default function AnalyticsPage() {
  return (
    <AccountGate wide>
      {() => (
        <div className="space-y-6">
          {/* Header Action Bar from Figma */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
                Performance Insights
              </h1>
              <SampleDataBadge />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#374151] shadow-xs hover:bg-[#F9FAFB]"
              >
                <Calendar className="size-4 text-[#6B7280]" aria-hidden />
                <span>Last 6 Months (Jan - Jun)</span>
                <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#374151] shadow-xs hover:bg-[#F9FAFB]"
              >
                <Download className="size-4 text-[#6B7280]" aria-hidden />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* 4 Metric KPI Cards from Figma */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_METRICS.map((metric) => (
              <article
                key={metric.label}
                className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#4B5563]">
                    {metric.label}
                  </p>
                  <span
                    className={`grid size-9 place-items-center rounded-lg ${metric.iconBg}`}
                  >
                    <metric.icon className="size-4" aria-hidden />
                  </span>
                </div>
                <p className="mt-4 text-[28px] font-bold leading-none tracking-tight text-[#111827]">
                  {metric.value}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs">
                  <span
                    className={
                      metric.rising
                        ? 'font-semibold text-[#10B981]'
                        : 'font-semibold text-[#EF4444]'
                    }
                  >
                    {metric.delta}
                  </span>
                  <span className="text-[#6B7280]">vs previous month</span>
                </div>
              </article>
            ))}
          </div>

          {/* Full-width Financial Trends & Output Analysis from Figma */}
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3F4F6] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Financial Trends & Output Analysis
                </h2>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Comparative summary of generated revenue, active expenses and
                  net profit margins
                </p>
              </div>
              <span className="rounded-md bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#4B5563]">
                Monthly Activity
              </span>
            </div>

            {/* Monthly Grouped Bars Chart */}
            <div className="pt-8 pb-4">
              <div className="flex gap-2 px-4 sm:px-6">
                {/* Value axis, so the bars can be read as figures rather than as shapes. */}
                <div
                  className="flex shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-[#9CA3AF]"
                  style={{ height: PLOT }}
                  aria-hidden
                >
                  {SCALE.ticks.map((value) => (
                    <span key={value} className="leading-none">
                      {value === 0 ? '$0' : `$${tickLabel(value)}`}
                    </span>
                  ))}
                </div>

                <div className="relative min-w-0 flex-1">
                  {SCALE.ticks.map((value) => (
                    <span
                      key={value}
                      className="absolute inset-x-0 border-t border-[#F3F4F6]"
                      style={{ top: `${(1 - value / SCALE.top) * PLOT}px` }}
                      aria-hidden
                    />
                  ))}

                  <div
                    className="relative flex items-end justify-between gap-4"
                    style={{ height: PLOT }}
                  >
                    {MONTHLY_DATA.map((item) => (
                      <div
                        key={item.month}
                        className="flex flex-1 items-end justify-center gap-1 sm:gap-1.5"
                      >
                        <div
                          className="w-2.5 rounded-t-xs bg-[var(--erpfy-brand)] sm:w-3.5"
                          style={{ height: `${barHeight(item.revenue)}px` }}
                          title={`Revenue: $${item.revenue.toLocaleString('en-US')}`}
                        />
                        <div
                          className="w-2.5 rounded-t-xs bg-[#EF4444] sm:w-3.5"
                          style={{ height: `${barHeight(item.expenses)}px` }}
                          title={`Expenses: $${item.expenses.toLocaleString('en-US')}`}
                        />
                        <div
                          className="w-2.5 rounded-t-xs bg-[#3B82F6] sm:w-3.5"
                          style={{ height: `${barHeight(item.profit)}px` }}
                          title={`Profit: $${item.profit.toLocaleString('en-US')}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[#E5E7EB] pt-3">
                    {MONTHLY_DATA.map((item) => (
                      <span
                        key={item.month}
                        className="flex-1 text-center text-xs font-medium text-[#6B7280]"
                      >
                        {item.month}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend matching Figma */}
              <div className="mt-6 flex items-center justify-center gap-8 text-xs font-medium text-[#4B5563]">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-xs bg-[var(--erpfy-brand)]" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-xs bg-[#EF4444]" />
                  <span>Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-xs bg-[#3B82F6]" />
                  <span>Profit</span>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Split 2-Column: Revenue by Category & Global Sales Performance */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by Category */}
            <section className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
              <div className="border-b border-[#F3F4F6] pb-4">
                <h2 className="text-base font-bold text-[#111827]">
                  Revenue by Category
                </h2>
              </div>

              <div className="space-y-6 pt-5">
                {CATEGORY_REVENUE.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111827]">
                        {cat.name}
                      </span>
                      <span className="font-semibold text-[#111827]">
                        ${cat.amount.toLocaleString('en-US')}
                      </span>
                    </div>
                    {/* The track was invisible, so a short bar read as a broken one. */}
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                      <div
                        className="h-full rounded-full bg-[var(--erpfy-brand)]"
                        style={{
                          width: `${(cat.amount / CATEGORY_PEAK) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Global Sales Performance */}
            <section className="flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
              <div className="border-b border-[#F3F4F6] pb-4">
                <h2 className="text-base font-bold text-[#111827]">
                  Global Sales Performance
                </h2>
              </div>

              <div className="overflow-x-auto pt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F3F4F6] text-[#6B7280]">
                      <th className="py-3 font-medium">Region</th>
                      <th className="py-3 text-center font-medium">Orders</th>
                      <th className="py-3 text-right font-medium">Revenue</th>
                      <th className="py-3 text-right font-medium">Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9FAFB]">
                    {GLOBAL_PERFORMANCE.map((row) => (
                      <tr key={row.region} className="hover:bg-[#F9FAFB]/60">
                        <td className="py-3.5 font-medium text-[#111827]">
                          {row.region}
                        </td>
                        <td className="py-3.5 text-center text-[#4B5563]">
                          {row.orders}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-[#111827]">
                          {row.revenue}
                        </td>
                        <td className="py-3.5 text-right">
                          <span
                            className={
                              row.rising
                                ? 'font-semibold text-[#10B981]'
                                : 'font-semibold text-[#EF4444]'
                            }
                          >
                            {row.growth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </AccountGate>
  );
}
