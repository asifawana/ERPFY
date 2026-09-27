import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: {
  searchParams: Promise<{ company?: string; tab?: string }>;
}) {
  const { company, tab } = await searchParams;
  return (
    <AccountGate wide companySlug={company}>
      {({ profile, preferences, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <Suspense fallback={null}>
            <AccountSettingsForm
              profile={profile}
              preferences={preferences}
              company={company}
              initialSection={tab}
            />
          </Suspense>
        </>
      )}
    </AccountGate>
  );
}
