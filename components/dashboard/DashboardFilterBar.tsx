'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Coins,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ALL_CURRENCIES } from '@/lib/dashboard-currencies';
import type { TimeRangeKey, WarehouseInfo } from '@/lib/dashboard/data-service';

const PERIODS: { id: TimeRangeKey; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'mtd', label: 'MTD' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom' },
];

export function DashboardFilterBar({
  period,
  onPeriodChange,
  warehouse,
  onWarehouseChange,
  currency,
  onCurrencyChange,
  customDates,
  onCustomDatesChange,
  onRefresh,
  refreshing,
  showWarehouse = true,
  warehouses,
  customizeHref,
}: {
  period: TimeRangeKey;
  onPeriodChange: (p: TimeRangeKey) => void;
  warehouse: string;
  onWarehouseChange: (w: string) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  customDates: { from: string; to: string };
  onCustomDatesChange: (dates: { from: string; to: string }) => void;
  onRefresh: () => void;
  refreshing: boolean;
  showWarehouse?: boolean;
  warehouses?: WarehouseInfo[];
  customizeHref?: string;
}) {
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Local draft dates for date picker modal
  const [draftFrom, setDraftFrom] = useState(customDates.from);
  const [draftTo, setDraftTo] = useState(customDates.to);

  const warehouseRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (warehouseRef.current && !warehouseRef.current.contains(e.target as Node)) {
        setWarehouseOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableWarehouses =
    warehouses && warehouses.length > 0 ? warehouses : [{ id: 'all', name: 'All Warehouses' }];
  const activeWarehouse =
    availableWarehouses.find((w) => w.id === warehouse) || availableWarehouses[0]!;
  const activeCurrency = ALL_CURRENCIES.find((c) => c.code === currency) || ALL_CURRENCIES[0]!;

  const filteredCurrencies = ALL_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencyQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(currencyQuery.toLowerCase()) ||
      c.symbol.toLowerCase().includes(currencyQuery.toLowerCase()),
  );

  const handleApplyCustomDates = () => {
    onCustomDatesChange({ from: draftFrom, to: draftTo });
    onPeriodChange('custom');
    setDatePickerOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* 1. Time Range Buttons Group + Custom Date Range Display */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] p-1 shadow-2xs">
          {PERIODS.map((p) => {
            const isActive = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPeriodChange(p.id);
                  if (p.id === 'custom') {
                    setDatePickerOpen(true);
                  }
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95',
                  isActive
                    ? 'bg-[var(--erpfy-brand)] text-white shadow-xs font-bold'
                    : 'text-[#4B5563] hover:bg-white/80 hover:text-[#111827]',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Inline RangePicker if Custom is selected */}
        {period === 'custom' && (
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setDatePickerOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-xs hover:border-[var(--erpfy-brand)] transition-colors cursor-pointer"
            >
              <Calendar className="size-3.5 text-[var(--erpfy-brand)]" />
              <span>
                {customDates.from} → {customDates.to}
              </span>
              <ChevronDown className="size-3.5 text-[#9CA3AF]" />
            </button>

            {/* Dual Calendar / Date Picker Popover */}
            {datePickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 text-left">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <h3 className="text-xs font-bold text-[#111827]">
                    Select Date Range
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="rounded-md p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="custom-start-date" className="block text-[11px] font-medium text-[#6B7280]">
                      Start Date
                    </label>
                    <input
                      id="custom-start-date"
                      type="date"
                      value={draftFrom}
                      onChange={(e) => setDraftFrom(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-2.5 py-1.5 text-xs font-semibold text-[#111827] focus:border-[var(--erpfy-brand)] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-end-date" className="block text-[11px] font-medium text-[#6B7280]">
                      End Date
                    </label>
                    <input
                      id="custom-end-date"
                      type="date"
                      value={draftTo}
                      onChange={(e) => setDraftTo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-2.5 py-1.5 text-xs font-semibold text-[#111827] focus:border-[var(--erpfy-brand)] focus:outline-hidden"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: 'Last 7 Days', days: 7 },
                      { label: 'Last 14 Days', days: 14 },
                      { label: 'Last 30 Days', days: 30 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(to.getDate() - preset.days);
                          setDraftFrom(from.toISOString().split('T')[0]!);
                          setDraftTo(to.toISOString().split('T')[0]!);
                        }}
                        className="rounded-md bg-[#F3F4F6] px-2 py-1 text-[10px] font-semibold text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#111827]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                    <button
                      type="button"
                      onClick={() => setDatePickerOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustomDates}
                      className="rounded-lg bg-[var(--erpfy-brand)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                    >
                      Apply Range
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Dropdowns (Warehouse + Currency) + Refresh Button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Warehouse Dropdown */}
        {showWarehouse && (
          <div className="relative" ref={warehouseRef}>
            <button
              type="button"
              onClick={() => setWarehouseOpen((o) => !o)}
              aria-expanded={warehouseOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#111827] shadow-xs transition-all hover:bg-[#F9FAFB] active:scale-95 cursor-pointer"
            >
              <MapPin className="size-3.5 text-[#6B7280]" aria-hidden />
              <span className="font-semibold">{activeWarehouse.name}</span>
              <ChevronDown
                className={cn(
                  'size-3.5 text-[#9CA3AF] transition-transform duration-200',
                  warehouseOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {warehouseOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-56 max-w-[calc(100vw-2rem)] origin-top-left rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 text-left sm:left-auto sm:right-0 sm:origin-top-right dark:bg-[#1f2937] dark:border-gray-800">
                <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Select Warehouse
                </div>
                <div className="space-y-0.5">
                  {availableWarehouses.map((w) => {
                    const isSelected = w.id === warehouse;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onWarehouseChange(w.id);
                          setWarehouseOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-semibold'
                            : 'text-[#374151] hover:bg-[#F3F4F6] dark:text-gray-200 dark:hover:bg-gray-800',
                        )}
                      >
                        <span className="truncate">{w.name}</span>
                        {isSelected && <Check className="size-4 shrink-0 text-[var(--erpfy-brand)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Currency Dropdown (156 Currencies matching Stocky) */}
        <div className="relative" ref={currencyRef}>
          <button
            type="button"
            onClick={() => setCurrencyOpen((o) => !o)}
            aria-expanded={currencyOpen}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111827] shadow-xs transition-all hover:bg-[#F9FAFB] active:scale-95 cursor-pointer"
          >
            <Coins className="size-3.5 text-[#6B7280]" aria-hidden />
            <span>
              {activeCurrency.code} ({activeCurrency.symbol})
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 text-[#9CA3AF] transition-transform duration-200',
                currencyOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </button>

          {currencyOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 text-left dark:bg-[#1f2937] dark:border-gray-800">
              {/* Currency Search Filter */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search 150+ currencies..."
                  value={currencyQuery}
                  onChange={(e) => setCurrencyQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-8 pr-3 py-1.5 text-xs font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-[var(--erpfy-brand)] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Scrollable Currency List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                {filteredCurrencies.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#9CA3AF]">
                    No currency found
                  </p>
                ) : (
                  filteredCurrencies.map((c) => {
                    const isSelected = c.code === currency;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          onCurrencyChange(c.code);
                          setCurrencyOpen(false);
                          setCurrencyQuery('');
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-bold'
                            : 'text-[#374151] hover:bg-[#F3F4F6]',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-9 font-bold text-[#111827]">
                            {c.code}
                          </span>
                          <span className="truncate text-[#6B7280]">
                            {c.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="font-semibold text-[11px] text-[#4B5563]">
                            {c.symbol}
                          </span>
                          {isSelected && (
                            <Check className="size-3.5 text-[var(--erpfy-brand)]" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Refresh Button with Spin Animation */}
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111827] shadow-xs transition-all hover:bg-[#F9FAFB] active:scale-95 cursor-pointer dark:bg-[#1f2937] dark:border-gray-800 dark:text-gray-200"
        >
          <RefreshCw
            className={cn(
              'size-3.5 text-[#6B7280] transition-transform duration-500',
              refreshing && 'animate-spin text-[var(--erpfy-brand)]',
            )}
            aria-hidden
          />
          <span>Refresh</span>
        </button>

        {/* Optional Customize Dashboard Action */}
        {customizeHref && (
          <Link
            href={customizeHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111827] shadow-xs transition-all hover:bg-[#F9FAFB] active:scale-95 cursor-pointer dark:bg-[#1f2937] dark:border-gray-800 dark:text-gray-200"
            title="Personalize dashboard layout"
          >
            <SlidersHorizontal className="size-3.5 text-[#6B7280]" aria-hidden />
            <span>Customize</span>
          </Link>
        )}
      </div>
    </div>
  );
}
