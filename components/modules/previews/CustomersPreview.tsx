/**
 * APP-CUS-001 — Customers.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88, 99.
 *
 * The reference file has no Customers frame, so this screen is built from the shared
 * language of the ones that do: the header and green primary action from Products, the
 * status tabs from Orders, and the same table, badge and pagination treatment.
 *
 * The Contacts App is not built (section 88 defers every business App to after Core
 * Freeze), so the rows are sample and every control is disabled.
 */

import type { Metadata } from 'next';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
} from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { SampleDataBadge } from '@/components/modules/ModuleShell';
import { money } from '@/components/modules/ModuleShell';
import {
  DEMO_CUSTOMERS,
  DEMO_CUSTOMER_TABS,
  DEMO_CUSTOMER_TOTAL,
} from '@/lib/content/demo-modules';

export const metadata: Metadata = { title: 'Customers' };

/** The three states a customer row can carry, with the palette the other screens use. */
const STATUS_STYLE = {
  active: {
    label: 'Active',
    className: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
  },
  new: { label: 'New', className: 'bg-[#DBEAFE] text-[#2563EB]' },
  dormant: { label: 'Dormant', className: 'bg-[#F3F4F6] text-[#6B7280]' },
} as const;

/** Initials for the avatar tile, so no invented photograph stands in for a person. */
function initials(name: string): string {
  return name
    .replace('[DEMO] ', '')
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function CustomersPage() {
  return (
    <AccountGate wide>
      {() => (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[24px] font-bold tracking-tight text-[#111827]">
                  Customers Directory
                </h1>
                <SampleDataBadge />
              </div>
              <p className="mt-1 text-sm text-[#4B5563]">
                Track global buyer profiles, order history and lifetime value
              </p>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden />
              Add Customer
            </button>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {DEMO_CUSTOMER_TABS.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                disabled
                aria-pressed={index === 0}
                className={
                  index === 0
                    ? 'inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs'
                    : 'inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#4B5563] shadow-xs'
                }
              >
                {tab.label}
                <span
                  className={
                    index === 0
                      ? 'rounded-sm bg-white/20 px-1.5 py-0.5 text-[11px] font-bold'
                      : 'rounded-sm bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-bold text-[#6B7280]'
                  }
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-xs">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg bg-[#F3F4F6] px-3 py-2">
              <Search className="size-4 text-[#9CA3AF]" aria-hidden />
              <input
                type="text"
                disabled
                placeholder="Search customers..."
                className="w-full bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-hidden"
              />
            </div>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#4B5563] shadow-xs"
            >
              Location
              <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-[#4B5563] shadow-xs"
            >
              Spend
              <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#111827] shadow-xs"
            >
              <Download className="size-3.5 text-[#6B7280]" aria-hidden />
              Export
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold text-[#4B5563]">
                    <th className="w-10 px-4 py-3.5">
                      <input
                        type="checkbox"
                        disabled
                        aria-label="Select all customers"
                        className="size-4 rounded-sm border-[#D1D5DB] accent-[var(--erpfy-brand)]"
                      />
                    </th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Location</th>
                    <th className="px-4 py-3.5 text-right">Orders</th>
                    <th className="px-4 py-3.5 text-right">Total Spent</th>
                    <th className="px-4 py-3.5">Last Order</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {DEMO_CUSTOMERS.map((customer) => {
                    const status = STATUS_STYLE[customer.status];
                    return (
                      <tr key={customer.email} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            disabled
                            aria-label={`Select ${customer.name}`}
                            className="size-4 rounded-sm border-[#D1D5DB] accent-[var(--erpfy-brand)]"
                          />
                        </td>
                        {/* A data cell, not a control: its name comes from the text inside. */}
                        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--erpfy-brand)] text-xs font-bold text-white"
                              aria-hidden
                            >
                              {initials(customer.name)}
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-[#111827]">
                                {customer.name}
                              </span>
                              <span className="block truncate text-xs text-[#6B7280]">
                                {customer.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[#4B5563]">
                          {customer.location}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-[#111827]">
                          {customer.orders}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-[#111827]">
                          {money(undefined, customer.spent)}
                        </td>
                        <td className="px-4 py-3.5 text-[#4B5563]">
                          {customer.lastOrder}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between border-t border-[#E5E7EB] px-5 py-3.5 text-xs text-[#6B7280]">
              <span>
                Showing {DEMO_CUSTOMERS.length} of {DEMO_CUSTOMER_TOTAL}{' '}
                customers
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 font-medium text-[#4B5563] shadow-xs"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 font-medium text-[#4B5563] shadow-xs"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AccountGate>
  );
}
