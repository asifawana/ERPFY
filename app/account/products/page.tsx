import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { ProductsModule } from '@/components/modules/ProductsModule';

export const metadata: Metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <AccountGate wide>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <ProductsModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
