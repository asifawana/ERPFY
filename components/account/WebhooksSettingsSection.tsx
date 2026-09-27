'use client';

import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Eye, EyeOff, CheckCircle2, Play, AlertCircle, Copy, Check } from 'lucide-react';
import { ErpfyPanel, ErpfyButton } from '@/lib/design-system';
import type { WebhookEndpoint } from '@/lib/webhooks/dispatcher';

export function WebhooksSettingsSection({ companyId }: { companyId?: string | null }) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('*');
  const [isRegistering, setIsRegistering] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/webhooks?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setWebhooks(data.webhooks || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchWebhooks();
  }, [companyId]);

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId || !newUrl.trim()) return;
    setIsRegistering(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          companyId,
          url: newUrl.trim(),
          events: [selectedEvent],
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || data.error) {
        setFeedback({ type: 'error', message: data.error || 'Failed to register webhook.' });
      } else {
        setFeedback({ type: 'success', message: 'Webhook registered successfully! Secret generated.' });
        setNewUrl('');
        void fetchWebhooks();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error registering webhook.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!companyId) return;
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          companyId,
          webhookId,
        }),
      });
      if (res.ok) {
        void fetchWebhooks();
      }
    } catch {
      // Ignore
    }
  };

  const handleTestPing = async (webhookId: string) => {
    if (!companyId) return;
    setTestingId(webhookId);
    setFeedback(null);

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          companyId,
          testEvent: 'order.created',
          testPayload: {
            orderNumber: 'SO-TEST-999',
            totalAmount: 149.99,
            currency: 'USD',
            status: 'confirmed',
          },
        }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        const log = data.logs?.[0];
        if (log && log.success) {
          setFeedback({ type: 'success', message: `Test ping dispatched! Response: HTTP ${log.statusCode}` });
        } else {
          setFeedback({
            type: 'error',
            message: `Ping failed or timed out: ${log?.error || 'Target endpoint unreachable'}`,
          });
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error sending test ping.' });
    } finally {
      setTestingId(null);
    }
  };

  const toggleSecret = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copySecret = (id: string, secret: string) => {
    void navigator.clipboard.writeText(secret);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };


  return (
    <div className="space-y-6">
      <ErpfyPanel
        title="Webhooks & REST API"
        description="Receive real-time signed HTTP notifications for ERP and Ecommerce events, or query your tenant data using the REST API v1."
      >
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

        {/* API v1 Reference Banner */}
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-indigo-950">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm">ERPfy REST API v1</span>
            <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              v1.0 Live
            </span>
          </div>
          <p className="text-xs text-indigo-900 leading-relaxed">
            Endpoints are scoped to your company context automatically. Pass your company ID via header <code>X-Company-ID: {companyId || 'YOUR_COMPANY_ID'}</code> or query parameter <code>?companyId=...</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/80 border border-indigo-200 px-2.5 py-1 rounded font-mono text-[11px] text-indigo-900">
              GET /api/v1/products
            </span>
            <span className="bg-white/80 border border-indigo-200 px-2.5 py-1 rounded font-mono text-[11px] text-indigo-900">
              POST /api/v1/products
            </span>
            <span className="bg-white/80 border border-indigo-200 px-2.5 py-1 rounded font-mono text-[11px] text-indigo-900">
              GET /api/v1/orders
            </span>
            <span className="bg-white/80 border border-indigo-200 px-2.5 py-1 rounded font-mono text-[11px] text-indigo-900">
              POST /api/v1/orders
            </span>
          </div>
        </div>

        {/* Register Webhook Form */}
        <form onSubmit={handleRegister} className="mb-6 rounded-xl border border-[var(--erpfy-line-soft)] bg-neutral-50/50 p-4">
          <h4 className="font-bold text-xs text-[var(--erpfy-ink)] mb-3">Register Webhook Endpoint</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Payload URL (HTTPS required)
              </label>
              <input
                type="url"
                required
                placeholder="https://api.mybrand.com/webhooks/erpfy"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-2 text-xs text-[var(--erpfy-ink)] placeholder-neutral-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Subscribed Event
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-2 text-xs text-[var(--erpfy-ink)] focus:border-indigo-600 focus:outline-none"
              >
                <option value="*">All Events (*)</option>
                <option value="product.created">product.created</option>
                <option value="order.created">order.created</option>
                <option value="order.paid">order.paid</option>
                <option value="inventory.updated">inventory.updated</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <ErpfyButton
              type="submit"
              tone="primary"
              disabled={isRegistering || !newUrl.trim()}
              className="text-xs font-semibold py-1.5 px-4"
            >
              <Plus className="mr-1.5 size-3.5" />
              {isRegistering ? 'Registering...' : 'Register Endpoint'}
            </ErpfyButton>
          </div>
        </form>

        {/* Registered Webhooks List */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[var(--erpfy-ink-muted)]">
            Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/40 p-8 text-center">
            <Zap className="mx-auto size-8 text-neutral-400" />
            <h4 className="mt-3 text-sm font-semibold text-neutral-800">No Webhooks Registered</h4>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              Add a webhook URL above to automatically receive HMAC SHA-256 signed event payloads for orders and products.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--erpfy-line-soft)] border border-[var(--erpfy-line-soft)] rounded-xl overflow-hidden bg-white">
            {webhooks.map((wh) => {
              const isRevealed = !!revealedSecrets[wh.id];
              return (
                <div key={wh.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs font-mono text-[var(--erpfy-ink)] break-all">
                        {wh.url}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>Events: <strong className="text-neutral-700 font-mono">{wh.events.join(', ')}</strong></span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        Secret: {isRevealed ? wh.secret : '••••••••••••••••••••••••'}
                        <button
                          type="button"
                          onClick={() => toggleSecret(wh.id)}
                          className="text-neutral-400 hover:text-neutral-600 ml-1"
                        >
                          {isRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copySecret(wh.id, wh.secret)}
                          className="text-neutral-400 hover:text-neutral-600"
                          title="Copy Secret"
                        >
                          {copiedSecretId === wh.id ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestPing(wh.id)}
                      disabled={testingId === wh.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
                    >
                      <Play className="size-3 text-neutral-500" />
                      {testingId === wh.id ? 'Sending...' : 'Test Ping'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(wh.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete webhook"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}
