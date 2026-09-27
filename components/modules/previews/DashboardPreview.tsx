import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { ErpDashboard } from '@/components/dashboard/ErpDashboard';
import { getGreeting, formatGreeting } from '@/lib/greeting';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <AccountGate wide>
      {({ profile }) => (
        <ErpDashboard
          greeting={formatGreeting(getGreeting(profile.timezone), profile.displayName || profile.email)}
          subline="Figures appear here as each app is installed. Feel free to explore the modules."
        />
      )}
    </AccountGate>
  );
}
