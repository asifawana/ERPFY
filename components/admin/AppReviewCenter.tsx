'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Power,
} from 'lucide-react';
import {
  ErpfyButton,
  ErpfyStatus,
} from '@/lib/design-system';

interface PendingReview {
  review: {
    id: string;
    status: string;
    reviewNotes?: string;
    createdAt: string;
  };
  version: {
    id: string;
    version: string;
    changelog: string;
    manifestJson: string;
    packageHash: string;
    securityScanStatus: string;
    securityScanReport: string;
  };
  app: {
    id: string;
    name: string;
    slug: string;
    category: string;
    appType: string;
    isKilled: boolean;
  };
  developer: {
    id: string;
    name: string;
    contactEmail: string;
    verified: boolean;
  };
}

interface KillswitchApp {
  id: string;
  name: string;
  category: string;
  installedCount?: number;
  isKilled: boolean;
  killReason?: string | null;
}

export function AppReviewCenter() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'killswitch'>('queue');

  // Killswitch tab state
  const [allApps, setAllApps] = useState<KillswitchApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/apps/review');
      if (res.ok) {
        const data = (await res.json()) as { reviews?: PendingReview[] };
        setReviews(data.reviews || []);
        if (data.reviews && data.reviews.length > 0) {
          setSelectedReview(data.reviews[0]);
        } else {
          setSelectedReview(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllAppsForKillswitch() {
    setLoadingApps(true);
    try {
      const res = await fetch('/api/apps/store');
      if (res.ok) {
        const data = (await res.json()) as { apps?: KillswitchApp[] };
        setAllApps(data.apps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApps(false);
    }
  }

  useEffect(() => {
    const animId = requestAnimationFrame(() => {
      void loadQueue();
    });
    return () => cancelAnimationFrame(animId);
  }, []);

  async function handleApprove(reviewId: string) {
    if (!confirm('Approve and issue cryptographic HMAC platform signature for this production release?')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/apps/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reviewId,
          notes: 'Approved by Platform Security Administrator.',
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        alert('App release approved and cryptographically signed!');
        void loadQueue();
      } else {
        alert(data.error || 'Approval failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRequestChanges(reviewId: string) {
    const feedback = prompt('Enter change request notes for the developer:');
    if (!feedback) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/apps/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_changes',
          reviewId,
          notes: feedback,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        alert('Feedback sent to developer.');
        void loadQueue();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleKillSwitch(appId: string, currentKilled: boolean) {
    const action = currentKilled ? 'unkill' : 'kill';
    let reason = '';
    if (!currentKilled) {
      reason = prompt('Enter emergency kill reason (will be logged in audit):') || 'Emergency security mitigation';
    }

    try {
      const res = await fetch('/api/admin/apps/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          appId,
          killReason: reason,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        alert(`App ${action === 'kill' ? 'KILLED' : 'RESTORED'} successfully across all tenants.`);
        void loadAllAppsForKillswitch();
      } else {
        alert(data.error || 'Kill switch operation failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Kill switch operation failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-xl bg-[#111827] text-white shadow-xs font-bold">
            <ShieldCheck className="size-6 text-[#10B981]" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Platform App Review Center</h2>
            <p className="text-xs text-[#6B7280]">
              Automated scan auditing, HMAC platform release signing & emergency tenant kill switch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('queue'); void loadQueue(); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'queue'
                ? 'bg-[#111827] text-white'
                : 'border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'
            }`}
          >
            Review Queue ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('killswitch'); void loadAllAppsForKillswitch(); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'killswitch'
                ? 'bg-[#EF4444] text-white'
                : 'border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'
            }`}
          >
            Emergency Kill Switch
          </button>
        </div>
      </div>

      {activeTab === 'queue' && (
        <>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-[var(--erpfy-ink-muted)]" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
              <CheckCircle className="mx-auto size-10 text-[#10B981]" />
              <h3 className="mt-3 text-sm font-semibold text-[#111827]">Review Queue Clean</h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                All submitted versions have been processed and signed.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Submissions list */}
              <div className="space-y-3 lg:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Pending Submissions ({reviews.length})
                </h3>
                <div className="space-y-2">
                  {reviews.map((item) => (
                    <button
                      type="button"
                      key={item.review.id}
                      onClick={() => setSelectedReview(item)}
                      className={`text-left w-full cursor-pointer rounded-xl border p-4 text-xs shadow-xs transition ${
                        selectedReview?.review.id === item.review.id
                          ? 'border-[var(--erpfy-brand)] bg-[#F0FDF4]'
                          : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-[#111827]">{item.app.name}</span>
                        <ErpfyStatus tone="attention">v{item.version.version}</ErpfyStatus>
                      </div>
                      <p className="mt-1 text-[11px] text-[#6B7280]">
                        By {item.developer.name} · {item.app.category}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {item.version.securityScanStatus === 'passed' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#16a34a]">
                            <CheckCircle className="size-3" /> Scanner Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#dc2626]">
                            <XCircle className="size-3" /> Scanner Failed
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Review Details & Sign Action */}
              {selectedReview && (
                <div className="space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs lg:col-span-2">
                  <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#111827]">
                        {selectedReview.app.name} · v{selectedReview.version.version}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        Developer: {selectedReview.developer.name} ({selectedReview.developer.contactEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <ErpfyButton
                        tone="secondary"
                        disabled={processing}
                        onClick={() => { void handleRequestChanges(selectedReview.review.id); }}
                      >
                        Request Changes
                      </ErpfyButton>
                      <ErpfyButton
                        tone="primary"
                        disabled={processing || selectedReview.version.securityScanStatus !== 'passed'}
                        onClick={() => { void handleApprove(selectedReview.review.id); }}
                        className="flex items-center gap-1.5"
                      >
                        <ShieldCheck className="size-4" />
                        Approve & Platform Sign
                      </ErpfyButton>
                    </div>
                  </div>

                  {/* Security Scanner Card */}
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs">
                    <h4 className="font-bold text-[#111827] flex items-center gap-2">
                      <Lock className="size-4 text-[var(--erpfy-brand)]" />
                      Automated Static Security Scanner Audit
                    </h4>
                    <div className="mt-2 space-y-1 text-[#4B5563]">
                      <p>Status: <strong className="uppercase text-[#16a34a]">{selectedReview.version.securityScanStatus}</strong></p>
                      <p>Package Hash (SHA-256): <code className="rounded bg-white px-1.5 py-0.5 border border-[#E5E7EB]">{selectedReview.version.packageHash}</code></p>
                    </div>
                  </div>

                  {/* Manifest Viewer */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      EAP v1 Manifest Specification
                    </h4>
                    <pre className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-[#1E293B] p-4 font-mono text-[11px] text-[#E2E8F0]">
                      {JSON.stringify(JSON.parse(selectedReview.version.manifestJson || '{}'), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Killswitch Tab */}
      {activeTab === 'killswitch' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="size-4" />
              Emergency Platform Kill Switch Policy:
            </div>
            <p className="mt-1">
              Killing an app immediately revokes its authorization and halts extension slot rendering across ALL customer tenants without deleting tenant data.
            </p>
          </div>

          {loadingApps ? (
            <div className="py-12 text-center text-xs text-[#9CA3AF]">Loading apps...</div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white">
              {allApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827]">{app.name}</span>
                      {app.isKilled ? (
                        <ErpfyStatus tone="critical">REVOKED / KILLED</ErpfyStatus>
                      ) : (
                        <ErpfyStatus tone="success">Operational</ErpfyStatus>
                      )}
                    </div>
                    <p className="mt-1 text-[#6B7280]">ID: {app.id} · Category: {app.category} · Installs: {app.installedCount}</p>
                    {app.isKilled && app.killReason && (
                      <p className="mt-1 text-[#DC2626] font-semibold">Reason: {app.killReason}</p>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => { void handleKillSwitch(app.id, app.isKilled); }}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
                        app.isKilled
                          ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                          : 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                      }`}
                    >
                      <Power className="size-3.5" />
                      {app.isKilled ? 'Unkill / Restore' : 'Emergency Kill'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
