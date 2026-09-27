import Link from 'next/link';
import { Puzzle, Store } from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';

/** Legacy sample URLs cannot stand in for an installed, authorized app page. */
export function AppModuleUnavailable({ moduleName }: { moduleName: string }) {
  return (
    <AccountGate>
      {({ company }) => (
        <div className="space-y-6">
          <header>
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--erpfy-ink)]">
              {moduleName}
            </h1>
            <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
              Business tools are added to your workspace through apps.
            </p>
          </header>

          <section className="erpfy-card px-5 py-10 text-center md:px-8">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
              <Puzzle className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-bold text-[var(--erpfy-ink)]">
              Open {moduleName.toLowerCase()} through an app
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--erpfy-ink-muted)]">
              This address is not an active app page. Open an available app from
              your workspace, or browse the App Store to add the tools your
              company needs.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link
                href={
                  company
                    ? `/account/app-store?company=${encodeURIComponent(company.slug)}`
                    : '/account/app-store'
                }
                className="primary-button"
              >
                <Store className="size-4" aria-hidden />
                Browse App Store
              </Link>
              <Link
                href={
                  company
                    ? `/c/${encodeURIComponent(company.slug)}`
                    : '/account'
                }
                className="soft-button"
              >
                Back to workspace
              </Link>
            </div>
          </section>
        </div>
      )}
    </AccountGate>
  );
}
