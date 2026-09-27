'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Check, X, Building2, Calendar, Clock, AlertCircle } from 'lucide-react';
import type { PendingInvitation } from '@/lib/core/page-data';
import { ErpfyStatus, ErpfyTime } from '@/lib/design-system';

export function InvitationsList({ initialInvitations }: { initialInvitations: PendingInvitation[] }) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRespond(invitationId: string, action: 'accept' | 'decline') {
    setError(null);
    setSuccess(null);
    setProcessingId(invitationId);

    try {
      const res = await fetch(`/api/account/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process invitation.');
      }

      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setSuccess(
        action === 'accept'
          ? 'Invitation accepted! Company added to your workspaces.'
          : 'Invitation declined.',
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--erpfy-line)] bg-[var(--erpfy-status-critical-bg)] px-4 py-3 text-sm font-semibold text-[var(--erpfy-status-critical-ink)]">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--erpfy-line)] bg-[var(--erpfy-status-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--erpfy-status-success-ink)]">
          <Check className="size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="erpfy-card p-12 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[var(--erpfy-surface-subtle)] text-[var(--erpfy-ink-muted)]">
            <Mail className="size-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--erpfy-ink)]">No pending invitations</h3>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            When someone invites you to join their ERP workspace, the invitation will appear here.
          </p>
        </div>
      ) : (
        <div className="erpfy-card divide-y divide-[var(--erpfy-line-soft)] overflow-hidden">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--erpfy-ink)]">
                      {inv.companyName}
                    </h3>
                    <ErpfyStatus tone="info">{inv.role}</ErpfyStatus>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[var(--erpfy-ink-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      Invited <ErpfyTime value={inv.createdAt} relative />
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Expires <ErpfyTime value={inv.expiresAt} relative />
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  disabled={processingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'decline')}
                  className="soft-button flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="size-3.5" />
                  Decline
                </button>
                <button
                  type="button"
                  disabled={processingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'accept')}
                  className="primary-button flex items-center gap-1.5 text-xs"
                >
                  <Check className="size-3.5" />
                  {processingId === inv.id ? 'Accepting...' : 'Accept Invitation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
