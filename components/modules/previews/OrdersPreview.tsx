import type { Metadata } from 'next';
import {
  Calendar,
  ChevronDown,
  Download,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { SampleDataBadge } from '@/components/modules/ModuleShell';
import { DEMO_ORDER_TABS } from '@/lib/content/demo-modules';

export const metadata: Metadata = { title: 'Orders' };

const ORDERS = [
  {
    id: '#ORD-9821',
    customer: 'Sarah Jenkins',
    initials: 'SJ',
    date: 'Today, 10:45 AM',
    items: 'Premium T-Shirt × 2',
    total: '$64.00',
    payment: {
      label: 'Paid',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
    fulfillment: { label: 'Shipped', bg: 'bg-[#DBEAFE] text-[#2563EB]' },
  },
  {
    id: '#ORD-9820',
    customer: 'David Miller',
    initials: 'DM',
    date: 'Today, 09:12 AM',
    items: 'Stainless Steel Flask',
    total: '$24.50',
    payment: {
      label: 'Paid',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
    fulfillment: {
      label: 'Delivered',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
  },
  {
    id: '#ORD-9819',
    customer: 'Elena Rostova',
    initials: 'ER',
    date: 'Yesterday',
    items: 'Coffee Blend × 3',
    total: '$54.00',
    payment: { label: 'Pending', bg: 'bg-[#FEF3C7] text-[#D97706]' },
    fulfillment: { label: 'Unfulfilled', bg: 'bg-[#F3F4F6] text-[#4B5563]' },
  },
  {
    id: '#ORD-9818',
    customer: 'Marcus Aurelius',
    initials: 'MA',
    date: 'Oct 14, 2026',
    items: 'Laptop Sleeve, Cha...',
    total: '$97.00',
    payment: {
      label: 'Paid',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
    fulfillment: { label: 'Shipped', bg: 'bg-[#DBEAFE] text-[#2563EB]' },
  },
  {
    id: '#ORD-9817',
    customer: 'Chloe Patel',
    initials: 'CP',
    date: 'Oct 12, 2026',
    items: 'Bamboo Wireless C...',
    total: '$42.00',
    payment: { label: 'Refunded', bg: 'bg-[#FEE2E2] text-[#DC2626]' },
    fulfillment: { label: 'Unfulfilled', bg: 'bg-[#F3F4F6] text-[#4B5563]' },
  },
];

export default function OrdersPage() {
  return (
    <AccountGate wide>
      {() => (
        <div className="space-y-6">
          {/* Header Action Bar from Figma */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
                  Orders Registry
                </h1>
                <SampleDataBadge />
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                Track global processing, payment and shipment workflows
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
            >
              <Plus className="size-4" aria-hidden />
              <span>Create Order</span>
            </button>
          </div>

          {/* Status Underline Tabs from Figma */}
          <div className="flex items-center gap-6 border-b border-[#E5E7EB] text-xs">
            {DEMO_ORDER_TABS.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                className={
                  index === 0
                    ? 'relative -mb-px flex items-center gap-1.5 border-b-2 border-[var(--erpfy-brand)] pb-3 font-semibold text-[var(--erpfy-brand-soft-ink)]'
                    : 'flex items-center gap-1.5 pb-3 font-medium text-[#4B5563] transition-colors hover:text-[#111827]'
                }
              >
                <span>{tab.label}</span>
                <span
                  className={
                    index === 0
                      ? 'text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]'
                      : 'text-xs text-[#9CA3AF]'
                  }
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table Container with Integrated Filter Controls from Figma */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            {/* Top Controls Row */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs">
                <Search className="size-4 text-[#9CA3AF]" aria-hidden />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="w-full bg-transparent text-[#111827] placeholder-[#9CA3AF] outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#374151] shadow-xs hover:bg-[#F9FAFB]"
                >
                  <Calendar className="size-3.5 text-[#6B7280]" aria-hidden />
                  <span>Choose Date Range</span>
                  <ChevronDown
                    className="size-3.5 text-[#9CA3AF]"
                    aria-hidden
                  />
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#374151] shadow-xs hover:bg-[#F9FAFB]"
                >
                  <Download className="size-3.5 text-[#6B7280]" aria-hidden />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F3F4F6] text-[#6B7280]">
                    <th className="py-3 font-semibold">Order ID</th>
                    <th className="py-3 font-semibold">Customer</th>
                    <th className="py-3 font-semibold">Date</th>
                    <th className="py-3 font-semibold">Items Summary</th>
                    <th className="py-3 font-semibold">Total</th>
                    <th className="py-3 font-semibold">Payment</th>
                    <th className="py-3 font-semibold">Fulfillment</th>
                    <th className="py-3 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {ORDERS.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#F9FAFB]/60"
                    >
                      <td className="py-4 font-semibold text-[var(--erpfy-brand-soft-ink)]">
                        {order.id}
                      </td>
                      {/* The rule reads a <td> as a form control; the cell's label is its own
                          text, and the initials tile beside it is decorative. */}
                      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                      <td className="py-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--erpfy-brand-soft)] text-[10px] font-bold text-[var(--erpfy-brand-soft-ink)]"
                            aria-hidden
                          >
                            {order.initials}
                          </span>
                          <span className="font-medium text-[#111827]">
                            {order.customer}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-[#4B5563]">{order.date}</td>
                      <td className="py-4 text-[#374151]">{order.items}</td>
                      <td className="py-4 font-semibold text-[#111827]">
                        {order.total}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${order.payment.bg}`}
                        >
                          {order.payment.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${order.fulfillment.bg}`}
                        >
                          {order.fulfillment.label}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          className="rounded-md p-1 text-[#9CA3AF] transition-colors hover:text-[#4B5563]"
                          aria-label={`Actions for ${order.id}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AccountGate>
  );
}
