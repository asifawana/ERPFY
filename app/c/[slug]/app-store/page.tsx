import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { AccountOverlay } from '@/components/account/AccountOverlay';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';
import { AppStoreClient } from '@/components/apps/AppStoreClient';

export const metadata: Metadata = { title: 'App Store — ERPFY' };

export default async function CompanyAppStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AccountGate wide companySlug={slug}>
      {({ profile, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <AccountOverlay
            closeLabel="Close App Store"
            closeHref={company?.slug ? `/c/${encodeURIComponent(company.slug)}` : '/account'}
            contentClassName="mx-auto max-w-[1680px] px-4 pb-8 pt-16 md:px-8 md:pb-10 lg:pt-7"
          >
            <AppStoreClient
              companyId={company?.id}
              companyName={company?.name}
              companyRole={company?.role}
              companySlug={company?.slug}
            />
          </AccountOverlay>
        </>
      )}
    </AccountGate>
  );
}
