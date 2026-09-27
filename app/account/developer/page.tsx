import type { Metadata } from 'next';
import { AccountGate } from '@/components/account/AccountGate';
import { AccountOverlay } from '@/components/account/AccountOverlay';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';
import { ModuleHeader } from '@/components/modules/ModuleShell';
import { DeveloperPortal } from '@/components/developer/DeveloperPortal';

export const metadata: Metadata = { title: 'Developer Platform' };

export default function DeveloperPage() {
  return (
    <AccountGate wide>
      {({ profile, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <AccountOverlay
            closeLabel="Close Developer Platform"
            closeHref={company?.slug ? `/account?company=${encodeURIComponent(company.slug)}` : '/account'}
            contentClassName="mx-auto max-w-[1680px] px-4 pb-8 pt-16 md:px-8 md:pb-10 lg:pt-7"
          >
            <ModuleHeader
              title="Developer Platform"
              subline="Build, test, and distribute secure apps on ERP App Protocol (EAP v1)."
              app="Developer Hub"
            />
            <DeveloperPortal />
          </AccountOverlay>
        </>
      )}
    </AccountGate>
  );
}
