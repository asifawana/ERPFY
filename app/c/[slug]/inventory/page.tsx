import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { ProductsModule } from '@/components/modules/ProductsModule';

export const metadata: Metadata = { title: 'Inventory — ERPFY' };

export default async function CompanyInventoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AccountGate wide companySlug={slug}>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <ProductsModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
