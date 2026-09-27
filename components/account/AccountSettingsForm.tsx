'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  AppWindow,
  Archive,
  BadgeCheck,
  Braces,
  Building2,
  CalendarDays,
  CircleAlert,
  CloudBackup,
  CreditCard,
  Database,
  FileText,
  Hash,
  Languages,
  Laptop,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  MonitorCog,
  Palette,
  PanelLeft,
  Package,
  Pill,
  Printer,
  ReceiptText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Table2,
  Upload,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type {
  AccountPreferences,
  AccountProfile,
  CompanyContext,
} from '@/lib/core/page-data';
import { useAccountSettings } from '@/lib/account-system-settings';
import { validateAndCompress } from '@/lib/utils/compress-image';
import {
  ErpfyButton,
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
  ErpfyReleaseTag,
  ErpfySelect,
} from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { AccountOverlay } from './AccountOverlay';
import { SystemSettingsPanel } from './SystemSettingsPanel';
import { SalesSettingsPanels } from './settings/SalesSettingsPanels';
import { PosSettingsPanels } from './settings/PosSettingsPanels';
import { IntegrationSettingsPanels } from './settings/IntegrationSettingsPanels';
import { AppearanceSettingsPanel } from './settings/AppearanceSettingsPanel';
import { DynamicPluginSettingsPanel } from './settings/DynamicPluginSettingsPanel';
import type { DynamicPluginSettingsSection } from '@/lib/settings/plugin-settings';
import { getSettingsMetadata, type SettingsRegistryItem } from '@/lib/settings/registry';

type SettingsItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  live?: boolean;
  metadata?: SettingsRegistryItem;
};

type SettingsGroup = {
  label: string | null;
  items: SettingsItem[];
};

const CORE_SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: null,
    items: [
      { id: 'general', label: 'General', icon: Building2, live: true },
      {
        id: 'localization',
        label: 'Localization',
        icon: Languages,
        live: true,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        live: true,
      },
      {
        id: 'modules',
        label: 'Apps & Modules',
        icon: AppWindow,
        live: true,
      },
      {
        id: 'sidebar-menu',
        label: 'Sidebar Menu',
        icon: PanelLeft,
        live: true,
      },
      { id: 'datatable', label: 'DataTable', icon: Table2, live: true },
      { id: 'export', label: 'Export', icon: Upload, live: true },
      { id: 'security', label: 'Security', icon: ShieldCheck, live: true },
      { id: 'backup', label: 'Backup', icon: CloudBackup, live: true },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench, live: true },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, live: true },
      { id: 'subscription', label: 'Subscription & Plans', icon: CreditCard, live: true },
      { id: 'webhooks', label: 'Webhooks & API', icon: Zap, live: true },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette, live: true },
      { id: 'pwa', label: 'PWA', icon: AppWindow, live: true },
      { id: 'mobile-app', label: 'Mobile App', icon: Smartphone, live: true },
      { id: 'mail', label: 'Mail', icon: Mail, live: true },
      { id: 'sms', label: 'SMS', icon: MessageSquareText, live: true },
      {
        id: 'payment-gateway',
        label: 'Payment Gateway',
        icon: CreditCard,
        live: true,
      },
      { id: 'custom-fields', label: 'Custom Fields', icon: Braces, live: true },
      {
        id: 'backup-archives',
        label: 'Backup archives',
        icon: Archive,
        live: true,
      },
      { id: 'login-devices', label: 'Login Devices', icon: Laptop, live: true },
    ],
  },
];

const SYSTEM_SECTION_IDS = new Set([
  'dashboard',
  'modules',
  'sidebar-menu',
  'datatable',
  'export',
  'security',
  'backup',
  'maintenance',
  'demo-data',
  'calendar',
  'subscription',
  'webhooks',
]);

const SALES_SECTION_IDS = new Set([
  'sales-defaults',
  'sales-features',
  'prefixes',
  'invoice-pdf',
  'pharmacy',
]);

const POS_SECTION_IDS = new Set([
  'pos-settings',
  'pos-receipt',
  'network-printing',
]);

const INTEGRATION_SECTION_IDS = new Set([
  'appearance',
  'pwa',
  'mobile-app',
  'mail',
  'sms',
  'payment-gateway',
  'zatca',
  'custom-fields',
  'backup-archives',
  'login-devices',
]);

const TIMEZONES = [
  'UTC',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
];

const LANGUAGE_OPTIONS = [
  ['en', 'English'],
  ['ur', 'Urdu'],
  ['ar', 'Arabic'],
  ['fr', 'Français'],
  ['tr', 'Turkish'],
  ['th', 'Thai'],
  ['hi', 'Hindi'],
  ['de', 'German'],
  ['es', 'Spanish'],
] as const;

const CURRENCY_OPTIONS = [
  ['PKR', 'Pakistani Rupee (PKR)'],
  ['USD', 'US Dollar (USD)'],
  ['AED', 'United Arab Emirates Dirham (AED)'],
  ['SAR', 'Saudi Riyal (SAR)'],
  ['GBP', 'British Pound (GBP)'],
  ['EUR', 'Euro (EUR)'],
  ['INR', 'Indian Rupee (INR)'],
  ['BDT', 'Bangladeshi Taka (BDT)'],
] as const;

const TIMEZONE_OFFSETS: Record<string, string> = {
  UTC: '+00:00',
  'Asia/Karachi': '+05:00',
  'Asia/Dubai': '+04:00',
  'Asia/Kolkata': '+05:30',
  'Asia/Dhaka': '+06:00',
  'Europe/London': '+00:00',
  'Europe/Paris': '+01:00',
  'America/New_York': '-05:00',
  'America/Chicago': '-06:00',
  'America/Los_Angeles': '-08:00',
  'Australia/Sydney': '+10:00',
};

function timezoneLabel(value: string): string {
  return `UTC/GMT ${TIMEZONE_OFFSETS[value] ?? ''} - ${value}`;
}

export function AccountSettingsForm({
  profile,
  preferences: initialPreferences,
  company,
  initialSection,
}: {
  profile: AccountProfile;
  preferences: AccountPreferences;
  /** The ERP whose business settings this surface edits. Null when the account has none. */
  company: CompanyContext | null;
  initialSection?: string;
}) {
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get('tab');
  const [currentUrlTab, setCurrentUrlTab] = useState(urlTab);
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);

  if (urlTab !== currentUrlTab) {
    setCurrentUrlTab(urlTab);
    setSectionOverride(null);
  }

  const section = sectionOverride ?? urlTab ?? initialSection ?? 'general';
  const setSection = useCallback((val: string) => {
    setSectionOverride(val);
  }, []);
  const [query, setQuery] = useState('');
  const [displayName, setDisplayName] = useState(profile.displayName);
  const timezone = profile.timezone || 'UTC';
  const [preferences, setPreferences] = useState(initialPreferences);
  const {
    settings: storedSystemSettings,
    company: settingsCompany,
    save: persistSettings,
  } = useAccountSettings(company?.id ?? null);
  const [draftSettings, setDraftSettings] = useState<
    typeof storedSystemSettings | null
  >(null);
  const systemSettings = draftSettings ?? storedSystemSettings;
  const setSystemSettings = (
    updater:
      | typeof storedSystemSettings
      | ((prev: typeof storedSystemSettings) => typeof storedSystemSettings),
  ) => {
    setDraftSettings((prev) => {
      const base = prev ?? storedSystemSettings;
      return typeof updater === 'function' ? updater(base) : updater;
    });
  };
  const [saving, setSaving] = useState(false);
  const [compressingLogo, setCompressingLogo] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'critical';
    text: string;
  } | null>(null);

  const [pluginSettings, setPluginSettings] = useState<DynamicPluginSettingsSection[]>([]);
  const [installedSlugs, setInstalledSlugs] = useState<string[]>([]);

  const refreshPluginSettings = useCallback(() => {
    if (!company?.id) return;
    fetch(`/api/settings/plugins?companyId=${encodeURIComponent(company.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((raw: unknown) => {
        const data = raw as {
          pluginSettings?: DynamicPluginSettingsSection[];
          installedSlugs?: string[];
        } | null;
        if (data?.pluginSettings && Array.isArray(data.pluginSettings)) {
          setPluginSettings(data.pluginSettings);
        }
        if (data?.installedSlugs && Array.isArray(data.installedSlugs)) {
          setInstalledSlugs(data.installedSlugs);
        }
      })
      .catch(() => {});
  }, [company]);

  useEffect(() => {
    refreshPluginSettings();

    const onAppsChanged = () => {
      refreshPluginSettings();
    };
    window.addEventListener('erpfy:apps-changed', onAppsChanged);
    window.addEventListener('erpfy:settings-changed', onAppsChanged);

    return () => {
      window.removeEventListener('erpfy:apps-changed', onAppsChanged);
      window.removeEventListener('erpfy:settings-changed', onAppsChanged);
    };
  }, [refreshPluginSettings]);

  const dynamicPluginItems: SettingsItem[] = useMemo(() => {
    return pluginSettings
      .filter((p) => !p.isOverlappingWithLegacy)
      .map((p) => ({
        id: p.tabId,
        label: p.label,
        icon: Package,
        live: true,
        metadata: {
          id: p.tabId,
          label: p.label,
          group: 'Installed Plugins',
          currentRoute: `/account/settings?tab=${p.tabId}`,
          tabId: p.tabId,
          ownershipType: 'PLUGIN_OWNED',
          owningCapability: p.pluginSlug,
          scope: 'company',
          adminOnly: false,
          developerOnly: false,
          currentVisibility: 'company_context',
          futureDynamicEligible: true,
          order: 100,
          compatibilityNotes: `Dynamically contributed settings by ${p.pluginName} (v${p.version}).`,
        },
      }));
  }, [pluginSettings]);

  const allSettingsGroups: SettingsGroup[] = useMemo(() => {
    const groups: SettingsGroup[] = CORE_SETTINGS_GROUPS.map((group) => {
      if (group.label === 'System' && section === 'demo-data') {
        return {
          ...group,
          items: [
            ...group.items.map((item) => ({ ...item, metadata: getSettingsMetadata(item.id) })),
            {
              id: 'demo-data',
              label: 'Demo Data',
              icon: Database,
              live: true,
              metadata: getSettingsMetadata('demo-data'),
            },
          ],
        };
      }
      if (group.label === 'Integrations') {
        const hasZatca =
          installedSlugs.some((s) => s === 'erpfy.l10n_sa' || s === 'zatca') ||
          section === 'zatca';
        const items = group.items.map((item) => ({ ...item, metadata: getSettingsMetadata(item.id) }));
        if (hasZatca) {
          items.splice(items.length - 2, 0, {
            id: 'zatca',
            label: 'ZATCA E-Invoicing',
            icon: BadgeCheck,
            live: true,
            metadata: getSettingsMetadata('zatca'),
          });
        }
        return {
          ...group,
          items,
        };
      }
      return {
        ...group,
        items: group.items.map((item) => ({
          ...item,
          metadata: getSettingsMetadata(item.id),
        })),
      };
    });

    // Sales capability group (only when installed or active)
    const hasSales =
      installedSlugs.some((s) => s === 'erpfy.sales' || s === 'sales') ||
      section.startsWith('sales-') ||
      section === 'prefixes' ||
      section === 'invoice-pdf' ||
      section === 'pharmacy';

    if (hasSales) {
      const salesItems: SettingsItem[] = [
        { id: 'sales-defaults', label: 'Defaults', icon: SlidersHorizontal, live: true, metadata: getSettingsMetadata('sales-defaults') },
        { id: 'sales-features', label: 'Features', icon: Sparkles, live: true, metadata: getSettingsMetadata('sales-features') },
        { id: 'prefixes', label: 'Prefixes', icon: Hash, live: true, metadata: getSettingsMetadata('prefixes') },
        { id: 'invoice-pdf', label: 'Invoice PDF', icon: FileText, live: true, metadata: getSettingsMetadata('invoice-pdf') },
      ];
      const hasPharmacy =
        installedSlugs.some((s) => s === 'erpfy.pharmacy' || s === 'pharmacy') ||
        section === 'pharmacy';
      if (hasPharmacy) {
        salesItems.push({
          id: 'pharmacy',
          label: 'Pharmacy',
          icon: Pill,
          live: true,
          metadata: getSettingsMetadata('pharmacy'),
        });
      }
      groups.splice(1, 0, {
        label: 'Sales',
        items: salesItems,
      });
    }

    // POS capability group (only when installed or active)
    const hasPos =
      installedSlugs.some((s) => s === 'erpfy.pos' || s === 'pos') ||
      section.startsWith('pos-') ||
      section === 'network-printing';

    if (hasPos) {
      const posItems: SettingsItem[] = [
        { id: 'pos-settings', label: 'POS Settings', icon: MonitorCog, live: true, metadata: getSettingsMetadata('pos-settings') },
        { id: 'pos-receipt', label: 'POS Receipt', icon: ReceiptText, live: true, metadata: getSettingsMetadata('pos-receipt') },
        { id: 'network-printing', label: 'Direct Network Printing', icon: Printer, live: true, metadata: getSettingsMetadata('network-printing') },
      ];
      const integrationsIdx = groups.findIndex((g) => g.label === 'Integrations');
      if (integrationsIdx >= 0) {
        groups.splice(integrationsIdx, 0, { label: 'POS', items: posItems });
      } else {
        groups.push({ label: 'POS', items: posItems });
      }
    }

    // Installed dynamic plugins
    if (dynamicPluginItems.length > 0) {
      groups.push({
        label: 'Installed Plugins',
        items: dynamicPluginItems,
      });
    }

    return groups;
  }, [dynamicPluginItems, installedSlugs, section]);

  const active = useMemo(
    () =>
      allSettingsGroups.flatMap((group) => group.items).find(
        (item) => item.id === section,
      ) ?? allSettingsGroups[0].items[0],
    [allSettingsGroups, section],
  );

  const activeGroup = useMemo(
    () =>
      allSettingsGroups.find((group) =>
        group.items.some((item) => item.id === section),
      ),
    [allSettingsGroups, section],
  );

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allSettingsGroups;
    return allSettingsGroups.map((group) => ({
      ...group,
      items: group.label?.toLowerCase().includes(normalized)
        ? group.items
        : group.items.filter((item) =>
            item.label.toLowerCase().includes(normalized),
          ),
    })).filter((group) => group.items.length > 0);
  }, [allSettingsGroups, query]);

  const canSave = section !== 'backup';
  const canEditCompany = Boolean(company && settingsCompany?.canEdit !== false);
  const ActiveIcon = active.icon;

  async function changeCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCompressingLogo(true);
    setMessage(null);
    try {
      // Compress like WhatsApp: max 512px, WebP, quality 0.90
      const compressed = await validateAndCompress(file, 10 * 1024 * 1024, {
        maxDimension: 512,
        quality: 0.90,
        outputFormat: 'image/webp',
      });
      setSystemSettings((current) => ({
        ...current,
        companyLogoDataUrl: compressed,
      }));
      if (company?.id) {
        try {
          localStorage.setItem(`erpfy_logo_${company.id}`, compressed);
          if (company.slug) localStorage.setItem(`erpfy_logo_${company.slug}`, compressed);
        } catch {}
      }
    } catch (err) {
      setMessage({
        tone: 'critical',
        text: err instanceof Error ? err.message : 'Logo could not be processed.',
      });
    } finally {
      setCompressingLogo(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    // System, Sales, POS and Integration panels persist through /api/settings: personal
    // preferences onto the account, business configuration onto the company, credentials
    // into the encrypted secret store. Nothing is kept in this browser.
    if (
      SYSTEM_SECTION_IDS.has(section) ||
      SALES_SECTION_IDS.has(section) ||
      POS_SECTION_IDS.has(section) ||
      INTEGRATION_SECTION_IDS.has(section)
    ) {
      const result = await persistSettings(systemSettings);
      setMessage({
        tone: result.ok ? 'success' : 'critical',
        text: result.ok ? `${active.label} settings saved.` : result.message,
      });
      if (result.ok) setDraftSettings(null);
      setSaving(false);
      return;
    }

    if ((section === 'general' || section === 'localization') && company) {
      const result = await persistSettings(systemSettings);
      if (!result.ok) {
        setMessage({ tone: 'critical', text: result.message });
        setSaving(false);
        return;
      }
      setDraftSettings(null);
    }

    try {
      const response = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, timezone, ...preferences }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || 'Settings could not be saved.');
      setMessage({ tone: 'success', text: 'Settings saved.' });
    } catch (error) {
      setMessage({
        tone: 'critical',
        text:
          error instanceof Error
            ? error.message
            : 'Settings could not be saved.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountOverlay
      closeLabel="Close settings"
      closeHref={company?.slug ? `/account?company=${encodeURIComponent(company.slug)}` : '/account'}
      contentClassName="mx-auto grid max-w-[1600px] items-start gap-6 px-4 pb-8 pt-16 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:py-7 xl:grid-cols-[300px_minmax(0,1fr)]"
    >
      <aside className="erpfy-card overflow-hidden lg:sticky lg:top-0">
        <div className="flex items-center gap-3 border-b border-[var(--erpfy-line-soft)] p-3.5">
          {systemSettings.companyLogoDataUrl &&
          systemSettings.showSidebarLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={systemSettings.companyLogoDataUrl}
              alt=""
              className="size-8 shrink-0 object-contain"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--erpfy-brand)] text-xs font-bold text-[var(--erpfy-brand-on)]">
              {company?.initials ?? '—'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {systemSettings.companyName || company?.name || 'No ERP selected'}
            </p>
            <p className="truncate text-xs text-[var(--erpfy-ink-muted)]">
              {company
                ? settingsCompany?.canEdit === false
                  ? `${company.role} — view only`
                  : 'Business settings'
                : 'Personal preferences only'}
            </p>
          </div>
        </div>

        <div className="border-b border-[var(--erpfy-line-soft)] p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--erpfy-ink-muted)]"
              aria-hidden
            />
            <ErpfyInput
              aria-label="Search settings"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search settings"
              className="pl-9"
            />
          </div>
        </div>

        <nav
          aria-label="Settings sections"
          className="max-h-[38vh] overflow-y-auto overscroll-contain p-2 lg:max-h-[calc(100vh-212px)]"
        >
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.label ?? 'company'}>
              {group.label && (
                <p
                  className={cn(
                    'nav-section-label',
                    groupIndex === 0 && 'pt-2',
                  )}
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const selected = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => {
                        setSection(item.id);
                        setMessage(null);
                      }}
                      className={cn('nav-item w-full', selected && 'active')}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {!item.live && (
                        <span className="nav-count px-1.5 py-0.5">Planned</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-[var(--erpfy-ink-muted)]">
              No settings found.
            </p>
          )}
        </nav>
      </aside>

      <main className="min-w-0 pb-8">
        <div className="mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <ActiveIcon
              className="size-5 shrink-0 text-[var(--erpfy-ink-soft)]"
              aria-hidden
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {active.label}
              </h1>
              {activeGroup?.label && (
                <p className="text-xs text-[var(--erpfy-ink-muted)]">
                  {activeGroup.label}
                </p>
              )}
            </div>
          </div>
        </div>

        {message && (
          <output
            className={cn(
              'mb-4 block rounded-xl border px-4 py-3 text-sm font-semibold',
              message.tone === 'success'
                ? 'border-[var(--erpfy-ok-ink)] bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]'
                : 'border-[var(--erpfy-bad-ink)] bg-[var(--erpfy-bad-bg)] text-[var(--erpfy-bad-ink)]',
            )}
          >
            {message.text}
          </output>
        )}

        <div key={section} className="settings-content-enter space-y-4">
          {section === 'general' && (
            <>
              <ErpfyPanel
                title="General"
                description="Company identity shown across the app and on printed documents."
              >
                {!company ? (
                  <p className="text-sm leading-6 text-[var(--erpfy-ink-muted)]">
                    Create or join an ERP to manage company details.
                  </p>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ErpfyInput
                        id="settings-company-name"
                        label="Company Name"
                        value={systemSettings.companyName || company.name}
                        maxLength={120}
                        disabled={!canEditCompany}
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyName: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-legal-name"
                        label="Legal / Registered Name"
                        value={systemSettings.companyLegalName}
                        maxLength={200}
                        disabled={!canEditCompany}
                        hint="Official registered name for invoices and legal documents."
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyLegalName: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-phone"
                        label="Phone"
                        value={systemSettings.companyPhone}
                        maxLength={40}
                        disabled={!canEditCompany}
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyPhone: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-email"
                        label="Email"
                        type="email"
                        value={systemSettings.companyEmail}
                        maxLength={254}
                        disabled={!canEditCompany}
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyEmail: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-website"
                        label="Website"
                        type="url"
                        value={systemSettings.companyWebsite}
                        maxLength={255}
                        disabled={!canEditCompany}
                        hint="e.g. https://yourcompany.com"
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyWebsite: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-address"
                        label="Address"
                        value={systemSettings.companyAddress}
                        maxLength={500}
                        disabled={!canEditCompany}
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyAddress: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-footer"
                        label="Footer"
                        value={systemSettings.companyFooter}
                        maxLength={300}
                        disabled={!canEditCompany}
                        hint="Shown in the app footer bar. Leave empty for the default copyright line."
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyFooter: event.target.value,
                          }))
                        }
                      />
                      <ErpfyInput
                        id="settings-company-developed-by"
                        label="Developed by"
                        value={systemSettings.companyDevelopedBy}
                        maxLength={120}
                        disabled={!canEditCompany}
                        onChange={(event) =>
                          setSystemSettings((current) => ({
                            ...current,
                            companyDevelopedBy: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold">Change Logo</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {systemSettings.companyLogoDataUrl && (
                          <span className="grid size-12 place-items-center overflow-hidden rounded-xl border border-[var(--erpfy-line)] bg-white">
                            <Image
                              src={systemSettings.companyLogoDataUrl}
                              alt="Company logo preview"
                              width={48}
                              height={48}
                              unoptimized
                              className="max-h-full max-w-full object-contain"
                            />
                          </span>
                        )}
                        <label
                          className={cn(
                            'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--erpfy-line)] bg-white px-3 text-sm font-semibold shadow-xs transition hover:bg-[var(--erpfy-hover)]',
                            (!canEditCompany || compressingLogo) &&
                              'pointer-events-none cursor-not-allowed opacity-50',
                          )}
                        >
                          <Upload className="size-4" aria-hidden />
                          {compressingLogo ? 'Compressing…' : 'Change Logo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={!canEditCompany || compressingLogo}
                            onChange={(e) => void changeCompanyLogo(e)}
                          />
                        </label>
                        {systemSettings.companyLogoDataUrl && (
                          <ErpfyButton
                            tone="secondary"
                            disabled={!canEditCompany || compressingLogo}
                            onClick={() => {
                              setSystemSettings((current) => ({
                                ...current,
                                companyLogoDataUrl: '',
                              }));
                              if (company?.id) {
                                try {
                                  localStorage.removeItem(`erpfy_logo_${company.id}`);
                                  if (company.slug) localStorage.removeItem(`erpfy_logo_${company.slug}`);
                                } catch {}
                              }
                            }}
                          >
                            Remove logo
                          </ErpfyButton>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-[var(--erpfy-ink-muted)]">
                        Any image format. Auto-compressed to WebP (like WhatsApp).
                      </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <RangeSetting
                        label="Sidebar logo width (px)"
                        value={systemSettings.sidebarLogoWidth}
                        disabled={!canEditCompany}
                        onChange={(value) =>
                          setSystemSettings((current) => ({
                            ...current,
                            sidebarLogoWidth: value,
                          }))
                        }
                      />
                      <RangeSetting
                        label="Sidebar logo height (px)"
                        value={systemSettings.sidebarLogoHeight}
                        disabled={!canEditCompany}
                        onChange={(value) =>
                          setSystemSettings((current) => ({
                            ...current,
                            sidebarLogoHeight: value,
                          }))
                        }
                      />
                    </div>

                    <div className="divide-y divide-[var(--erpfy-line-soft)] border-y border-[var(--erpfy-line-soft)]">
                      <CompanyVisibilitySwitch
                        label="Show logo in sidebar"
                        description="Display the company logo in the sidebar header."
                        checked={systemSettings.showSidebarLogo}
                        disabled={!canEditCompany}
                        onChange={(value) =>
                          setSystemSettings((current) => ({
                            ...current,
                            showSidebarLogo: value,
                          }))
                        }
                      />
                      <CompanyVisibilitySwitch
                        label="Show company name in sidebar"
                        description="Display the company name in the sidebar header next to the logo."
                        checked={systemSettings.showSidebarCompanyName}
                        disabled={!canEditCompany}
                        onChange={(value) =>
                          setSystemSettings((current) => ({
                            ...current,
                            showSidebarCompanyName: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </ErpfyPanel>

              <ErpfyPanel
                title="Personal information"
                description="Used for your account menu, alerts and reports addressed to you."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ErpfyInput
                    id="settings-display-name"
                    label="Display name"
                    value={displayName}
                    maxLength={80}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <ErpfyInput
                    id="settings-email"
                    label="Account email"
                    type="email"
                    value={profile.email}
                    disabled
                    hint="Changing email requires a separate verification flow."
                  />
                </div>
              </ErpfyPanel>

              <ErpfyPanel
                title="Account notifications"
                description="Choose the personal account messages you want to receive."
              >
                <div className="divide-y divide-[var(--erpfy-line-soft)]">
                  <Preference
                    checked={preferences.emailAccountActivity}
                    label="Account activity"
                    description="Invitations, membership changes and ownership activity."
                    onChange={(value) =>
                      setPreferences((current) => ({
                        ...current,
                        emailAccountActivity: value,
                      }))
                    }
                  />
                  <Preference
                    checked={preferences.emailSecurityAlerts}
                    label="Security alerts"
                    description="Sign-in, session and security-related account alerts."
                    onChange={(value) =>
                      setPreferences((current) => ({
                        ...current,
                        emailSecurityAlerts: value,
                      }))
                    }
                  />
                  <Preference
                    checked={preferences.emailBillingNotices}
                    label="Billing notices"
                    description="Subscription and payment notices for ERPs where you manage billing."
                    onChange={(value) =>
                      setPreferences((current) => ({
                        ...current,
                        emailBillingNotices: value,
                      }))
                    }
                  />
                  <Preference
                    checked={preferences.emailProductUpdates}
                    label="Product updates"
                    description="Occasional news about ERPFY Core and released Apps."
                    onChange={(value) =>
                      setPreferences((current) => ({
                        ...current,
                        emailProductUpdates: value,
                      }))
                    }
                  />
                </div>
              </ErpfyPanel>
              {canSave && (
                <div className="pt-2">
                  <ErpfyButton
                    tone="primary"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    {saving ? 'Saving…' : 'Submit'}
                  </ErpfyButton>
                </div>
              )}
            </>
          )}

          {section === 'localization' && (
            <ErpfyPanel
              title="Localization"
              description="Language, currency, time zone and number formats."
            >
              {!company ? (
                <p className="text-sm leading-6 text-[var(--erpfy-ink-muted)]">
                  Create or join an ERP to manage company localization.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ErpfySelect
                      id="settings-default-language"
                      label="Default Language"
                      value={systemSettings.defaultLanguage}
                      disabled={!canEditCompany}
                      onChange={(event) =>
                        setSystemSettings((current) => ({
                          ...current,
                          defaultLanguage: event.target.value,
                        }))
                      }
                    >
                      {LANGUAGE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </ErpfySelect>

                    <ErpfySelect
                      id="settings-default-currency"
                      label="Default Currency"
                      value={systemSettings.defaultCurrency}
                      disabled={!canEditCompany}
                      onChange={(event) =>
                        setSystemSettings((current) => ({
                          ...current,
                          defaultCurrency: event.target.value,
                        }))
                      }
                    >
                      {CURRENCY_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </ErpfySelect>

                    <ErpfySelect
                      id="settings-company-timezone"
                      label="Time Zone"
                      value={systemSettings.companyTimezone}
                      disabled={!canEditCompany}
                      onChange={(event) =>
                        setSystemSettings((current) => ({
                          ...current,
                          companyTimezone: event.target.value,
                        }))
                      }
                    >
                      {!TIMEZONES.includes(systemSettings.companyTimezone) && (
                        <option value={systemSettings.companyTimezone}>
                          {timezoneLabel(systemSettings.companyTimezone)}
                        </option>
                      )}
                      {TIMEZONES.map((value) => (
                        <option key={value} value={value}>
                          {timezoneLabel(value)}
                        </option>
                      ))}
                    </ErpfySelect>

                    <ErpfySelect
                      id="settings-date-format"
                      label="Date Format"
                      value={systemSettings.dateFormat}
                      disabled={!canEditCompany}
                      onChange={(event) =>
                        setSystemSettings((current) => ({
                          ...current,
                          dateFormat: event.target
                            .value as typeof current.dateFormat,
                        }))
                      }
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </ErpfySelect>

                    <ErpfySelect
                      id="settings-price-format"
                      label="Price Format"
                      value={systemSettings.priceFormat}
                      disabled={!canEditCompany}
                      onChange={(event) =>
                        setSystemSettings((current) => ({
                          ...current,
                          priceFormat: event.target
                            .value as typeof current.priceFormat,
                        }))
                      }
                    >
                      <option value="1,234.56">
                        1,234.56 (thousand comma, decimal dot)
                      </option>
                      <option value="1.234,56">
                        1.234,56 (thousand dot, decimal comma)
                      </option>
                      <option value="1 234,56">
                        1 234,56 (thousand space, decimal comma)
                      </option>
                    </ErpfySelect>
                  </div>

                  <div className="divide-y divide-[var(--erpfy-line-soft)] border-y border-[var(--erpfy-line-soft)]">
                    <CompanyVisibilitySwitch
                      label="Show Languages"
                      description="Show the language switcher in the top bar."
                      checked={systemSettings.showLanguages}
                      disabled={!canEditCompany}
                      onChange={(value) =>
                        setSystemSettings((current) => ({
                          ...current,
                          showLanguages: value,
                        }))
                      }
                    />

                    <CompanyVisibilitySwitch
                      label="RTL"
                      description="Right-to-left layout for Arabic and similar languages."
                      checked={systemSettings.rtl}
                      disabled={!canEditCompany}
                      onChange={(value) =>
                        setSystemSettings((current) => ({
                          ...current,
                          rtl: value,
                        }))
                      }
                    />
                  </div>
                  {canSave && (
                    <div className="mt-6">
                      <ErpfyButton
                        tone="primary"
                        disabled={saving}
                        onClick={() => void save()}
                      >
                        {saving ? 'Saving…' : 'Submit'}
                      </ErpfyButton>
                    </div>
                  )}
                </div>
              )}
            </ErpfyPanel>
          )}

          {section === 'appearance' && (
            <AppearanceSettingsPanel
              settings={systemSettings}
              onChange={setSystemSettings}
              onSave={save}
            />
          )}

          {SYSTEM_SECTION_IDS.has(section) && (
            <SystemSettingsPanel
              section={section}
              settings={systemSettings}
              onChange={setSystemSettings}
              onSave={save}
              onNavigateSection={setSection}
              companyId={company?.id}
              installedSlugs={installedSlugs}
            />
          )}

          {SALES_SECTION_IDS.has(section) && (
            <SalesSettingsPanels
              section={section}
              settings={systemSettings}
              onChange={setSystemSettings}
              onSave={save}
            />
          )}

          {POS_SECTION_IDS.has(section) && (
            <PosSettingsPanels
              section={section}
              settings={systemSettings}
              onChange={setSystemSettings}
            />
          )}

          {INTEGRATION_SECTION_IDS.has(section) && (
            <IntegrationSettingsPanels
              section={section}
              settings={systemSettings}
              onChange={setSystemSettings}
            />
          )}

          {section.startsWith('plugin:') && (() => {
            const currentPlugin = pluginSettings.find((p) => p.tabId === section);
            if (!currentPlugin) return null;
            return (
              <DynamicPluginSettingsPanel
                section={currentPlugin}
                companyId={company?.id ?? ''}
                canEdit={canEditCompany}
                onSaved={refreshPluginSettings}
              />
            );
          })()}

          {!active.live && (
            <ErpfyPanel
              title={active.label}
              description={`This ${activeGroup?.label ?? 'company'} setting will become available with its Core service or related App.`}
              action={<ErpfyReleaseTag state="planned" />}
            >
              <div className="flex items-start gap-3">
                <CircleAlert
                  className="mt-0.5 size-5 shrink-0 text-[var(--erpfy-brand)]"
                  aria-hidden
                />
                <p className="text-sm leading-6 text-[var(--erpfy-ink-muted)]">
                  This option is included in the ERPFY settings map, but it has
                  no active controls yet. Company settings will require a
                  selected ERP and the correct owner or administrator
                  permission.
                </p>
              </div>
            </ErpfyPanel>
          )}
        </div>
      </main>
    </AccountOverlay>
  );
}

function Preference({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
  const id = `setting-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <ErpfyCheckbox
        id={id}
        checked={checked}
        label={label}
        description={description}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

function RangeSetting({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = `setting-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="text-sm font-semibold">
      <span className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums text-[var(--erpfy-ink-muted)]">
          {value}px
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={20}
        max={96}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-[var(--erpfy-brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function CompanyVisibilitySwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-18 items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--erpfy-ink-muted)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 overflow-hidden rounded-full border p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand)]'
            : 'border-[var(--erpfy-line)] bg-[var(--erpfy-line)]',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
