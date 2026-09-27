import type { Metadata } from 'next';
import { AccountGate } from '@/components/account/AccountGate';
import { AccountOverlay } from '@/components/account/AccountOverlay';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';
import { ModuleHeader } from '@/components/modules/ModuleShell';
import { AppReviewCenter } from '@/components/admin/AppReviewCenter';

export const metadata: Metadata = { title: 'App Review Center' };

export default function AdminAppsPage() {
  return (
    <AccountGate wide>
      {({ profile, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <AccountOverlay
            closeLabel="Close App Review Center"
            closeHref={company?.slug ? `/account?company=${encodeURIComponent(company.slug)}` : '/account'}
            contentClassName="mx-auto max-w-[1680px] px-4 pb-8 pt-16 md:px-8 md:pb-10 lg:pt-7"
          >
            <ModuleHeader
              title="Platform App Review & Security"
              subline="Audit automated scanner reports, issue platform signatures, and manage emergency kill switch."
              app="Review Center"
            />
            <AppReviewCenter />
          </AccountOverlay>
        </>
      )}
    </AccountGate>
  );
}
