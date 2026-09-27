import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { AnalyticsModule } from '@/components/modules/AnalyticsModule';

export const metadata: Metadata = { title: 'Analytics — ERPFY' };

export default async function CompanyAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AccountGate wide companySlug={slug}>
      {({ company, companies }) => {
        const activeCompany = companies.find((c) => c.id === company?.id);
        return <AnalyticsModule currency={activeCompany?.currency || '$'} />;
      }}
    </AccountGate>
  );
}
