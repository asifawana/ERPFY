'use client';

/**
 * ACC-001a — My ERPs cards.
 * Authority: ERPFY-MASTER-PLAN.md sections 31, 59.
 *
 * Card fields required by section 31: logo, company name, user role, country, plan/trial
 * status, last opened, Open ERP.
 */

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Building2, Star, Search, ArrowUpDown, ArrowUpRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { CompanyCard } from '@/lib/core/account';
import { COUNTRIES } from '@/lib/content/regions';
import { ErpfyAvatar, ErpfyStatus, ErpfyTime, type StatusTone } from '@/lib/design-system';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<CompanyCard['role'], string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  billing_manager: 'Billing manager',
  member: 'Member',
  auditor: 'Auditor',
};

/** Master-plan section 59 lifecycle states, rendered honestly. */
const STATE_LABEL: Record<CompanyCard['state'], { label: string; tone: StatusTone }> = {
  trial: { label: 'Trial', tone: 'attention' },
  payment_pending: { label: 'Payment pending', tone: 'attention' },
  active: { label: 'Active', tone: 'success' },
  past_due: { label: 'Past due', tone: 'critical' },
  grace_period: { label: 'Grace period', tone: 'attention' },
  read_only: { label: 'Read only', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'neutral' },
};

function countryName(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function WorkspaceAvatar({ company }: { company: CompanyCard }) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(`erpfy_logo_${company.id}`) ||
        localStorage.getItem(`erpfy_logo_${company.slug}`);
      if (saved && saved.length > 10) {
        setLogo(saved);
      }
    } catch {}
  }, [company.id, company.slug]);

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={company.name}
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/20"
      />
    );
  }

  return <ErpfyAvatar name={company.name} size={40} circle />;
}

export function CompanyCardGrid({ companies }: { companies: CompanyCard[] }) {
  const [favorites, setFavorites] = useState(
    () => new Set(companies.filter((c) => c.isFavorite).map((c) => c.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
  const [alphabetical, setAlphabetical] = useState(false);
  const visibleCompanies = companies.filter((company) =>
    (view !== 'favorites' || favorites.has(company.id)) &&
    `${company.name} ${company.slug} ${countryName(company.countryCode)}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (alphabetical) visibleCompanies.sort((a, b) => a.name.localeCompare(b.name));

  async function toggle(companyId: string) {
    setError(null);
    // Optimistic, then reconciled with the server's answer.
    const optimistic = new Set(favorites);
    if (optimistic.has(companyId)) optimistic.delete(companyId);
    else optimistic.add(companyId);
    setFavorites(optimistic);

    try {
      const response = await fetch(`/api/account/companies/${companyId}/favorite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const payload = (await response.json()) as { isFavorite?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not update favorites.');

      startTransition(() => {
        setFavorites((current) => {
          const next = new Set(current);
          if (payload.isFavorite) next.add(companyId);
          else next.delete(companyId);
          return next;
        });
      });
    } catch (caught) {
      // Put the row back the way it was; never leave a star showing a change that failed.
      setFavorites(new Set(companies.filter((c) => c.isFavorite).map((c) => c.id)));
      setError(caught instanceof Error ? caught.message : 'Could not update favorites.');
    }
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-[12px] border border-[var(--erpfy-line)] bg-[var(--erpfy-status-critical-bg)] px-4 py-3 text-sm font-semibold text-[var(--erpfy-status-critical-ink)]">
          {error}
        </p>
      )}
      <section className="erpfy-card overflow-hidden" aria-label="Your workspaces">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] px-4 py-3">
          <Tabs value={view} onValueChange={(value) => setView(String(value))}>
            <TabsList className="bg-transparent" aria-label="Filter workspaces">
              <TabsTrigger
                value="all"
                className="px-3 data-[state=active]:bg-[var(--erpfy-hover)] data-[state=active]:text-[var(--erpfy-ink)] data-[state=active]:shadow-none"
              >
                All <span className="ml-1 text-xs text-[var(--erpfy-ink-muted)]">{companies.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="px-3 data-[state=active]:bg-[var(--erpfy-hover)] data-[state=active]:text-[var(--erpfy-ink)] data-[state=active]:shadow-none"
              >
                Favorites
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            className="soft-button"
            type="button"
            aria-pressed={alphabetical}
            onClick={() => setAlphabetical(!alphabetical)}
          >
            <ArrowUpDown className="size-4" aria-hidden />
            {alphabetical ? 'Name A–Z' : 'Sort by name'}
          </button>
        </div>
        <div className="p-3">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--erpfy-line)] bg-[var(--erpfy-canvas)] px-3 focus-within:outline-2 focus-within:outline-[var(--erpfy-brand)]">
            <Search className="size-4 text-[var(--erpfy-ink-muted)]" aria-hidden />
            <input
              className="h-9 min-w-0 flex-1 bg-transparent text-sm text-[var(--erpfy-ink)] outline-none placeholder:text-[var(--erpfy-ink-muted)]"
              aria-label="Search workspaces"
              placeholder="Search workspaces"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--erpfy-surface)] hover:bg-[var(--erpfy-surface)]">
              <TableHead className="w-12"><span className="sr-only">Favorite</span></TableHead>
              <TableHead className="text-[var(--erpfy-ink-muted)]">Workspace</TableHead>
              <TableHead className="text-[var(--erpfy-ink-muted)]">Status</TableHead>
              <TableHead className="text-[var(--erpfy-ink-muted)]">Last opened</TableHead>
              <TableHead className="text-right"><span className="sr-only">Open workspace</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCompanies.map((company) => {
              const state = STATE_LABEL[company.state];
              const isFavorite = favorites.has(company.id);

              return (
                <TableRow key={company.id} className="hover:bg-[var(--erpfy-hover)]">
                  <TableCell className="pl-3">
                    <button
                      type="button"
                      onClick={() => void toggle(company.id)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? `Remove ${company.name} from favorites` : `Add ${company.name} to favorites`}
                      className="icon-button icon-button-light"
                    >
                      <Star
                        className={cn('size-4', isFavorite ? 'fill-[#ffcf60] text-[#805600]' : 'text-[var(--erpfy-ink-muted)]')}
                        aria-hidden
                      />
                    </button>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <WorkspaceAvatar company={company} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/c/${company.slug}`}
                          className="block max-w-64 truncate text-sm font-semibold text-[var(--erpfy-ink)] hover:underline"
                        >
                          {company.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-[var(--erpfy-ink-muted)]">
                          {ROLE_LABEL[company.role]} · {countryName(company.countryCode)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <ErpfyStatus tone={state.tone}>{state.label}</ErpfyStatus>
                      {company.state === 'trial' && (
                        <span className="text-xs text-[var(--erpfy-ink-muted)]">
                          {company.trialDaysLeft <= 0
                            ? 'Trial ended'
                            : `${company.trialDaysLeft} day${company.trialDaysLeft === 1 ? '' : 's'} left`}
                        </span>
                      )}
                      {company.status === 'suspended' && (
                        <ErpfyStatus tone="critical">Membership suspended</ErpfyStatus>
                      )}
                      {company.onboardingState !== 'completed' && (
                        <ErpfyStatus tone="neutral">Setup incomplete</ErpfyStatus>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--erpfy-ink-muted)]">
                    {company.lastOpenedAt ? (
                      <ErpfyTime value={company.lastOpenedAt} relative />
                    ) : (
                      'Not opened yet'
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Link href={`/c/${company.slug}`} className="soft-button">
                      Open ERP<ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-[var(--erpfy-ink-muted)]">
                  {query ? 'No workspaces match your search.' : 'No favorite workspaces yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <p className="border-t border-[var(--erpfy-line-soft)] px-4 py-3 text-center text-xs text-[var(--erpfy-ink-muted)]">
          {visibleCompanies.length} {visibleCompanies.length === 1 ? 'workspace' : 'workspaces'}
        </p>
      </section>
    </>
  );
}

export function CompanyEmptyState() {
  return (
    <section className="erpfy-card overflow-hidden">
      <div className="border-b border-[var(--erpfy-line-soft)] p-5">
        <h2 className="text-base font-semibold text-[var(--erpfy-ink)]">Set up your first workspace</h2>
        <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">A few details to get your company ready.</p>
      </div>
      <div className="m-3 flex items-start gap-3 rounded-lg bg-[var(--erpfy-surface)] p-4">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--erpfy-line)]">
          <Building2 className="size-4 text-[var(--erpfy-ink-muted)]" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[var(--erpfy-ink)]">Create your ERP</h3>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[var(--erpfy-ink-muted)]">
            Add your company name, choose your region and industry, and set your business preferences.
          </p>
          <Link href="/account/create" className="primary-button mt-3">Create ERP</Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 pt-2">
        <p className="text-sm text-[var(--erpfy-ink-muted)]">Joining an existing company?</p>
        <Link href="/account/invitations" className="text-sm font-medium text-[var(--erpfy-brand)] hover:underline">
          View invitations
        </Link>
      </div>
    </section>
  );
}
