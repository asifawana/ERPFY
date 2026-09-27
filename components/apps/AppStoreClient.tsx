'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Star,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ErpfyButton } from '@/lib/design-system';
import { ManagePluginModal } from './ManagePluginModal';

const HERO_BRAND = 'var(--erpfy-brand)';

const CATEGORIES = [
  'All',
  'Featured',
  'Private',
  'Sales',
  'Shipping',
  'Accounting',
  'CRM',
  'Marketing',
  'Inventory',
];

interface AppDependency {
  app_id: string;
  version?: string;
  version_range?: string;
  required?: boolean;
}

interface AppNavigationItem {
  id?: string;
  label?: string;
  href?: string;
}

interface AppData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  appType: string;
  isPrivate?: boolean;
  isFirstParty?: boolean;
  iconUrl: string;
  pricingModel: string;
  priceCents: number;
  currency: string;
  isFeatured: boolean;
  isKilled: boolean;
  killReason?: string;
  ratingAverage: number | null;
  ratingCount: number;
  installedCount: number;
  publishedAt: string;
  developer: {
    id: string;
    name: string;
    verified: boolean;
  };
  latestVersion: {
    version: string;
    protocol: string;
    releaseDate: string;
    changelog: string;
    packageHash: string;
    isSigned: boolean;
    requiredScopes: string[];
    optionalScopes: string[];
    dependencies?: AppDependency[];
    navigation?: AppNavigationItem[] | null;
  } | null;
  installation: {
    isInstalled: boolean;
    version: string | null;
    enabled: boolean;
    installedAt: string | null;
  };
}

export function AppStoreClient({
  companyId,
  companyName,
  companyRole: _companyRole,
  companySlug,
}: {
  companyId?: string | null;
  companyName?: string | null;
  companyRole?: string | null;
  companySlug?: string | null;
  canUploadPrivate?: boolean;
} = {}) {
  const router = useRouter();
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [installingApp, setInstallingApp] = useState<AppData | null>(null);
  const [inspectingApp, setInspectingApp] = useState<AppData | null>(null);
  const [managingApp, setManagingApp] = useState<AppData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function refreshWorkspaceNavigation() {
    window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
    router.refresh();
  }

  const loadApps = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (companyId) {
        params.set('companyId', companyId);
      }
      if (activeCategory === 'Featured') {
        params.set('featured', 'true');
      } else if (activeCategory === 'Private') {
        params.set('category', 'Private');
      } else if (activeCategory !== 'All') {
        params.set('category', activeCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/apps/store?${params.toString()}`);
      if (!res.ok) {
        throw new Error('The app catalog could not be loaded. Please retry.');
      }
      const data = (await res.json()) as { apps?: AppData[] };
      if (!Array.isArray(data.apps)) {
        throw new Error('The app catalog could not be loaded. Please retry.');
      }
      setApps(data.apps);
    } catch (err) {
      console.error('Failed to load apps:', err);
      setApps([]);
      setLoadError('The app catalog could not be loaded. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery, companyId]);

  useEffect(() => {
    const animId = requestAnimationFrame(() => {
      void loadApps();
    });
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [loadApps]);

  // Dismiss overlays and drawers on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (inspectingApp) setInspectingApp(null);
        if (installingApp) setInstallingApp(null);
        if (managingApp) setManagingApp(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingApp, installingApp, managingApp]);

  const inspectingAppNav =
    inspectingApp?.latestVersion?.navigation && inspectingApp.latestVersion.navigation.length > 0
      ? inspectingApp.latestVersion.navigation[0]
      : null;
  let inspectingAppOpenHref = inspectingAppNav?.href || null;
  if (inspectingAppOpenHref) {
    const slug =
      companySlug ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('company')
        : '') ||
      '';
    if (slug) {
      inspectingAppOpenHref = inspectingAppOpenHref.replace(/:companySlug/g, encodeURIComponent(slug));
    }
  }

  async function handleConfirmInstall() {
    if (!installingApp) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          appId: installingApp.id,
          companyId,
          targetVersion: installingApp.latestVersion?.version,
          grantedScopes: installingApp.latestVersion?.requiredScopes || [],
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        refreshWorkspaceNavigation();
        setInstallingApp(null);
        setErrorMessage(null);
        await loadApps();
      } else {
        setErrorMessage(data.error || 'Failed to install app');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Installation error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleApp(app: AppData) {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          appId: app.id,
          companyId,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        refreshWorkspaceNavigation();
        await loadApps();
        if (inspectingApp?.id === app.id) {
          setInspectingApp((prev) =>
            prev
              ? {
                  ...prev,
                  installation: {
                    ...prev.installation,
                    enabled: !prev.installation.enabled,
                  },
                }
              : null,
          );
        }
      } else {
        setErrorMessage(data.error || 'Failed to toggle app status');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Toggle status error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUninstall(appId: string) {
    if (
      !confirm(
        'Are you sure you want to uninstall this app? Its features will be deactivated on this tenant.',
      )
    )
      return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uninstall',
          appId,
          companyId,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        refreshWorkspaceNavigation();
        setInspectingApp(null);
        setManagingApp(null);
        setErrorMessage(null);
        await loadApps();
      } else {
        setErrorMessage(data.error || 'Failed to uninstall app');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Uninstall error');
    } finally {
      setActionLoading(false);
    }
  }

  const featuredApps = apps.filter((a) => a.isFeatured);
  const otherApps = apps.filter((a) => !a.isFeatured);

  return (
    <div>
      {/* Title & Header Action Area */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-tight text-[#111827]">
            App Store
          </h1>
          <p className="mt-1 text-sm text-[#4B5563]">
            Browse and install published apps for this workspace.
          </p>
        </div>
      </div>

      {/* Hero Banner */}
      <section
        className="mb-6 rounded-2xl px-6 py-8 text-white shadow-xs md:px-10 md:py-10"
        style={{ background: HERO_BRAND }}
      >
        <h2 className="text-[28px] font-bold leading-9 tracking-tight md:text-[32px]">
          Extend Your ERPFY Platform
        </h2>
        <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-white/90">
          Browse and install published apps for your business. Review each app&apos;s
          release details and requested permissions before installing it for your company.
        </p>
      </section>

      {/* Category Chips and Search */}
      <div className="mb-7 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
            className={
              activeCategory === category
                ? 'rounded-full bg-[var(--erpfy-brand)] px-4 py-1.5 text-xs font-semibold text-white shadow-xs'
                : 'rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-xs font-medium text-[#4B5563] shadow-xs transition-colors hover:bg-[#F9FAFB]'
            }
          >
            {category}
          </button>
        ))}

        <span className="relative ml-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search published apps and private plugins..."
            aria-label="Search apps"
            className="w-[280px] max-w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-xs text-[#111827] shadow-xs placeholder-[#9CA3AF] outline-hidden focus:border-[var(--erpfy-brand)]"
          />
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--erpfy-ink-muted)]" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
          <AlertCircle className="mx-auto size-8 text-[var(--erpfy-ink-muted)]" aria-hidden />
          <h3 className="mt-2 text-sm font-semibold text-[#111827]">Catalog unavailable</h3>
          <p className="mt-1 text-xs text-[#6B7280]">{loadError}</p>
          <ErpfyButton tone="secondary" className="mt-4" onClick={() => { void loadApps(); }}>Retry</ErpfyButton>
        </div>
      ) : (
        <>
          {/* Featured Apps Row */}
          {featuredApps.length > 0 && activeCategory !== 'Private' && (
            <section className="mb-8">
              <h2 className="mb-4 text-[18px] font-bold tracking-tight text-[#111827] flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--erpfy-brand)]" />
                Featured Apps & Integrations
              </h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {featuredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    companySlug={companySlug}
                    onInstall={() => setInstallingApp(app)}
                    onInspect={() => setInspectingApp(app)}
                    onManage={() => setManagingApp(app)}
                    onToggle={() => handleToggleApp(app)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Popular / Filtered Apps Row */}
          {otherApps.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-[18px] font-bold tracking-tight text-[#111827]">
                {activeCategory === 'All'
                  ? 'Popular Apps & Plugins'
                  : `${activeCategory} ${activeCategory === 'Private' ? 'Plugins' : 'Apps'}`}
              </h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {otherApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    companySlug={companySlug}
                    onInstall={() => setInstallingApp(app)}
                    onInspect={() => setInspectingApp(app)}
                    onManage={() => setManagingApp(app)}
                    onToggle={() => handleToggleApp(app)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State (Requirement 22) */}
          {apps.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
              <AlertCircle className="mx-auto size-8 text-[#9CA3AF]" aria-hidden />
              <h3 className="mt-2 text-sm font-semibold text-[#111827]">
                {activeCategory === 'Private'
                  ? 'No private plugins installed yet'
                  : 'No published apps found'}
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                {activeCategory === 'Private'
                  ? 'No private plugins installed for this workspace.'
                  : 'Try selecting another category or clear your search query.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Manage Installed Plugin Modal */}
      <ManagePluginModal
        isOpen={Boolean(managingApp)}
        onClose={() => setManagingApp(null)}
        app={managingApp}
        companyId={companyId}
        companyName={companyName}
        onUpdated={() => {
          void loadApps();
          refreshWorkspaceNavigation();
        }}
      />

      {/* Public App Install Confirmation Modal */}
      {installingApp && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setInstallingApp(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <h3 className="text-base font-bold text-[#111827]">
                Install {installingApp.name}
              </h3>
              <button
                type="button"
                onClick={() => setInstallingApp(null)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-[var(--erpfy-status-neutral-bg)] p-3.5 text-[var(--erpfy-status-neutral-ink)] border border-[var(--erpfy-line)]">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="size-4" />
                  Release details and permissions
                </div>
                <p className="mt-1">
                  {installingApp.latestVersion?.isSigned
                    ? 'This release includes a verified release signature. Permissions are granted strictly on install.'
                    : 'No release signature is available. Installation requires an approved release with valid signing information.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px]">
                  Permissions Requested:
                </h4>
                <div className="mt-2 space-y-1.5 rounded-lg border border-[#E5E7EB] p-3 bg-[#F9FAFB]">
                  {installingApp.latestVersion?.requiredScopes && installingApp.latestVersion.requiredScopes.length > 0 ? (
                    installingApp.latestVersion.requiredScopes.map((scope) => (
                      <div key={scope} className="flex items-center gap-2 font-mono text-[11px] text-[#374151]">
                        <CheckCircle className="size-3.5 text-[#10B981]" />
                        <span>{scope}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#6B7280]">No elevated data access scopes required.</p>
                  )}
                </div>
              </div>

              {installingApp.latestVersion?.dependencies &&
                installingApp.latestVersion.dependencies.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px]">
                      Dependencies Required:
                    </h4>
                    <div className="mt-2 space-y-1 rounded-lg border border-[#E5E7EB] p-3 bg-[#F9FAFB]">
                      {installingApp.latestVersion.dependencies.map((dep: AppDependency) => (
                        <div
                          key={dep.app_id}
                          className="flex items-center gap-2 font-mono text-[11px] text-[#374151]"
                        >
                          <span className="size-1.5 rounded-full bg-[var(--erpfy-brand)]" />
                          <span>
                            {dep.app_id} ({dep.version_range || 'latest'})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {errorMessage && (
                <div className="rounded-lg bg-[#FEE2E2] p-3 text-[#DC2626] border border-[#FECACA] flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium text-xs">{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#E5E7EB] pt-4">
              <ErpfyButton
                tone="secondary"
                onClick={() => setInstallingApp(null)}
                disabled={actionLoading || !installingApp.latestVersion}
              >
                Cancel
              </ErpfyButton>
              <ErpfyButton
                tone="primary"
                onClick={handleConfirmInstall}
                disabled={actionLoading}
              >
                {actionLoading ? 'Installing App...' : 'Authorize & Install'}
              </ErpfyButton>
            </div>
          </div>
        </div>
      )}

      {/* App Details Drawer */}
      {inspectingApp && (
        <div
          className="fixed inset-x-0 bottom-0 top-[56px] z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setInspectingApp(null)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4 bg-white shrink-0">
              <h3 className="text-base font-bold text-[#111827]">App Details</h3>
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-[#4B5563]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#111827] text-sm">{inspectingApp.name}</span>
                  {(inspectingApp.isFirstParty || inspectingApp.appType === 'first_party' || inspectingApp.isFeatured || inspectingApp.id === 'erpfy.contacts_crm') ? (
                    <span className="rounded-md bg-[var(--erpfy-brand-soft,#DCFCE7)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-brand,#15803D)]">
                      Foundation
                    </span>
                  ) : inspectingApp.appType === 'private' ? (
                    <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                      Private
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[#6B7280]">{inspectingApp.description || inspectingApp.tagline}</p>
              </div>

              {inspectingApp.installation.isInstalled && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#111827]">Company Installation</span>
                      <p className="text-[11px] text-[#6B7280]">
                        Installed v{inspectingApp.installation.version}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleApp(inspectingApp)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        inspectingApp.installation.enabled
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#9CA3AF] text-white'
                      }`}
                    >
                      {inspectingApp.installation.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#6B7280]">
                  Release Information
                </h4>
                <div className="mt-2 space-y-2 rounded-xl border border-[#E5E7EB] p-3.5 bg-[#F9FAFB]">
                  <div className="flex justify-between">
                    <span>Publisher:</span>
                    <span className="font-semibold text-[#111827]">
                      {(inspectingApp.isFirstParty || inspectingApp.appType === 'first_party' || inspectingApp.isFeatured || inspectingApp.id === 'erpfy.contacts_crm')
                        ? 'ERPFY'
                        : (inspectingApp.developer?.name || 'Private Tenant Apps').replace(/\s*\([a-f0-9-]{8,}\)/i, '')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protocol:</span>
                    <span className="font-semibold text-[#111827]">{inspectingApp.latestVersion?.protocol || 'Unavailable'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Release Signature:</span>
                    <span className="font-semibold text-[#111827]">
                      {inspectingApp.latestVersion?.isSigned ? 'Verified' : 'Unsigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#E5E7EB] p-6 bg-[#F9FAFB] shrink-0">
              {!inspectingApp.installation.isInstalled ? (
                <ErpfyButton
                  tone="primary"
                  disabled={!inspectingApp.latestVersion || inspectingApp.isKilled}
                  onClick={() => {
                    const target = inspectingApp;
                    setInspectingApp(null);
                    setInstallingApp(target);
                  }}
                  className="w-full justify-center"
                >
                  Install App
                </ErpfyButton>
              ) : (
                <div className="flex items-center gap-3">
                  {inspectingAppOpenHref && inspectingApp.installation.enabled && (
                    <Link
                      href={inspectingAppOpenHref}
                      onClick={() => setInspectingApp(null)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--erpfy-brand-soft,#DCFCE7)] py-2.5 text-xs font-bold text-[var(--erpfy-brand,#15803D)] hover:bg-[#BBF7D0] transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink className="size-3.5" />
                    </Link>
                  )}
                  <ErpfyButton
                    tone="primary"
                    onClick={() => {
                      const target = inspectingApp;
                      setInspectingApp(null);
                      setManagingApp(target);
                    }}
                    className="flex-1 justify-center py-2.5 text-xs font-bold"
                  >
                    Manage Installation
                  </ErpfyButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppCard({
  app,
  companySlug,
  onInstall,
  onInspect,
  onManage,
  onToggle: _onToggle,
}: {
  app: AppData;
  companySlug?: string | null;
  onInstall: () => void;
  onInspect: () => void;
  onManage: () => void;
  onToggle: () => void;
}) {
  const isFirstParty = Boolean(
    app.isFirstParty ||
    app.appType === 'first_party' ||
    app.isFeatured ||
    app.id === 'erpfy.contacts_crm' ||
    app.developer?.name === 'ERPFY',
  );
  const isPrivate = !isFirstParty && (app.appType === 'private' || app.isPrivate);
  const isInstalled = app.installation.isInstalled;
  const isEnabled = app.installation.enabled;

  // Determine valid default navigation route if available
  const navItem = app.latestVersion?.navigation && app.latestVersion.navigation.length > 0
    ? app.latestVersion.navigation[0]
    : null;
  let openHref = navItem?.href || null;
  if (openHref) {
    const slug =
      companySlug ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('company')
        : '') ||
      '';
    if (slug) {
      openHref = openHref.replace(/:companySlug/g, encodeURIComponent(slug));
    }
  }

  return (
    <article className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div>
        <div className="flex items-start gap-3.5">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-xs"
            style={{ background: HERO_BRAND }}
            aria-hidden
          >
            {app.name.substring(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isInstalled ? onManage : onInspect}
                className="text-left cursor-pointer truncate text-[15px] font-bold leading-5 text-[#111827] hover:text-[var(--erpfy-brand)] block"
              >
                {app.name}
              </button>
              {isFirstParty ? (
                <span className="rounded-md bg-[var(--erpfy-brand-soft,#DCFCE7)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-brand,#15803D)] shrink-0">
                  Foundation
                </span>
              ) : isPrivate ? (
                <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309] shrink-0">
                  Private
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
              by {isFirstParty ? 'ERPFY' : (app.developer?.name || 'Private Tenant Apps').replace(/\s*\([a-f0-9-]{8,}\)/i, '')}
            </p>
          </div>
        </div>
        <p className="mt-3.5 text-[13px] leading-relaxed text-[#4B5563] line-clamp-2">
          {app.tagline || app.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#F3F4F6] pt-4">
        <div className="flex items-center gap-2">
          {app.ratingAverage !== null && app.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#111827]">
              <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden />
              {app.ratingAverage.toFixed(1)}
            </span>
          ) : (
            <span className="text-xs text-[#6B7280]">
              {isFirstParty ? 'Foundation App' : isPrivate ? 'Private plugin' : 'Reviews unavailable'}
            </span>
          )}
          <span className="text-xs text-[#9CA3AF]">·</span>
          <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#4B5563]">
            {app.category}
          </span>
        </div>

        {app.isKilled ? (
          <span className="rounded-lg bg-[#FEE2E2] px-3 py-1 text-xs font-bold text-[#DC2626]">
            REVOKED
          </span>
        ) : isInstalled ? (
          <div className="flex items-center gap-1.5">
            {!isEnabled && (
              <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#6B7280]">
                Disabled
              </span>
            )}
            {/* Open button if navigation target exists and enabled (Requirement 14) */}
            {openHref && isEnabled && (
              <Link
                href={openHref}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--erpfy-brand-soft,#DCFCE7)] px-2.5 py-1.5 text-xs font-semibold text-[var(--erpfy-brand,#15803D)] hover:bg-[#BBF7D0] transition-colors"
              >
                <span>Open</span>
                <ExternalLink className="size-3" />
              </Link>
            )}
            {/* Manage button (Requirement 10 & 15) */}
            <button
              type="button"
              onClick={onManage}
              className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              Manage
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            disabled={!app.latestVersion}
            className="rounded-lg bg-[var(--erpfy-brand)] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {app.latestVersion ? 'Install' : 'No release'}
          </button>
        )}
      </div>
    </article>
  );
}
