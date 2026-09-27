/**
 * ONB-000 — the focused Create ERP frame.
 * Authority: ERPFY-MASTER-PLAN.md section 32 (layout), 36. Design: DESIGN.md v1.2 (the scoped `admin-surface` theme).
 *
 * Section 32's layout, exactly: ERPFY logo top-left, the optional action top-right, one
 * focused card in the centre, Continue as the primary action at the bottom with Back
 * beside it. Deliberately no side rail and no company switcher — the whole point of this
 * screen is that nothing competes with the question being asked.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';

export function ErpfyWordmark() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid size-7 place-items-center rounded-lg bg-[var(--erpfy-accent,#1e5631)] text-[13px] font-extrabold text-[var(--erpfy-accent-ink,#ffffff)]"
        aria-hidden
      >
        E
      </span>
      <span className="text-[17px] font-bold tracking-[-0.04em] text-[var(--erpfy-ink,#111827)]">
        ERPFY
      </span>
    </div>
  );
}


export function OnboardingFrame({
  topRight,
  children,
}: {
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-surface flex min-h-screen flex-col bg-[var(--erpfy-canvas)] text-[var(--erpfy-ink)]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] px-4 md:px-7">
        <Link href="/account" aria-label="ERPFY personal account" className="flex items-center">
          <ErpfyWordmark />
        </Link>
        <div className="flex items-center gap-2">{topRight}</div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 md:py-14">
        <div className="w-full max-w-[560px]">{children}</div>
      </main>
    </div>
  );
}

/**
 * Progress across the live steps. It counts only steps that exist, so it can never show
 * "3 of 17" while fourteen of those screens are unbuilt (section 99).
 */
export function OnboardingProgress({
  position,
  total,
  label,
}: {
  position: number;
  total: number;
  label: string;
}) {
  const percent = Math.round((position / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--erpfy-ink-faint)]">
          {label}
        </p>
        <p className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">
          Step {position} of {total}
        </p>
      </div>
      {/* Decorative: the "Step 3 of 8" line above already states the position, so the
          bar carries no information of its own and is hidden from assistive tech. */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--erpfy-line)]" aria-hidden>
        <div
          className="h-full rounded-full bg-[var(--erpfy-ink)] transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** The one focused question card. */
export function OnboardingCard({
  question,
  help,
  children,
  footer,
}: {
  question: string;
  help: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="erpfy-card p-6 md:p-7">
      <h1 className="text-[24px] font-bold leading-8 tracking-[-0.03em] md:text-[26px]">
        {question}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--erpfy-ink-muted)]">{help}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-[var(--erpfy-line-soft)] pt-5">
        {footer}
      </div>
    </div>
  );
}

/** A full-frame explanation when setup cannot start or continue. */
export function OnboardingNotice({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="erpfy-card p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--erpfy-status-neutral-bg)] text-[var(--erpfy-status-neutral-ink)]">
        {icon}
      </span>
      <h1 className="mt-5 text-lg font-bold tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 text-sm leading-7 text-[var(--erpfy-ink-muted)]">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>
    </div>
  );
}
