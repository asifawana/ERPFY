'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/dashboard-currencies';

// A small utility function to generate random numbers in a range
const getRandom = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// A function to generate a smooth SVG bezier path from data points
const generateSmoothPath = (
  points: number[],
  width: number,
  height: number,
): string => {
  if (!points || points.length < 2) {
    return `M 0 ${height}`;
  }

  const xStep = width / (points.length - 1);
  const pathData: [number, number][] = points.map((point, i) => {
    const x = i * xStep;
    // Scale point to height, with a small padding from top/bottom
    const y = height - (point / 100) * (height * 0.78) - height * 0.11;
    return [x, y];
  });

  let path = `M ${pathData[0][0]} ${pathData[0][1]}`;

  for (let i = 0; i < pathData.length - 1; i++) {
    const x1 = pathData[i][0];
    const y1 = pathData[i][1];
    const x2 = pathData[i + 1][0];
    const y2 = pathData[i + 1][1];
    const midX = (x1 + x2) / 2;
    path += ` C ${midX},${y1} ${midX},${y2} ${x2},${y2}`;
  }

  return path;
};

const DEFAULT_CHART_DATA = [30, 55, 45, 75, 60, 85, 70];

export interface StatsWidgetProps {
  /** Metric label, e.g. "Weekly Sales" or "This Week" */
  periodLabel?: string;
  /** Primary metric value or amount */
  amount?: number | string;
  /** Percentage change (e.g. 36 or -12) */
  change?: number;
  /** Array of numeric data points for the curve (default 7 points) */
  chartData?: number[];
  /** Currency code for formatting money, e.g. "USD", "PKR" */
  currency?: string;
  /** If true, auto-updates data periodically with live interactive animation */
  interactive?: boolean;
  /** Subtitle or category tag */
  tag?: string;
  /** Custom container class */
  className?: string;
  /** Custom stroke color (defaults to theme brand for positive) */
  strokeColor?: string;
}

/**
 * The main Stats Widget Component, ERPFY theme compatible.
 * Seamlessly honors --erpfy-brand, --erpfy-surface, --erpfy-line-soft, and dark/light modes.
 */
export const StatsWidget: React.FC<StatsWidgetProps> = ({
  periodLabel = 'This Week',
  amount: initialAmount,
  change: initialChange,
  chartData: initialChartData,
  currency,
  interactive = false,
  tag,
  className,
  strokeColor: customStroke,
}) => {
  const [stats, setStats] = useState({
    amount: typeof initialAmount === 'number' ? initialAmount : 283,
    change: typeof initialChange === 'number' ? initialChange : 36,
    chartData: initialChartData || [30, 55, 45, 75, 60, 85, 70],
  });

  const linePathRef = useRef<SVGPathElement | null>(null);
  const areaPathRef = useRef<SVGPathElement | null>(null);
  const reactId = React.useId();
  const widgetId = `stat-grad-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const currentAmount = interactive ? stats.amount : (typeof initialAmount === 'number' ? initialAmount : 283);
  const currentChange = interactive ? stats.change : (typeof initialChange === 'number' ? initialChange : 36);
  const currentChartData = interactive ? stats.chartData : (initialChartData ?? DEFAULT_CHART_DATA);

  // Auto-update stats every 3.5 seconds if interactive is enabled
  useEffect(() => {
    if (!interactive) return;

    const intervalId = setInterval(() => {
      const newAmount = getRandom(120, 980);
      const newChange = getRandom(-40, 85);
      const newChartData = Array.from({ length: 7 }, () => getRandom(15, 95));

      setStats({
        amount: newAmount,
        change: newChange,
        chartData: newChartData,
      });
    }, 3500);

    return () => clearInterval(intervalId);
  }, [interactive]);

  // SVG viewbox dimensions
  const svgWidth = 150;
  const svgHeight = 60;

  // Generate the SVG path for the line, memoized for performance
  const linePath = useMemo(
    () => generateSmoothPath(currentChartData, svgWidth, svgHeight),
    [currentChartData],
  );

  // Generate the SVG path for the gradient area
  const areaPath = useMemo(() => {
    if (!linePath.startsWith('M')) return '';
    return `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  }, [linePath]);

  // Animate the line graph on change
  useEffect(() => {
    const path = linePathRef.current;
    const area = areaPathRef.current;

    if (path && area) {
      const length = path.getTotalLength();
      // --- Animate Line ---
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;

      // --- Animate Area ---
      area.style.transition = 'none';
      area.style.opacity = '0';

      // Trigger reflow to apply initial styles before transition
      path.getBoundingClientRect();

      // --- Start Transitions ---
      path.style.transition =
        'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease';
      path.style.strokeDashoffset = '0';

      area.style.transition =
        'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, fill 0.5s ease';
      area.style.opacity = '1';
    }
  }, [linePath]);

  const isPositiveChange = currentChange >= 0;

  // Theme-coordinated color mapping:
  // Positive uses portal brand or emerald green; Negative uses crimson red
  const graphStrokeColor =
    customStroke ||
    (isPositiveChange ? 'var(--erpfy-brand, #1e5631)' : '#dc2626');
  const gradientId = `${widgetId}-${isPositiveChange ? 'pos' : 'neg'}`;

  // Formatted value display
  const displayAmount = useMemo(() => {
    if (typeof initialAmount === 'string') return initialAmount;
    if (currency) return formatMoney(currentAmount, currency);
    return `$${currentAmount.toLocaleString('en')}`;
  }, [currentAmount, initialAmount, currency]);

  return (
    <div
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border border-[var(--erpfy-line-soft,#E5E7EB)] bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[var(--erpfy-brand-line,#b7d7c2)] dark:bg-[#1f2937] dark:border-gray-800',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side content */}
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--erpfy-ink-muted,#6B7280)]">
            <span className="truncate">{periodLabel}</span>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold transition-colors',
                isPositiveChange
                  ? 'bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-400',
              )}
            >
              {Math.abs(currentChange)}%
              {isPositiveChange ? (
                <ArrowUp size={13} className="ml-0.5 stroke-[2.5]" />
              ) : (
                <ArrowDown size={13} className="ml-0.5 stroke-[2.5]" />
              )}
            </span>
          </div>

          <p className="mt-2.5 truncate text-2xl font-extrabold tracking-tight text-[var(--erpfy-ink,#111827)] dark:text-white sm:text-3xl">
            {displayAmount}
          </p>

          {tag && (
            <div className="mt-2">
              <span className="inline-block rounded-md bg-[var(--erpfy-canvas,#F3F4F6)] px-2 py-0.5 text-[11px] font-semibold text-[var(--erpfy-ink-muted,#4B5563)]">
                {tag}
              </span>
            </div>
          )}
        </div>

        {/* Right side chart */}
        <div className="h-16 w-32 shrink-0 sm:w-36">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="size-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={graphStrokeColor}
                  stopOpacity={0.38}
                />
                <stop
                  offset="100%"
                  stopColor={graphStrokeColor}
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>
            <path
              ref={areaPathRef}
              d={areaPath}
              fill={`url(#${gradientId})`}
            />
            <path
              ref={linePathRef}
              d={linePath}
              fill="none"
              stroke={graphStrokeColor}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StatsWidget;

// Main App component to display the widget matching user instructions
export function Component() {
  return (
    <div className="flex min-h-[300px] w-full items-center justify-center p-6">
      <StatsWidget interactive />
    </div>
  );
}

/**
 * Lightweight, animated sparkline curve for embedding inside KPI cards.
 * Implements the exact bezier path drawing animation with strokeDashoffset and gradient area.
 */
export function KpiSparkline({
  data,
  isPositive = true,
  strokeColor,
  width = 110,
  height = 42,
  className,
}: {
  data: number[];
  isPositive?: boolean;
  strokeColor?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const linePathRef = useRef<SVGPathElement | null>(null);
  const areaPathRef = useRef<SVGPathElement | null>(null);
  const sparkId = React.useId();
  const gradientId = `kpi-spark-${sparkId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const linePath = useMemo(
    () => generateSmoothPath(data, width, height),
    [data, width, height],
  );

  const areaPath = useMemo(() => {
    if (!linePath.startsWith('M')) return '';
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  }, [linePath, width, height]);

  useEffect(() => {
    const path = linePathRef.current;
    const area = areaPathRef.current;
    if (path && area) {
      const length = path.getTotalLength();
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;
      area.style.transition = 'none';
      area.style.opacity = '0';

      path.getBoundingClientRect();

      path.style.transition =
        'stroke-dashoffset 0.85s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease';
      path.style.strokeDashoffset = '0';

      area.style.transition =
        'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, fill 0.4s ease';
      area.style.opacity = '1';
    }
  }, [linePath]);

  const color =
    strokeColor || (isPositive ? 'var(--erpfy-brand, #1e5631)' : '#dc2626');

  return (
    <div className={cn('relative size-full overflow-visible', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="size-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path ref={areaPathRef} d={areaPath} fill={`url(#${gradientId})`} />
        <path
          ref={linePathRef}
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

