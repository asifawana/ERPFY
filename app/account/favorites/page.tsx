import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { CompanyCardGrid } from '@/components/account/CompanyCards';
import type { CompanyCard } from '@/lib/core/account';

export const metadata: Metadata = {
  title: 'Favorites · ERPFY',
  description: 'Your favorite ERP workspaces.',
};

export default function FavoritesPage() {
  return (
    <AccountGate>
      {({ companies }) => {
        const favoriteCompanies = companies.filter((c) => c.isFavorite);

        return (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-1 hover:text-[var(--erpfy-ink)]"
                  >
                    <ArrowLeft className="size-3.5" />
                    My ERPs
                  </Link>
                  <span>/</span>
                  <span>Favorites</span>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-[var(--erpfy-ink)]">
                  Favorite Workspaces
                </h1>
              </div>
            </div>

            {favoriteCompanies.length === 0 ? (
              <div className="erpfy-card p-12 text-center">
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-500">
                  <Star className="size-6 fill-amber-500" />
                </div>
                <h3 className="text-base font-bold text-[var(--erpfy-ink)]">
                  No favorite workspaces yet
                </h3>
                <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
                  Star any workspace in your list to bookmark it here for fast one-click access.
                </p>
                <div className="mt-6">
                  <Link href="/account" className="primary-button">
                    View All Workspaces
                  </Link>
                </div>
              </div>
            ) : (
              <CompanyCardGrid companies={favoriteCompanies as unknown as CompanyCard[]} />
            )}
          </>
        );
      }}
    </AccountGate>
  );
}
