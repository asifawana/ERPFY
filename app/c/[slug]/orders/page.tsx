import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { OrdersModule } from '@/components/modules/OrdersModule';

export const metadata: Metadata = { title: 'Orders — ERPFY' };

export default async function CompanyOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AccountGate wide companySlug={slug}>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <OrdersModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
