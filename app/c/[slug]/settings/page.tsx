import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';

export const metadata: Metadata = { title: 'Settings — ERPFY' };

export default async function CompanySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <AccountGate wide companySlug={slug}>
      {({ profile, preferences, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <Suspense fallback={null}>
            <AccountSettingsForm
              profile={profile}
              preferences={preferences}
              company={company}
              initialSection={resolvedSearchParams.tab}
            />
          </Suspense>
        </>
      )}
    </AccountGate>
  );
}
