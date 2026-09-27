import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { CustomersModule } from '@/components/modules/CustomersModule';

export const metadata: Metadata = { title: 'Customers — ERPFY' };

export default async function CompanyCustomersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AccountGate wide companySlug={slug}>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <CustomersModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
