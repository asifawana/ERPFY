'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, CheckCircle2, AlertCircle, RefreshCw, Trash2, ShieldCheck, Copy, Check } from 'lucide-react';
import { ErpfyPanel, ErpfyButton, ErpfyInput } from '@/lib/design-system';
import type { CustomDomainRecord } from '@/lib/domains/types';

export function DomainsSettingsSection({ companyId }: { companyId?: string | null }) {
  const [domains, setDomains] = useState<CustomDomainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const fetchDomains = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/domains?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setDomains(data.domains || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDomains();
  }, [companyId]);

  const handleAddDomain = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId || !newDomainInput.trim()) return;
    setIsAdding(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          companyId,
          domain: newDomainInput.trim(),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || data.error) {
        setFeedback({ type: 'error', message: data.error || 'Failed to add custom domain.' });
      } else {
        setFeedback({ type: 'success', message: `Domain ${newDomainInput.trim()} registered! Please configure DNS.` });
        setNewDomainInput('');
        void fetchDomains();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error adding domain.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    if (!companyId) return;
    setVerifyingId(domainId);
    setFeedback(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          companyId,
          domainId,
        }),
      });
      const data = (await res.json()) as any;
      if (data.verified) {
        setFeedback({ type: 'success', message: data.message });
        void fetchDomains();
      } else {
        setFeedback({ type: 'error', message: data.message || 'DNS verification failed. Check records.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Verification check failed.' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRemove = async (domainId: string) => {
    if (!companyId) return;
    if (!confirm('Are you sure you want to remove this custom domain?')) return;
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          companyId,
          domainId,
        }),
      });
      if (res.ok) {
        void fetchDomains();
      }
    } catch {
      // Ignore
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedTarget(text);
    setTimeout(() => setCopiedTarget(null), 2000);
  };


  return (
    <div className="space-y-6">
      <ErpfyPanel
        title="Custom Domains"
        description="Connect your own branded domain (e.g., store.brand.com or yourbrand.pk) to your ERPfy online store with automatic SSL certificates."
      >
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-4 flex items-center justify-between rounded-lg p-3 text-xs ${
              feedback.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add Domain Input Box */}
        <form onSubmit={handleAddDomain} className="mb-6 rounded-xl border border-[var(--erpfy-line-soft)] bg-neutral-50/50 p-4">
          <label className="block text-xs font-semibold text-[var(--erpfy-ink)] mb-1">
            Connect a Domain
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. shop.mycompany.com"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                className="w-full rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3.5 py-2 text-xs text-[var(--erpfy-ink)] placeholder-neutral-400 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <ErpfyButton
              type="submit"
              tone="primary"
              disabled={isAdding || !newDomainInput.trim()}
              className="px-4 py-2 text-xs font-semibold"
            >
              <Plus className="mr-1.5 size-3.5" />
              {isAdding ? 'Adding...' : 'Connect Domain'}
            </ErpfyButton>
          </div>
          <p className="mt-2 text-[11px] text-[var(--erpfy-ink-muted)]">
            Apex domains (e.g. <code>brand.com</code>) point an <strong>A</strong> record to <code>76.76.21.21</code>. Subdomains (e.g. <code>shop.brand.com</code>) point a <strong>CNAME</strong> record to <code>cname.erpfy.net</code>.
          </p>
        </form>

        {/* Domains List */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[var(--erpfy-ink-muted)]">
            Loading domains...
          </div>
        ) : domains.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/40 p-8 text-center">
            <Globe className="mx-auto size-8 text-neutral-400" />
            <h4 className="mt-3 text-sm font-semibold text-neutral-800">No Custom Domains Connected</h4>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              Your store is currently live on your default ERPfy subdomain. Add your custom domain above to give your customers a branded experience.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--erpfy-line-soft)] border border-[var(--erpfy-line-soft)] rounded-xl overflow-hidden bg-white">
            {domains.map((dom) => (
              <div key={dom.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--erpfy-ink)]">{dom.domain}</span>
                    {dom.isPrimary && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-300">
                        Primary
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        dom.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {dom.status === 'verified' ? (
                        <>
                          <CheckCircle2 className="size-3" /> Verified
                        </>
                      ) : (
                        <>
                          <AlertCircle className="size-3" /> DNS Pending
                        </>
                      )}
                    </span>
                    {dom.sslStatus === 'active' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <ShieldCheck className="size-3" /> SSL Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>
                      Type: <strong>{dom.dnsRecordType}</strong>
                    </span>
                    <span>
                      Target: <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">{dom.dnsExpectedValue}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(dom.dnsExpectedValue)}
                      className="text-neutral-400 hover:text-neutral-600 inline-flex items-center gap-1"
                      title="Copy DNS target"
                    >
                      {copiedTarget === dom.dnsExpectedValue ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {dom.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => handleVerify(dom.id)}
                      disabled={verifyingId === dom.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
                    >
                      <RefreshCw className={`size-3.5 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                      {verifyingId === dom.id ? 'Verifying...' : 'Verify DNS'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(dom.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove domain"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}
