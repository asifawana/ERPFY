import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AccountGate } from '@/components/account/AccountGate';
import { CrmModule, type CrmViewMode } from '@/components/crm/CrmModule';
import { loadAccount } from '@/lib/core/page-data';

export const metadata: Metadata = { title: 'Contacts & CRM — ERPFY' };

export default async function CompanyCrmPage({
  params,
}: {
  params: Promise<{ slug: string; view?: string[] }>;
}) {
  const { slug, view } = await params;
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

  const rawSubView = view && view.length > 0 ? view[0] : 'overview';
  const initialView: CrmViewMode =
    rawSubView === 'contacts' ||
    rawSubView === 'companies' ||
    rawSubView === 'leads' ||
    rawSubView === 'opportunities'
      ? rawSubView
      : 'overview';

  return (
    <AccountGate wide overrideCompany={companyContext}>
      {() => (
        <CrmModule
          companyId={currentCompany.id}
          companySlug={currentCompany.slug}
          initialView={initialView}
          currency={currentCompany.currency || '$'}
        />
      )}
    </AccountGate>
  );
}
