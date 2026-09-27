import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { InvitationsList } from '@/components/account/InvitationsList';

export const metadata: Metadata = {
  title: 'Invitations · ERPFY',
  description: 'Manage invitations to join ERP companies and workspaces.',
};

export default function InvitationsPage() {
  return (
    <AccountGate>
      {({ invitations }) => (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1 hover:text-[var(--erpfy-ink)]"
                >
                  <ArrowLeft className="size-3.5" />
                  My ERPs
                </Link>
                <span>/</span>
                <span>Invitations</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-[var(--erpfy-ink)]">
                Company Invitations
              </h1>
            </div>
          </div>

          <InvitationsList initialInvitations={invitations} />
        </>
      )}
    </AccountGate>
  );
}
