'use client';

import { useState, useEffect } from 'react';
import {
  Store,
  Sparkles,
  Shield,
  Search,
  CheckCircle2,
  Check,
  Save,
  ImageIcon,
  Monitor,
  Smartphone,
  MoreVertical,
} from 'lucide-react';
import type { EcommerceStore } from '@/lib/ecommerce/types';

export function OnlineStoreSettingsSection({
  companyId,
  companySlug,
}: {
  companyId?: string | null;
  companySlug?: string | null;
}) {
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [operatingMode, setOperatingMode] = useState<'unified' | 'store_only' | 'erp_only'>('unified');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [serpView, setSerpView] = useState<'desktop' | 'mobile'>('desktop');

  const [_isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch(`/api/ecommerce/store?companyId=${encodeURIComponent(companyId!)}`);
        if (res.ok && isMounted) {
          const sData = (await res.json()) as { store?: EcommerceStore };
          if (sData.store) {
            setStore(sData.store);
            setOperatingMode(sData.store.operatingMode || 'unified');
            setSeoTitle(sData.store.seoTitle || '');
            setSeoDescription(sData.store.seoDescription || '');
            setSeoKeywords(sData.store.seoKeywords || '');
            setOgImageUrl(sData.store.ogImageUrl || '');
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const slug = companySlug || store?.slug || 'asif';
  const siteName = store?.name || 'Online Store Online Store';
  const displayTitle = seoTitle || `${siteName} — Online Store`;
  const displayDesc =
    seoDescription ||
    'Shop authentic products online with fast delivery, secure checkout, and direct-from-warehouse inventory tracking.';

  const handleSaveSettings = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/ecommerce/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          operatingMode,
          seoTitle,
          seoDescription,
          seoKeywords,
          ogImageUrl,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Operating Mode Switcher — Borderless Clean Card */}
      <section className="rounded-2xl bg-white p-6 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--erpfy-ink-strong)]">
              Store Operating Mode
            </h3>
            <p className="mt-0.5 text-xs text-[var(--erpfy-ink-muted)]">
              Control whether this workspace runs an integrated online storefront, standalone store, or internal ERP only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--erpfy-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              <span className="size-1.5 rounded-full bg-[var(--erpfy-brand)] animate-pulse" />
              Active: {operatingMode === 'unified' ? 'Unified (Store + ERP)' : operatingMode === 'store_only' ? 'Store Only' : 'ERP Only'}
            </span>
          </div>
        </div>

        <div className="grid gap-4 pt-3 sm:grid-cols-3">
          {/* Unified Mode Card */}
          <button
            type="button"
            onClick={() => setOperatingMode('unified')}
            className={`group relative flex flex-col text-left rounded-2xl p-4.5 transition-all duration-200 cursor-pointer ${
              operatingMode === 'unified'
                ? 'bg-[var(--erpfy-brand-soft)]/50 ring-2 ring-[var(--erpfy-brand)] shadow-xs'
                : 'bg-neutral-50/90 hover:bg-neutral-100/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--erpfy-ink-strong)]">
                <div className={`p-1.5 rounded-lg ${operatingMode === 'unified' ? 'bg-[var(--erpfy-brand)] text-white' : 'bg-neutral-200/70 text-neutral-600'}`}>
                  <Sparkles className="size-3.5" />
                </div>
                <span>Unified (Store + ERP)</span>
              </div>
              {operatingMode === 'unified' ? (
                <CheckCircle2 className="size-4 text-[var(--erpfy-brand)]" />
              ) : (
                <div className="size-4 rounded-full border border-neutral-300 group-hover:border-neutral-400" />
              )}
            </div>
            <p className="mt-2.5 text-[11px] text-[var(--erpfy-ink-muted)] leading-relaxed flex-1">
              <strong>Recommended.</strong> Public storefront is open to customers. Orders automatically create sales records and reserve warehouse inventory.
            </p>
            <div className="mt-3 pt-2 text-[10px] font-semibold text-[var(--erpfy-brand)] flex items-center gap-1">
              <Check className="size-3" /> Full Multi-Channel Sync
            </div>
          </button>

          {/* Store Only Card */}
          <button
            type="button"
            onClick={() => setOperatingMode('store_only')}
            className={`group relative flex flex-col text-left rounded-2xl p-4.5 transition-all duration-200 cursor-pointer ${
              operatingMode === 'store_only'
                ? 'bg-[var(--erpfy-brand-soft)]/50 ring-2 ring-[var(--erpfy-brand)] shadow-xs'
                : 'bg-neutral-50/90 hover:bg-neutral-100/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--erpfy-ink-strong)]">
                <div className={`p-1.5 rounded-lg ${operatingMode === 'store_only' ? 'bg-[var(--erpfy-brand)] text-white' : 'bg-neutral-200/70 text-neutral-600'}`}>
                  <Store className="size-3.5" />
                </div>
                <span>Storefront Only</span>
              </div>
              {operatingMode === 'store_only' ? (
                <CheckCircle2 className="size-4 text-[var(--erpfy-brand)]" />
              ) : (
                <div className="size-4 rounded-full border border-neutral-300 group-hover:border-neutral-400" />
              )}
            </div>
            <p className="mt-2.5 text-[11px] text-[var(--erpfy-ink-muted)] leading-relaxed flex-1">
              Shopify-style streamlined experience. Hides complex ERP ledger and HR, focusing purely on catalog, online orders, and customer checkouts.
            </p>
            <div className="mt-3 pt-2 text-[10px] font-semibold text-neutral-600 flex items-center gap-1">
              <Check className="size-3" /> Retail Merchant Optimized
            </div>
          </button>

          {/* ERP Only Card */}
          <button
            type="button"
            onClick={() => setOperatingMode('erp_only')}
            className={`group relative flex flex-col text-left rounded-2xl p-4.5 transition-all duration-200 cursor-pointer ${
              operatingMode === 'erp_only'
                ? 'bg-[var(--erpfy-brand-soft)]/50 ring-2 ring-[var(--erpfy-brand)] shadow-xs'
                : 'bg-neutral-50/90 hover:bg-neutral-100/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--erpfy-ink-strong)]">
                <div className={`p-1.5 rounded-lg ${operatingMode === 'erp_only' ? 'bg-[var(--erpfy-brand)] text-white' : 'bg-neutral-200/70 text-neutral-600'}`}>
                  <Shield className="size-3.5" />
                </div>
                <span>ERP Only</span>
              </div>
              {operatingMode === 'erp_only' ? (
                <CheckCircle2 className="size-4 text-[var(--erpfy-brand)]" />
              ) : (
                <div className="size-4 rounded-full border border-neutral-300 group-hover:border-neutral-400" />
              )}
            </div>
            <p className="mt-2.5 text-[11px] text-[var(--erpfy-ink-muted)] leading-relaxed flex-1">
              For B2B, wholesale, and private distribution. Public customer storefront is kept private, directing focus to backend ERP business workflows.
            </p>
            <div className="mt-3 pt-2 text-[10px] font-semibold text-neutral-600 flex items-center gap-1">
              <Check className="size-3" /> Private Internal Operations
            </div>
          </button>
        </div>
      </section>

      {/* 2. SEO & Authentic Google SERP Listing Preview — Borderless Clean Card */}
      <section className="rounded-2xl bg-white p-6 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Search className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-[var(--erpfy-ink-strong)]">
                Search Engine Optimization (SEO)
              </h3>
              <p className="text-xs text-[var(--erpfy-ink-muted)]">
                Accurately preview and control how your store appears in Google organic search results.
              </p>
            </div>
          </div>

          {/* Desktop / Mobile Preview Viewport Toggle */}
          <div className="flex items-center rounded-xl bg-neutral-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSerpView('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                serpView === 'desktop'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Monitor className="size-3.5" />
              <span>Desktop View</span>
            </button>
            <button
              type="button"
              onClick={() => setSerpView('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                serpView === 'mobile'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Smartphone className="size-3.5" />
              <span>Mobile View</span>
            </button>
          </div>
        </div>

        {/* Real Google SERP Mockup Box — Borderless Background with Clean Inner Shadow */}
        <div className="my-5 rounded-2xl bg-[#f8f9fa] p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-neutral-700">Google Search Result Preview</span>
            </div>
            <span className="text-[11px] font-medium text-neutral-400 capitalize">{serpView} SERP Simulator</span>
          </div>

          {serpView === 'desktop' ? (
            /* --- Desktop Google SERP Result (Borderless Floating Card) --- */
            <div className="bg-white p-5 rounded-xl shadow-xs max-w-[652px] font-sans antialiased text-left">
              {/* Favicon & Breadcrumb URL Row */}
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-xs font-bold text-[#202124] shadow-2xs">
                  {siteName[0]?.toUpperCase() || 'E'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-[#202124] leading-tight truncate font-normal">
                    {siteName}
                  </span>
                  <div className="text-[12px] text-[#4d5156] leading-tight truncate flex items-center gap-1 font-normal pt-0.5">
                    <span>https://erpfy.net</span>
                    <span className="text-[10px] text-[#70757a]">›</span>
                    <span>store</span>
                    <span className="text-[10px] text-[#70757a]">›</span>
                    <span className="font-medium text-[#202124]">{slug}</span>
                  </div>
                </div>
                <div className="ml-auto text-[#70757a] hover:text-[#202124] cursor-pointer p-1">
                  <MoreVertical className="size-4" />
                </div>
              </div>

              {/* Classic Google Blue Title */}
              <h4 className="mt-2 text-[20px] font-normal leading-[1.3] text-[#1a0dab] hover:underline cursor-pointer line-clamp-1">
                {displayTitle}
              </h4>

              {/* Snippet Description */}
              <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156] line-clamp-2 font-normal">
                {displayDesc}
              </p>

              {/* Google Sitelinks Rich Preview */}
              <div className="mt-4 pt-3 border-t border-[#f1f3f4] grid grid-cols-2 gap-3 text-xs">
                <div className="group cursor-pointer">
                  <span className="text-[#1a0dab] font-normal group-hover:underline text-[13px] block">
                    Product Catalog & Offers
                  </span>
                  <span className="text-[#70757a] text-[11px] line-clamp-1">
                    Browse authentic items, latest arrivals, and best deals.
                  </span>
                </div>
                <div className="group cursor-pointer">
                  <span className="text-[#1a0dab] font-normal group-hover:underline text-[13px] block">
                    Customer Care & Delivery
                  </span>
                  <span className="text-[#70757a] text-[11px] line-clamp-1">
                    Fast tracked shipping, returns policy, and order tracking.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* --- Mobile Google SERP Result (Borderless Card) --- */
            <div className="bg-white p-5 rounded-2xl shadow-xs max-w-[380px] mx-auto font-sans antialiased text-left">
              {/* Favicon & Breadcrumb */}
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-xs font-bold text-[#202124]">
                  {siteName[0]?.toUpperCase() || 'E'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] text-[#202124] leading-tight truncate font-normal">
                    {siteName}
                  </span>
                  <span className="text-[11px] text-[#4d5156] leading-tight truncate">
                    https://erpfy.net › store › {slug}
                  </span>
                </div>
                <div className="ml-auto text-[#70757a]">
                  <MoreVertical className="size-3.5" />
                </div>
              </div>

              {/* Blue Title */}
              <h4 className="mt-2 text-[18px] font-normal leading-[1.3] text-[#1a0dab] hover:underline cursor-pointer line-clamp-2">
                {displayTitle}
              </h4>

              {/* Description */}
              <p className="mt-1 text-[13px] leading-[1.5] text-[#4d5156] line-clamp-3 font-normal">
                {displayDesc}
              </p>
            </div>
          )}
        </div>

        {/* Form Fields for Editing Metadata */}
        <div className="space-y-4 pt-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="seo-page-title" className="font-semibold text-[var(--erpfy-ink-strong)]">
                Page Title (Meta Title)
              </label>
              <span
                className={`text-[11px] font-medium ${
                  seoTitle.length > 60 ? 'text-amber-600 font-bold' : 'text-neutral-400'
                }`}
              >
                {seoTitle.length}/60 characters recommended
              </span>
            </div>
            <input
              id="seo-page-title"
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={`${siteName} — Online Store`}
              className="w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs text-[var(--erpfy-ink-strong)] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[var(--erpfy-brand)]/20 focus:outline-hidden transition-all border border-neutral-200/80"
            />
            <p className="mt-1 text-[11px] text-[var(--erpfy-ink-muted)]">
              This headline is displayed in Google search results and browser title tabs.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="seo-meta-description" className="font-semibold text-[var(--erpfy-ink-strong)]">
                Meta Description
              </label>
              <span
                className={`text-[11px] font-medium ${
                  seoDescription.length > 160 ? 'text-amber-600 font-bold' : 'text-neutral-400'
                }`}
              >
                {seoDescription.length}/160 characters recommended
              </span>
            </div>
            <textarea
              id="seo-meta-description"
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Shop authentic products online with fast delivery, secure checkout, and direct-from-warehouse inventory tracking."
              className="w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs text-[var(--erpfy-ink-strong)] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[var(--erpfy-brand)]/20 focus:outline-hidden transition-all resize-none border border-neutral-200/80"
            />
            <p className="mt-1 text-[11px] text-[var(--erpfy-ink-muted)]">
              Displayed as the snippet summary below the title on Google and on WhatsApp link previews.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seo-keywords" className="block text-xs font-semibold text-[var(--erpfy-ink-strong)] mb-1.5">
                Keywords & Tags
              </label>
              <input
                id="seo-keywords"
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="agro, seeds, fertilizer, machinery, retail"
                className="w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs text-[var(--erpfy-ink-strong)] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[var(--erpfy-brand)]/20 focus:outline-hidden transition-all border border-neutral-200/80"
              />
              <p className="mt-1 text-[11px] text-[var(--erpfy-ink-muted)]">
                Separate search keywords with commas.
              </p>
            </div>

            <div>
              <label htmlFor="seo-og-image" className="block text-xs font-semibold text-[var(--erpfy-ink-strong)] mb-1.5">
                Social Sharing Image URL (OpenGraph)
              </label>
              <div className="relative">
                <input
                  id="seo-og-image"
                  type="url"
                  value={ogImageUrl}
                  onChange={(e) => setOgImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl bg-neutral-50 pl-9 pr-3.5 py-2.5 text-xs text-[var(--erpfy-ink-strong)] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[var(--erpfy-brand)]/20 focus:outline-hidden transition-all border border-neutral-200/80"
                />
                <ImageIcon className="absolute left-3 top-3 size-3.5 text-neutral-400" />
              </div>
              <p className="mt-1 text-[11px] text-[var(--erpfy-ink-muted)]">
                Image shown when sharing your link on WhatsApp, Facebook, or iMessage (1200×630 recommended).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2 text-xs">
              {saveSuccess ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full animate-in fade-in duration-200">
                  <Check className="size-3.5" />
                  Settings saved successfully!
                </span>
              ) : (
                <span className="text-neutral-400 text-[11px]">
                  All updates take effect immediately on your live storefront and Google metadata.
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSettings}
              className="primary-button inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 border-0 shadow-xs"
            >
              <Save className="size-3.5" />
              {isSaving ? 'Saving...' : 'Save SEO & Operating Mode'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
