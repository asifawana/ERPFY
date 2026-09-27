import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountGate } from '@/components/account/AccountGate';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <AccountGate>
      {({ company }) =>
        redirect(company ? `/c/${encodeURIComponent(company.slug)}` : '/account')
      }
    </AccountGate>
  );
}
