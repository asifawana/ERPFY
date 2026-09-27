/**
 * Full-width, responsive interactive SVG charts with Stocky-style animations,
 * interactive tooltips, dashed tracking guidelines, and smooth hover transitions.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 40, 88. Design: DESIGN.md.
 */

'use client';

import { useState, useRef, useId } from 'react';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { niceScale } from '@/lib/charts';
import { formatMoney } from '@/lib/dashboard-currencies';

export type ChartPoint = { label: string; sales: number; purchases: number };
export type ChartSlice = { name: string; value: number; color?: string };
export type SplinePoint = { label: string; sent: number; received: number };

// Backward-compatible type aliases
export type DemoPoint = ChartPoint;
export type DemoSlice = ChartSlice;
export type DemoSplinePoint = SplinePoint;

/* ------------------------------------------------------------------ *
 * 1. Grouped Bars: Sales & Purchases with Hover Tooltip & Cluster Highlight
 * ------------------------------------------------------------------ */

export function SalesPurchasesChart({
  data,
  currency = 'USD',
}: {
  data: DemoPoint[];
  currency?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
          <BarChart3 className="size-6" />
        </div>
        <p className="mt-2.5 text-sm font-semibold text-[#111827]">
          No sales or purchase data yet
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Transactions will appear here once recorded.
        </p>
      </div>
    );
  }

  const WIDTH = 920;
  const HEIGHT = 265;
  const PADDING = { top: 25, right: 20, bottom: 45, left: 82 };

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = HEIGHT - PADDING.bottom;

  const maxVal = Math.max(...data.flatMap((p) => [p.sales, p.purchases]), 100);
  const scale = niceScale([0, maxVal * 1.15]);

  const clusterCount = Math.max(1, data.length);
  const clusterWidth = plotWidth / clusterCount;
  const barWidth = Math.min(32, Math.max(16, (clusterWidth - 24) / 2));
  const barGap = 6;

  return (
    <div className="relative w-full select-none" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Sales and Purchases Chart"
      >
        {/* Horizontal Gridlines & Y-Axis Labels */}
        {scale.ticks.map((tick) => {
          const y = PADDING.top + (1 - tick / scale.top) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={WIDTH - PADDING.right}
                y2={y}
                stroke="#F3F4F6"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#9CA3AF"
                fontWeight="500"
              >
                {formatMoney(tick, currency, 0)}
              </text>
            </g>
          );
        })}

        {/* Bottom Baseline */}
        <line
          x1={PADDING.left}
          y1={baselineY}
          x2={WIDTH - PADDING.right}
          y2={baselineY}
          stroke="#E5E7EB"
          strokeWidth="1"
        />

        {/* Cluster Highlight Columns on Hover */}
        {data.map((_, index) => {
          const clusterLeft = PADDING.left + index * clusterWidth;
          const isHovered = hoveredIdx === index;
          return (
            <rect
              key={`bg-${index}`}
              x={clusterLeft + 4}
              y={PADDING.top}
              width={clusterWidth - 8}
              height={plotHeight}
              rx="8"
              fill={isHovered ? '#F3F4F6' : 'transparent'}
              className="transition-colors duration-150 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(index)}
            />
          );
        })}

        {/* Grouped Bars */}
        {data.map((point, index) => {
          const clusterCenterX =
            PADDING.left + index * clusterWidth + clusterWidth / 2;

          const salesHeight = Math.max(
            4,
            (point.sales / scale.top) * plotHeight,
          );
          const purchasesHeight = Math.max(
            4,
            (point.purchases / scale.top) * plotHeight,
          );

          const salesX = clusterCenterX - barWidth - barGap / 2;
          const salesY = baselineY - salesHeight;

          const purchasesX = clusterCenterX + barGap / 2;
          const purchasesY = baselineY - purchasesHeight;

          const isHovered = hoveredIdx === index;

          return (
            <g
              key={point.label}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(index)}
            >
              {/* Sales Bar */}
              <rect
                x={salesX}
                y={salesY}
                width={barWidth}
                height={salesHeight}
                rx="4"
                ry="4"
                fill="var(--erpfy-brand)"
                className="erpfy-chart-bar-animated transition-all duration-200"
                style={{
                  filter: isHovered ? 'brightness(1.1)' : undefined,
                  transformOrigin: `${salesX}px ${baselineY}px`,
                }}
              />

              {/* Purchases Bar */}
              <rect
                x={purchasesX}
                y={purchasesY}
                width={barWidth}
                height={purchasesHeight}
                rx="4"
                ry="4"
                fill="#111827"
                className="erpfy-chart-bar-animated transition-all duration-200"
                style={{
                  filter: isHovered ? 'brightness(1.2)' : undefined,
                  transformOrigin: `${purchasesX}px ${baselineY}px`,
                }}
              />

              {/* X-Axis Label */}
              <text
                x={clusterCenterX}
                y={baselineY + 22}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? '#111827' : '#6B7280'}
                fontWeight={isHovered ? '700' : '500'}
                className="transition-colors duration-150"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-xl transition-all duration-100 animate-in fade-in-0 zoom-in-95"
          style={{
            left: `${((PADDING.left + hoveredIdx * clusterWidth + clusterWidth / 2) / WIDTH) * 100}%`,
            top: '35%',
          }}
        >
          <p className="text-[11px] font-bold text-[#111827] border-b border-[#F3F4F6] pb-1 mb-1.5">
            {data[hoveredIdx]?.label}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--erpfy-brand)]" />
              <span className="text-[#6B7280]">Sales:</span>
              <span className="font-bold text-[#111827]">
                {formatMoney(data[hoveredIdx]!.sales, currency)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#111827]" />
              <span className="text-[#6B7280]">Purchases:</span>
              <span className="font-bold text-[#111827]">
                {formatMoney(data[hoveredIdx]!.purchases, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-8 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs bg-[var(--erpfy-brand)] shadow-2xs" />
          <span className="font-medium text-[#374151]">Sales</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs bg-[#111827] shadow-2xs" />
          <span className="font-medium text-[#374151]">Purchases</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Area Spline: Payment Sent & Received with Stocky Guideline & Tooltip
 * ------------------------------------------------------------------ */

function getMonotoneSpline(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M ${pts[0]!.x} ${pts[0]!.y} L ${pts[1]!.x} ${pts[1]!.y}`;

  const m: number[] = [];
  const dx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1]!.x - pts[i]!.x;
    m[i] = (pts[i + 1]!.y - pts[i]!.y) / (dx[i] || 1);
  }

  const d: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1]! * m[i]! <= 0) {
      d[i] = 0;
    } else {
      const common = dx[i - 1]! + dx[i]!;
      d[i] =
        (3 * common) /
        ((common + dx[i]!) / (m[i - 1]! || 1) +
          (common + dx[i - 1]!) / (m[i]! || 1));
    }
  }
  d[n - 1] = m[n - 2]!;

  let path = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const cp1x = pts[i]!.x + dx[i]! / 3;
    const cp1y = pts[i]!.y + (d[i]! * dx[i]!) / 3;
    const cp2x = pts[i + 1]!.x - dx[i]! / 3;
    const cp2y = pts[i + 1]!.y - (d[i + 1]! * dx[i]!) / 3;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pts[i + 1]!.x.toFixed(1)} ${pts[i + 1]!.y.toFixed(1)}`;
  }
  return path;
}

export function PaymentSentReceivedChart({
  data,
  currency = 'USD',
}: {
  data: DemoSplinePoint[];
  currency?: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradId = useId();

  if (data.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
          <TrendingUp className="size-6" />
        </div>
        <p className="mt-2.5 text-sm font-semibold text-[#111827]">
          No payment data yet
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Cash flow movements will appear here once payments are recorded.
        </p>
      </div>
    );
  }

  const WIDTH = 920;
  const HEIGHT = 265;
  const PADDING = { top: 25, right: 25, bottom: 45, left: 82 };

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = HEIGHT - PADDING.bottom;

  const maxVal = Math.max(...data.flatMap((p) => [p.sent, p.received]), 100);
  const scale = niceScale([0, maxVal * 1.15]);

  const pts = data.map((d, index) => {
    const count = Math.max(1, data.length - 1);
    const x = PADDING.left + (index / count) * plotWidth;
    const sentY = PADDING.top + (1 - d.sent / scale.top) * plotHeight;
    const recvY = PADDING.top + (1 - d.received / scale.top) * plotHeight;
    return {
      x,
      sentY,
      recvY,
      label: d.label,
      sent: d.sent,
      received: d.received,
    };
  });

  const sentLine = getMonotoneSpline(pts.map((p) => ({ x: p.x, y: p.sentY })));
  const receivedLine = getMonotoneSpline(pts.map((p) => ({ x: p.x, y: p.recvY })));

  const sentArea = pts.length > 0 ? `${sentLine} L ${pts[pts.length - 1]!.x.toFixed(1)} ${baselineY} L ${pts[0]!.x.toFixed(1)} ${baselineY} Z` : '';
  const receivedArea = pts.length > 0 ? `${receivedLine} L ${pts[pts.length - 1]!.x.toFixed(1)} ${baselineY} L ${pts[0]!.x.toFixed(1)} ${baselineY} Z` : '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * WIDTH;

    // Find closest index
    let closest = 0;
    let minDist = Infinity;
    pts.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });
    setActiveIdx(closest);
  };

  const activePoint = activeIdx !== null ? pts[activeIdx] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setActiveIdx(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Payment Sent and Received Chart"
      >
        <defs>
          <linearGradient id={`sentGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`recvGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Dashed Gridlines & Y-Axis Labels */}
        {scale.ticks.map((tick) => {
          const y = PADDING.top + (1 - tick / scale.top) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={WIDTH - PADDING.right}
                y2={y}
                stroke="#F3F4F6"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#9CA3AF"
                fontWeight="400"
                className="tabular-nums"
              >
                {formatMoney(tick, currency, 0)}
              </text>
            </g>
          );
        })}

        {/* Bottom Baseline */}
        <line
          x1={PADDING.left}
          y1={baselineY}
          x2={WIDTH - PADDING.right}
          y2={baselineY}
          stroke="#E5E7EB"
          strokeWidth="1"
        />

        {/* Smooth Area Gradients */}
        <path d={sentArea} fill={`url(#sentGrad-${gradId})`} />
        <path d={receivedArea} fill={`url(#recvGrad-${gradId})`} />

        {/* Smooth Curve Lines */}
        <path
          d={sentLine}
          fill="none"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={receivedLine}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Vertical Guideline on Active Point */}
        {activePoint && (
          <line
            x1={activePoint.x}
            y1={PADDING.top}
            x2={activePoint.x}
            y2={baselineY}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
        )}

        {/* Crisp Data Point Nodes */}
        {pts.map((p, idx) => {
          const isActive = activeIdx === idx;
          return (
            <g key={`nodes-${p.label}`}>
              {/* Sent Point (Red) */}
              <circle
                cx={p.x}
                cy={p.sentY}
                r={isActive ? '6' : '3.5'}
                fill="#FFFFFF"
                stroke="#EF4444"
                strokeWidth={isActive ? '3' : '2'}
                className="transition-all duration-150"
              />
              {/* Received Point (Green) */}
              <circle
                cx={p.x}
                cy={p.recvY}
                r={isActive ? '6' : '3.5'}
                fill="#FFFFFF"
                stroke="#10B981"
                strokeWidth={isActive ? '3' : '2'}
                className="transition-all duration-150"
              />
              {/* X-Axis Date Labels */}
              <text
                x={p.x}
                y={baselineY + 22}
                textAnchor="middle"
                fontSize="10.5"
                fill={isActive ? '#111827' : '#6B7280'}
                fontWeight={isActive ? '700' : '500'}
                className="transition-colors duration-150"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip Card Matching Stocky Screenshot */}
      {activePoint && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-xl transition-all duration-75 animate-in fade-in-0 zoom-in-95 text-left"
          style={{
            left: `${(activePoint.x / WIDTH) * 100}%`,
            top: `${Math.min(activePoint.sentY, activePoint.recvY) / HEIGHT * 85}%`,
          }}
        >
          <p className="text-[11px] font-bold text-[#111827] border-b border-[#F3F4F6] pb-1 mb-1.5">
            {activePoint.label}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#EF4444]" />
              <span className="text-[#6B7280]">Sent:</span>
              <span className="font-bold text-[#111827]">
                {formatMoney(activePoint.sent, currency)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#10B981]" />
              <span className="text-[#6B7280]">Received:</span>
              <span className="font-bold text-[#111827]">
                {formatMoney(activePoint.received, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-8 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#EF4444]" />
          <span className="font-medium text-[#374151]">Sent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#10B981]" />
          <span className="font-medium text-[#374151]">Received</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3. Donut & Pie: Top Selling Products & Top Customers with Interactive Hover
 * ------------------------------------------------------------------ */

function slicePath(
  start: number,
  end: number,
  outer: number,
  inner: number,
): string {
  const point = (turn: number, radius: number) => {
    const angle = (turn - 0.25) * 2 * Math.PI;
    return {
      x: 110 + radius * Math.cos(angle),
      y: 110 + radius * Math.sin(angle),
    };
  };

  const large = end - start > 0.5 ? 1 : 0;
  const outerStart = point(start, outer);
  const outerEnd = point(end, outer);

  if (inner <= 0) {
    return [
      `M 110 110`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ');
  }

  const innerEnd = point(end, inner);
  const innerStart = point(start, inner);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function ShareChart({
  data,
  currency = 'USD',
  variant = 'donut',
  unit = 'currency',
  centre,
  rows,
}: {
  data: DemoSlice[];
  currency?: string;
  variant?: 'donut' | 'pie';
  unit?: 'currency' | 'percent' | 'units';
  centre?: { value: string; label: string };
  rows?: { label: string; value: string }[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center py-8 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
          <PieChart className="size-6" />
        </div>
        <p className="mt-2.5 text-sm font-semibold text-[#111827]">
          {variant === 'pie' ? 'No customer data yet' : 'No products in catalog'}
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          {variant === 'pie'
            ? 'Customer distributions will appear after orders are placed.'
            : 'Product volume data will appear once products are sold.'}
        </p>
      </div>
    );
  }

  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const outer = 92;
  const inner = variant === 'donut' ? 64 : 0;

  const slices = data.map((slice, index) => {
    const start =
      data.slice(0, index).reduce((sum, earlier) => sum + earlier.value, 0) /
      total;
    const share = slice.value / total;
    return {
      ...slice,
      share,
      start,
      end: start + share,
      color: slice.color || '#10B981',
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center w-full select-none">
      <div className="relative" onMouseLeave={() => setHoveredIdx(null)}>
        <svg
          viewBox="0 0 220 220"
          className="size-[205px]"
          aria-label="Donut Chart"
        >
          {slices.map((slice, index) => {
            const isHovered = hoveredIdx === index;
            const currentOuter = isHovered ? outer + 4 : outer;
            return (
              <path
                key={slice.name}
                d={slicePath(
                  slice.start,
                  Math.max(slice.start, slice.end - 0.003),
                  currentOuter,
                  inner,
                )}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? '2.5' : '1.5'}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : undefined,
                  opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1.0,
                }}
                onMouseEnter={() => setHoveredIdx(index)}
              >
                <title>
                  {`${slice.name} · ${
                    unit === 'percent'
                      ? `${Math.round(slice.share * 100)}%`
                      : unit === 'units'
                        ? `${slice.value} units`
                        : formatMoney(slice.value, currency)
                  }`}
                </title>
              </path>
            );
          })}

          {centre && (
            <g className="transition-all duration-200">
              <text
                x="110"
                y="104"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={activeSlice ? '22' : '28'}
                fontWeight="700"
                fill="#111827"
              >
                {activeSlice
                  ? unit === 'units'
                    ? activeSlice.value
                    : `${Math.round(activeSlice.share * 100)}%`
                  : centre.value}
              </text>
              <text
                x="110"
                y="126"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="500"
                fill="#6B7280"
              >
                {activeSlice ? activeSlice.name.replace('[DEMO] ', '') : centre.label}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Floating Tooltip for Pie Chart (Top Customers) */}
        {variant === 'pie' && activeSlice && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1.5 shadow-xl text-center z-30 animate-in fade-in-0 zoom-in-95">
            <p className="text-[11px] font-bold text-[#111827] truncate max-w-[140px]">
              {activeSlice.name}
            </p>
            <p className="text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              {Math.round(activeSlice.share * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Rows for Top Products (Figma layout) */}
      {rows ? (
        <ul className="mt-4 w-full space-y-2.5 px-3">
          {rows.map((row, index) => (
            <li key={row.label}>
              <button
                type="button"
                className={cn(
                  'w-full flex items-center justify-between text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer text-left',
                  hoveredIdx === index ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]',
                )}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        slices[index % slices.length]?.color || '#10B981',
                    }}
                  />
                  <span className="font-medium text-[#4B5563]">{row.label}</span>
                </div>
                <span className="font-bold text-[#111827]">{row.value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        /* Legend for Top Customers with percentages */
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 w-full px-2 text-xs">
          {slices.map((slice, index) => (
            <button
              type="button"
              key={slice.name}
              className={cn(
                'flex items-center justify-between gap-1.5 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer text-left',
                hoveredIdx === index ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]',
              )}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[#4B5563] text-[11px]">
                  {slice.name}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#111827]">
                {Math.round(slice.share * 100)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
