import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { CustomersModule } from '@/components/modules/CustomersModule';

export const metadata: Metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <AccountGate wide>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <CustomersModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
