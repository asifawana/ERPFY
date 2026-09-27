'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, ArrowUpRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { ErpfyPanel, ErpfyButton } from '@/lib/design-system';
import type { CompanySubscription, PlanDefinition } from '@/lib/billing/plans';
import type { QuotaCheckResult } from '@/lib/billing/guard';

export function SubscriptionSettingsSection({ companyId }: { companyId?: string | null }) {
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [quotas, setQuotas] = useState<Record<string, QuotaCheckResult>>({});
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSubscriptionData = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/billing/subscription?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setSubscription(data.subscription || null);
        setQuotas(data.quotas || {});
        setPlans(data.availablePlans || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubscriptionData();
  }, [companyId]);

  const handleUpgrade = async (tier: string) => {
    if (!companyId) return;
    setUpgradingTier(tier);
    setFeedback(null);

    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          tier,
          billingCycle,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || data.error) {
        setFeedback({ type: 'error', message: data.error || 'Failed to update subscription.' });
      } else {
        setFeedback({ type: 'success', message: `Plan successfully updated to ${tier.toUpperCase()}!` });
        void fetchSubscriptionData();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error updating subscription.' });
    } finally {
      setUpgradingTier(null);
    }
  };

  return (
    <div className="space-y-6">
      <ErpfyPanel
        title="Subscription & Plan Limits"
        description="View your active platform tier, resource quotas, and upgrade your plan to unlock more capacity."
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

        {/* Current Plan Overview Card */}
        {subscription && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Active Subscription
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-300 uppercase">
                    {subscription.tier}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 capitalize">
                  {subscription.tier} Plan
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Billing cycle: <strong className="capitalize">{subscription.billingCycle}</strong> · Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs">
                  <ShieldCheck className="size-3.5" />
                  Active & Healthy
                </span>
              </div>
            </div>

            {/* Quota Usage Bars */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-emerald-100 pt-5">
              {Object.entries(quotas).map(([resKey, q]) => {
                const pct = Math.min(Math.round((q.currentUsage / (q.limit || 1)) * 100), 100);
                const isNearLimit = pct >= 80;
                return (
                  <div key={resKey} className="rounded-lg border border-neutral-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-neutral-700 capitalize">{resKey.replace('_', ' ')}</span>
                      <span className="font-mono text-neutral-600">
                        {q.currentUsage} / {q.limit >= 99999 ? '∞' : q.limit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isNearLimit ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan Tiers Switcher (Monthly / Annual) */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-neutral-900">Available Platform Plans</h4>
            <p className="text-xs text-neutral-500">Upgrade anytime as your transactions grow</p>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--erpfy-line-soft)] bg-neutral-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-3 py-1 transition-colors ${
                billingCycle === 'monthly' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`rounded-md px-3 py-1 transition-colors ${
                billingCycle === 'annual' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Annual (Save 17%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map((p) => {
            const isCurrent = subscription?.tier === p.id;
            const price = billingCycle === 'annual' ? Math.round(p.priceAnnual / 12) : p.priceMonthly;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-shadow ${
                  isCurrent
                    ? 'border-emerald-600 bg-white ring-2 ring-emerald-600/20 shadow-md'
                    : 'border-[var(--erpfy-line-soft)] bg-white hover:shadow-2xs'
                }`}
              >
                <div>
                  {p.badge && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      {p.badge}
                    </span>
                  )}
                  <h5 className="font-bold text-sm text-neutral-900">{p.name}</h5>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-neutral-900">${price}</span>
                    <span className="text-xs text-neutral-500">/mo</span>
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-500 leading-snug">{p.description}</p>

                  <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-[11px] text-neutral-600">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <ErpfyButton
                    tone={isCurrent ? 'secondary' : 'primary'}
                    disabled={isCurrent || upgradingTier === p.id}
                    onClick={() => handleUpgrade(p.id)}
                    className="w-full text-xs font-semibold py-1.5"
                  >
                    {isCurrent ? 'Current Plan' : upgradingTier === p.id ? 'Updating...' : 'Upgrade'}
                  </ErpfyButton>
                </div>
              </div>
            );
          })}
        </div>
      </ErpfyPanel>
    </div>
  );
}
