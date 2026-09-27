import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { OrdersModule } from '@/components/modules/OrdersModule';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return (
    <AccountGate wide>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <OrdersModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
