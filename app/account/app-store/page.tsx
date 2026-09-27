/**
 * APP-000 — App Store, built to match the reference frame.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88, 90, 91, 92, 99. Design: DESIGN.md v1.2.
 *
 * Section 91 is the rule that shapes this screen: before any App is released the catalog may
 * show controlled roadmap states only, and "a catalog card alone does not mean the App works
 * or is billable". So the layout matches the design — hero band, category chips, featured and
 * popular rows, ratings, Install and Installed buttons — while every button is disabled and
 * the header carries a `Sample data` marker. The publishers, ratings and installed states in
 * `demo-modules.ts` are all invented.
 *
 * Two deliberate departures from the design system, worth a change record when the design is
 * signed off: the green hero band and the green Install button. DESIGN.md keeps green as an
 * accent and primary actions near-black, so these are the frame's choices, not ours.
 */

import type { Metadata } from 'next';
import { AccountGate } from '@/components/account/AccountGate';
import { AccountOverlay } from '@/components/account/AccountOverlay';
import { AccountDashboard } from '@/components/dashboard/AccountDashboard';
import { AppStoreClient } from '@/components/apps/AppStoreClient';

export const metadata: Metadata = { title: 'App Store' };

export default async function AppStorePage({ searchParams }: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;
  return (
    <AccountGate wide companySlug={company}>
      {({ profile, company }) => (
        <>
          <AccountDashboard profile={profile} />
          <AccountOverlay
            closeLabel="Close App Store"
            closeHref={company?.slug ? `/account?company=${encodeURIComponent(company.slug)}` : '/account'}
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
