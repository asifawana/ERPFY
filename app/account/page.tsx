/**
 * ACC-001 — My ERPs.
 * Authority: ERPFY-MASTER-PLAN.md section 31.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { CompanyCardGrid, CompanyEmptyState } from '@/components/account/CompanyCards';
import type { CompanyCard } from '@/lib/core/account';
import { ErpfyStatus } from '@/lib/design-system';

export const metadata: Metadata = { title: 'My ERPs' };

export default function MyErpsPage() {
  return (
    <AccountGate>
      {({ companies, invitations }) => (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.025em]">My ERPs</h1>
            <div className="flex items-center gap-3">
              <Link href="/help" className="hidden items-center gap-1 text-sm font-medium text-[#616161] hover:underline sm:flex">Help<ArrowUpRight className="size-4" aria-hidden /></Link>
              <Link href="/account/create" className="primary-button">
                <Plus className="size-4" aria-hidden />
                Create ERP
              </Link>
            </div>
          </div>

          <div className="erpfy-card mb-5 grid grid-cols-1 divide-y divide-[var(--erpfy-line-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Your workspaces', value: companies.length, href: '/account' },
              { label: 'Favorites', value: companies.filter((company) => company.isFavorite).length, href: '/account/favorites' },
              { label: 'Pending invitations', value: invitations.length, href: '/account/invitations' },
            ].map((metric) => (
              <Link key={metric.label} href={metric.href} className="px-5 py-4 hover:bg-[var(--erpfy-hover)]">
                <span className="text-sm font-semibold text-[var(--erpfy-ink)] underline decoration-dotted decoration-[#8a8a8a] underline-offset-4">{metric.label}</span>
                <span className="mt-2 block text-2xl font-semibold tracking-tight">{metric.value}</span>
              </Link>
            ))}
          </div>

          {invitations.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--erpfy-line)] bg-white px-4 py-3">
              <ErpfyStatus tone="info">
                {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
              </ErpfyStatus>
              <p className="min-w-0 flex-1 text-sm text-[var(--erpfy-ink-muted)]">
                Someone has invited you to join their company.
              </p>
              <Link href="/account/invitations" className="soft-button">
                Review
              </Link>
            </div>
          )}

          {companies.length === 0 ? (
            <CompanyEmptyState />
          ) : (
            <CompanyCardGrid companies={companies as unknown as CompanyCard[]} />
          )}
          <p className="mt-6 text-center text-xs text-[#616161]">Manage your <Link href="/account/profile" className="text-[#005bd3] underline underline-offset-2">account settings</Link> or <Link href="/account/invitations" className="text-[#005bd3] underline underline-offset-2">view invitations</Link>.</p>
        </>
      )}
    </AccountGate>
  );
}
