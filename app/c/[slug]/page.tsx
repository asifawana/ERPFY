import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AccountGate } from '@/components/account/AccountGate';
import { ErpDashboard } from '@/components/dashboard/ErpDashboard';
import { getGreeting, formatGreeting } from '@/lib/greeting';
import { loadAccount } from '@/lib/core/page-data';
import { database } from '@/lib/core/server';
import { getTenantInstalledApps } from '@/lib/eap/installation';
import { getCompanyDashboardData } from '@/lib/dashboard/data-service';

export const metadata: Metadata = { title: 'ERP Workspace' };

export default async function CompanyWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadAccount();

  if (data.status === 'signed-out' || data.status === 'unavailable') {
    return (
      <AccountGate wide>
        {() => null}
      </AccountGate>
    );
  }

  const currentCompany = data.companies.find((c) => c.slug === slug);
  if (!currentCompany) {
    notFound();
  }

  const companyContext = {
    id: currentCompany.id,
    name: currentCompany.name,
    slug: currentCompany.slug,
    role: currentCompany.role,
    initials: currentCompany.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join(''),
  };

  let installedAppSlugs: string[] = [];
  let initialDashboardData = undefined;

  try {
    const db = database();
    const [installedApps, dashData] = await Promise.all([
      getTenantInstalledApps(db, currentCompany.id),
      getCompanyDashboardData(db, {
        companyId: currentCompany.id,
        companySlug: currentCompany.slug,
        baseCurrency: currentCompany.currency || 'USD',
        period: '7d',
      }),
    ]);
    installedAppSlugs = Array.from(
      new Set(installedApps.flatMap((a) => [a.slug, a.appId]).filter(Boolean)),
    );
    initialDashboardData = dashData;
  } catch {
    installedAppSlugs = [];
  }

  return (
    <AccountGate wide overrideCompany={companyContext}>
      {({ profile }) => (
        <ErpDashboard
          greeting={formatGreeting(getGreeting(currentCompany.timezone || profile.timezone), profile.displayName || profile.email)}
          subline={`Workspace overview for ${currentCompany.name}.`}
          currency={currentCompany.currency || 'USD'}
          installedAppSlugs={installedAppSlugs}
          companySlug={currentCompany.slug}
          companyId={currentCompany.id}
          initialData={initialDashboardData}
          warehouses={initialDashboardData?.warehouses}
        />
      )}
    </AccountGate>
  );
}
