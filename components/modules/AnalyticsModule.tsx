'use client';

/**
 * Analytics Module — Complete Sales, Revenue & Inventory Intelligence
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88. Design: DESIGN.md.
 */

import { useState, useEffect } from 'react';
import { ArrowUpRight, GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DEMO_SALES_PURCHASES,
  DEMO_SALES_BY_PAYMENT,
  DEMO_TOP_SELLING_LIST,
  DEMO_TOP_CUSTOMERS,
} from '@/lib/content/demo-dashboard';
import { SalesPurchasesChart } from '@/components/dashboard/DashboardCharts';

type AnalyticsPeriod = 'today' | '7d' | '30d' | 'mtd' | 'ytd';

const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'mtd', label: 'MTD' },
  { id: 'ytd', label: 'YTD' },
];

export type AnalyticsKpiKey = 'grossRevenue' | 'netProfit' | 'aov' | 'retention';

export function AnalyticsModule({ currency = '$' }: { currency?: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');

  // Drag and drop state for KPI cards
  const [cardOrder, setCardOrder] = useState<AnalyticsKpiKey[]>([
    'grossRevenue',
    'netProfit',
    'aov',
    'retention',
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_analytics_kpi_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 4 &&
          parsed.every((k: string) => ['grossRevenue', 'netProfit', 'aov', 'retention'].includes(k))
        ) {
          setCardOrder(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const nextOrder = [...cardOrder];
    const [removed] = nextOrder.splice(draggedIndex, 1);
    nextOrder.splice(targetIndex, 0, removed);
    setCardOrder(nextOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    try {
      localStorage.setItem('erpfy_analytics_kpi_order', JSON.stringify(nextOrder));
    } catch {
      // Ignore storage errors
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--erpfy-ink)]">Analytics & Reports</h1>
            <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              Executive View
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            Analyze gross revenue trends, customer lifetime metrics, and profit margins.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--erpfy-line)] bg-white p-1 shadow-2xs">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                period === item.id
                  ? 'bg-[var(--erpfy-brand)] text-white shadow-2xs'
                  : 'text-[var(--erpfy-ink-muted)] hover:bg-[var(--erpfy-hover)] hover:text-[var(--erpfy-ink)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — Click & Drag Reorderable */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {cardOrder.map((key, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index && draggedIndex !== index;

          const cardCommonProps = {
            key,
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
            onDrop: (e: React.DragEvent) => handleDrop(e, index),
            onDragEnd: handleDragEnd,
            className: cn(
              'erpfy-card group relative p-4 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
              isDragging && 'opacity-40 border-dashed border-[var(--erpfy-brand,#15803d)] bg-neutral-50 scale-[0.98]',
              isOver && 'ring-2 ring-[var(--erpfy-brand,#15803d)] ring-offset-1 bg-[var(--erpfy-brand,#15803d)]/[0.04]',
              !isDragging && !isOver && 'hover:shadow-xs'
            ),
            title: 'Click and drag to rearrange',
          };

          if (key === 'grossRevenue') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Gross Revenue</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}24,850.40
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="size-3.5" />
                  <span>+18.4% vs last period</span>
                </div>
              </div>
            );
          }

          if (key === 'netProfit') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Net Profit Margin</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  28.4%
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="size-3.5" />
                  <span>+3.2% efficiency gain</span>
                </div>
              </div>
            );
          }

          if (key === 'aov') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Average Order Value</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}142.80
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="size-3.5" />
                  <span>+7.5% basket growth</span>
                </div>
              </div>
            );
          }

          if (key === 'retention') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Customer Retention</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  68.2%
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="size-3.5" />
                  <span>+4.1% repeat buyers</span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Sales & Purchases Bar Chart */}
        <div className="erpfy-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--erpfy-line-soft)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--erpfy-ink)]">Sales vs Purchases Growth</h2>
              <p className="text-xs text-[var(--erpfy-ink-muted)]">Daily transaction volume comparison</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--erpfy-brand-soft-ink)]">
                <span className="size-2.5 rounded-full bg-[var(--erpfy-brand)]" />
                Sales
              </span>
              <span className="flex items-center gap-1.5 text-[#111827]">
                <span className="size-2.5 rounded-full bg-[#111827]" />
                Purchases
              </span>
            </div>
          </div>
          <SalesPurchasesChart data={DEMO_SALES_PURCHASES} />
        </div>

        {/* Payment Methods Breakdown */}
        <div className="erpfy-card p-5">
          <h2 className="text-base font-bold text-[var(--erpfy-ink)]">Payment Distribution</h2>
          <p className="text-xs text-[var(--erpfy-ink-muted)] mb-4">Volume by settlement channel</p>

          <div className="space-y-3.5">
            {DEMO_SALES_BY_PAYMENT.map((m) => (
              <div key={m.name}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[var(--erpfy-ink)]">{m.name}</span>
                  <span className="text-[var(--erpfy-ink-muted)]">{currency}{m.amount.toFixed(2)} ({m.percentage}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--erpfy-line-soft)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${m.percentage}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Ranked Products & Customers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Products */}
        <div className="erpfy-card p-5">
          <h2 className="text-base font-bold text-[var(--erpfy-ink)]">Top Selling Items</h2>
          <p className="text-xs text-[var(--erpfy-ink-muted)] mb-3">Highest grossing inventory lines</p>

          <div className="divide-y divide-[var(--erpfy-line-soft)]">
            {DEMO_TOP_SELLING_LIST.map((prod) => (
              <div key={prod.rank} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-[var(--erpfy-brand-soft)] font-bold text-[var(--erpfy-brand-soft-ink)] text-[11px]">
                    #{prod.rank}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--erpfy-ink)]">{prod.name}</p>
                    <p className="text-[10px] text-[var(--erpfy-ink-muted)]">{prod.soldCount} units sold</p>
                  </div>
                </div>
                <p className="font-bold text-[var(--erpfy-ink)]">
                  {currency}{prod.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="erpfy-card p-5">
          <h2 className="text-base font-bold text-[var(--erpfy-ink)]">Top Valued Customers</h2>
          <p className="text-xs text-[var(--erpfy-ink-muted)] mb-3">Highest spenders across this period</p>

          <div className="divide-y divide-[var(--erpfy-line-soft)]">
            {DEMO_TOP_CUSTOMERS.map((cust, idx) => (
              <div key={cust.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-md bg-[var(--erpfy-hover)] font-bold text-[var(--erpfy-ink-muted)] text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--erpfy-ink)]">{cust.name}</p>
                    <p className="text-[10px] text-[var(--erpfy-ink-muted)]">{cust.value}% of period gross</p>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 font-bold text-[var(--erpfy-brand-soft-ink)] text-[11px]">
                  VIP Buyer
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
