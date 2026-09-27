import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { AnalyticsModule } from '@/components/modules/AnalyticsModule';

export const metadata: Metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <AccountGate wide>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <AnalyticsModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
