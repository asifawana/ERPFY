/**
 * Wraps every admin screen: signed-out and storage-unavailable states, then the shell.
 *
 * Every screen behind this gate renders sample data, but the gate itself is real — the
 * session is genuine, and a signed-out visitor is told so rather than shown someone's
 * dashboard.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleAlert, LogIn } from 'lucide-react';

import { loadAccount, type AccountData, type CompanyContext } from '@/lib/core/page-data';
import { database } from '@/lib/core/server';
import { getAuthorizedTenantAppNavigation, type DynamicSidebarNavItem } from '@/lib/eap/installation';
import { AccountShell } from './AccountShell';

type Ready = Extract<AccountData, { status: 'ready' }>;

export async function AccountGate({
  children,
  wide = false,
  overrideCompany,
  companySlug,
}: {
  children: (data: Ready) => ReactNode;
  /** Dashboards need the room; reading screens are easier at a narrower measure. */
  wide?: boolean;
  overrideCompany?: CompanyContext | null;
  /** Explicit workspace selection is resolved from this viewer's memberships. */
  companySlug?: string;
}) {
  const data = await loadAccount();

  if (data.status === 'signed-out') {
    return (
      <StandaloneState
        icon={<LogIn className="size-5" aria-hidden />}
        title="Sign in to continue"
        body="These screens belong to an account, so we need to know whose they are."
        action={
          <Link
            href="/login"
            className="rounded-lg bg-[var(--erpfy-brand)] px-4 py-2 text-sm font-semibold text-white shadow-xs"
          >
            Log in
          </Link>
        }
      />
    );
  }

  if (data.status === 'unavailable') {
    return (
      <StandaloneState
        icon={<CircleAlert className="size-5" aria-hidden />}
        title="Account storage is unavailable"
        body={data.message}
        tone="critical"
        action={
          <Link
            href="/login"
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-xs"
          >
            Back to log in
          </Link>
        }
      />
    );
  }

  let company = overrideCompany !== undefined ? overrideCompany : data.company;
  if (companySlug !== undefined) {
    const selected = data.companies.find((item) => item.slug === companySlug);
    if (!selected) notFound();
    company = {
      id: selected.id,
      name: selected.name,
      slug: selected.slug,
      role: selected.role,
      initials: selected.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join(''),
    };
  }
  let initialPluginNavigation: DynamicSidebarNavItem[] = [];
  if (company) {
    try {
      initialPluginNavigation = await getAuthorizedTenantAppNavigation(database(), data.viewer.accountId, company.id);
    } catch {
      // Core tools stay usable; failed app lookup never grants a fallback menu.
    }
  }

  return (
    <AccountShell
      displayName={data.profile.displayName}
      email={data.profile.email}
      company={company}
      initialPluginNavigation={initialPluginNavigation}
      companies={data.companies}
      wide={wide}
    >
      {children({ ...data, company })}
    </AccountShell>
  );
}

function StandaloneState({
  icon,
  title,
  body,
  action,
  tone = 'neutral',
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
  tone?: 'neutral' | 'critical';
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F3F4F6] px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs">
        <span
          className="mx-auto grid size-12 place-items-center rounded-2xl"
          style={
            tone === 'critical'
              ? { background: '#FEE2E2', color: '#B91C1C' }
              : { background: '#F3F4F6', color: '#4B5563' }
          }
        >
          {icon}
        </span>
        <h1 className="mt-5 text-lg font-bold tracking-tight text-[#111827]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#4B5563]">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>
      </div>
    </div>
  );
}
