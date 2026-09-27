/**
 * Shared furniture for the module screens. Design: DESIGN.md v1.2.
 *
 * Only what the current screens use. The App Store takes the header and the card; the
 * Customers table takes `money`. Products, Orders, Analytics and Settings hold their own
 * headings, so they take the marker on its own.
 *
 * Every screen here carries the `Sample data` marker: they describe business Apps that do not
 * exist yet, and section 99 does not allow invented figures to pass as real ones. It is one
 * component rather than a span copied per screen, so the wording cannot drift.
 *
 * Server components throughout: no state, no client JavaScript.
 */

import type { ReactNode } from 'react';

import { DEMO_CURRENCY } from '@/lib/content/demo-dashboard';

/** Says plainly that the figures beside it are made up. */
export function SampleDataBadge() {
  return (
    <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#92400E]">
      Sample data
    </span>
  );
}

export function ModuleHeader({
  title,
  subline,
  app,
  actions,
  connected = false,
}: {
  title: string;
  subline: string;
  /** The App that will own this screen, named plainly. */
  app: string;
  actions?: ReactNode;
  connected?: boolean;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-bold tracking-tight text-[#111827]">
            {title}
          </h1>
          {!connected && <SampleDataBadge />}
        </div>
        <p className="mt-1 text-sm text-[#4B5563]">{subline}</p>
        {!connected && (
          <p className="mt-1 text-xs text-[#6B7280]">
            This screen is the design for the {app} App. Nothing on it is
            connected yet.
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function ModuleCard({
  title,
  tag,
  children,
}: {
  title?: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] px-5 py-4">
          <h2 className="text-base font-bold text-[#111827]">{title}</h2>
          {tag && (
            <span className="rounded-md bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-semibold text-[#4B5563]">
              {tag}
            </span>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** A money figure always carries a currency symbol, the way the reference frames print it. */
export function money(currency: string | undefined, value: number): string {
  const rendered = value.toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency) return `${currency} ${rendered}`;
  return `${DEMO_CURRENCY}${rendered}`;
}
