/**
 * ERPFY Settings Registry & Classification Architecture — Phase 1.
 * Authority: ERPFY-MASTER-PLAN.md & ERPFY_COMPLETE_SAFE_MASTER_SINGLE_FILE(1).md Part B.
 *
 * This module provides the authoritative centralized classification for all settings destinations.
 * It is completely additive and isomorphic (runs in browser, Node, and Cloudflare Workers).
 *
 * It attaches ownership, security scope, and future dynamic plugin eligibility with ZERO
 * database migrations, preserving all existing routes, UI components, and stored data.
 */

export type SettingsOwnershipType =
  | 'CORE_PLATFORM'
  | 'USER_PREFERENCE'
  | 'WORKSPACE_COMPANY'
  | 'PLUGIN_OWNED'
  | 'COUNTRY_LOCALIZATION'
  | 'PLATFORM_ADMIN'
  | 'DEVELOPER_ONLY';

export type SettingsScope = 'account' | 'company' | 'hybrid';

export type SettingsVisibilityRule =
  | 'always_visible'
  | 'requires_session'
  | 'company_context';

export type SettingsRegistryItem = {
  /** Stable identifier matching the tab id in AccountSettingsForm */
  id: string;
  /** Human-readable display label */
  label: string;
  /** UI grouping in the left settings navigation rail (null = General group) */
  group: string | null;
  /** Canonical route and deep link */
  currentRoute: string;
  /** Internal tab identifier */
  tabId: string;
  /** Phase 1 Classification */
  ownershipType: SettingsOwnershipType;
  /** Owning capability or EAP plugin id if applicable */
  owningCapability?: string;
  /** Server-side RBAC permission required to view/edit this setting */
  requiredPermission?: string;
  /** Target data storage scope */
  scope: SettingsScope;
  /** Requires administrator or owner privileges */
  adminOnly: boolean;
  /** Reserved for platform developer accounts */
  developerOnly: boolean;
  /** Legacy/current visibility behavior (never hidden prematurely in Phase 1) */
  currentVisibility: SettingsVisibilityRule;
  /** Eligible to become dynamically injected when plugin is installed in Phase 2 */
  futureDynamicEligible: boolean;
  /** Ordering index within the group */
  order: number;
  /** Explanatory notes regarding backward compatibility and migration safeguards */
  compatibilityNotes: string;
  /** Architectural notes regarding future ownership transitions */
  futureOwnershipNotes?: string;
};

export const SETTINGS_REGISTRY: readonly SettingsRegistryItem[] = [
  /* ------------------------------------------------------------------ *
   * Group: General (null) — Workspace & Localization Core
   * ------------------------------------------------------------------ */
  {
    id: 'general',
    label: 'General',
    group: null,
    currentRoute: '/account/settings',
    tabId: 'general',
    ownershipType: 'WORKSPACE_COMPANY',
    owningCapability: 'core.company',
    requiredPermission: 'settings.general',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 1,
    compatibilityNotes:
      'Company profile, legal name, contact, logo and sidebar branding. Stored on core_companies and core_company_settings.',
  },
  {
    id: 'localization',
    label: 'Localization',
    group: null,
    currentRoute: '/account/settings',
    tabId: 'localization',
    ownershipType: 'WORKSPACE_COMPANY',
    owningCapability: 'core.localization',
    requiredPermission: 'settings.localization',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 2,
    compatibilityNotes:
      'Company timezone, currency, date/number formatting, and fiscal year start. Stored on core_companies and core_company_settings.',
  },

  /* ------------------------------------------------------------------ *
   * Group: Sales — Plugin Owned (erpfy.sales) & Preserved Documents
   * ------------------------------------------------------------------ */
  {
    id: 'sales-defaults',
    label: 'Defaults',
    group: 'Sales',
    currentRoute: '/account/settings',
    tabId: 'sales-defaults',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.sales',
    requiredPermission: 'sales.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 10,
    compatibilityNotes:
      'Default customer, warehouse, tax rate, and point exchange rate. Owned by Sales capability.',
  },
  {
    id: 'sales-features',
    label: 'Features',
    group: 'Sales',
    currentRoute: '/account/settings',
    tabId: 'sales-features',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.sales',
    requiredPermission: 'sales.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 11,
    compatibilityNotes:
      '3-decimal pricing, kitchen display, serial/IMEI tracking, wholesale pricing. Owned by Sales capability.',
  },
  {
    id: 'prefixes',
    label: 'Prefixes',
    group: 'Sales',
    currentRoute: '/account/settings',
    tabId: 'prefixes',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.sales',
    requiredPermission: 'sales.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 12,
    compatibilityNotes:
      'Document numbering prefixes for sales, purchases, quotations, and adjustments. Owned by Sales capability.',
  },
  {
    id: 'invoice-pdf',
    label: 'Invoice PDF',
    group: 'Sales',
    currentRoute: '/account/settings',
    tabId: 'invoice-pdf',
    ownershipType: 'WORKSPACE_COMPANY',
    owningCapability: 'core.documents',
    requiredPermission: 'settings.documents',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 13,
    compatibilityNotes:
      'Preserved company document template (paper size, margins, header, footer, colors). Preserved without changes.',
    futureOwnershipNotes:
      'Cross-functional document: Sales uses it for order slips; Accounting (erpfy.accounting) requires formal tax invoice templates. Document whether Sales or Accounting should own it later.',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    group: 'Sales',
    currentRoute: '/account/settings',
    tabId: 'pharmacy',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.pharmacy',
    requiredPermission: 'pharmacy.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 14,
    compatibilityNotes:
      'Batch tracking, expiry alert days, and prescription requirements. Owned by Pharmacy plugin.',
  },

  /* ------------------------------------------------------------------ *
   * Group: System — Core Platform, User Preference & Admin Settings
   * ------------------------------------------------------------------ */
  {
    id: 'dashboard',
    label: 'Dashboard',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'dashboard',
    ownershipType: 'USER_PREFERENCE',
    owningCapability: 'core.platform',
    requiredPermission: 'settings.read',
    scope: 'account',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'always_visible',
    futureDynamicEligible: false,
    order: 20,
    compatibilityNotes:
      'Personal default date range, demo dashboard toggle, and widget arrangement. Stored in core_account_settings.',
  },
  {
    id: 'modules',
    label: 'Modules',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'modules',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.modules',
    requiredPermission: 'settings.modules',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 21,
    compatibilityNotes:
      'Company module availability switches. In future phases this represents Apps & Modules without breaking existing routes.',
  },
  {
    id: 'sidebar-menu',
    label: 'Sidebar Menu',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'sidebar-menu',
    ownershipType: 'USER_PREFERENCE',
    owningCapability: 'core.ui',
    requiredPermission: 'settings.read',
    scope: 'account',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'always_visible',
    futureDynamicEligible: false,
    order: 22,
    compatibilityNotes:
      'Personal preference toggling rail navigation item visibility. Presentation only; cannot bypass permissions.',
  },
  {
    id: 'datatable',
    label: 'DataTable',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'datatable',
    ownershipType: 'USER_PREFERENCE',
    owningCapability: 'core.ui',
    requiredPermission: 'settings.read',
    scope: 'account',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'always_visible',
    futureDynamicEligible: false,
    order: 23,
    compatibilityNotes:
      'Personal table density, pagination, borders, striped rows, and column sorting. Stored in core_account_settings.',
  },
  {
    id: 'export',
    label: 'Export',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'export',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.export',
    requiredPermission: 'data.export',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 24,
    compatibilityNotes:
      'Company export format defaults (CSV/JSON) and CSV header options.',
  },
  {
    id: 'security',
    label: 'Security',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'security',
    ownershipType: 'PLATFORM_ADMIN',
    owningCapability: 'core.security',
    requiredPermission: 'security.manage',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 25,
    compatibilityNotes:
      'Auto-logout timeout and inactivity auto-lock settings. Core security policy.',
  },
  {
    id: 'backup',
    label: 'Backup',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'backup',
    ownershipType: 'PLATFORM_ADMIN',
    owningCapability: 'core.backup',
    requiredPermission: 'backup.manage',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 26,
    compatibilityNotes:
      'Manual database backup creation trigger and cloud backup destination configuration.',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'maintenance',
    ownershipType: 'PLATFORM_ADMIN',
    owningCapability: 'core.maintenance',
    requiredPermission: 'system.maintenance',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 27,
    compatibilityNotes:
      'Maintenance mode banner toggle and tenant announcement messaging.',
  },
  {
    id: 'demo-data',
    label: 'Demo Data',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'demo-data',
    ownershipType: 'PLATFORM_ADMIN',
    owningCapability: 'core.demo',
    requiredPermission: 'system.maintenance',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 28,
    compatibilityNotes:
      'Generates sample records or resets company sandbox data.',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    group: 'System',
    currentRoute: '/account/settings',
    tabId: 'calendar',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.calendar',
    requiredPermission: 'settings.read',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 29,
    compatibilityNotes:
      'First day of the week (Monday, Sunday, Saturday) and 12/24-hour time conventions.',
  },

  /* ------------------------------------------------------------------ *
   * Group: POS — Plugin Owned (erpfy.pos & erpfy.printing)
   * ------------------------------------------------------------------ */
  {
    id: 'pos-settings',
    label: 'POS Settings',
    group: 'POS',
    currentRoute: '/account/settings',
    tabId: 'pos-settings',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.pos',
    requiredPermission: 'pos.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 30,
    compatibilityNotes:
      'Sound beeps, auto-print, scanner mode, cash drawer command, offline sync. Owned by POS plugin.',
  },
  {
    id: 'pos-receipt',
    label: 'POS Receipt',
    group: 'POS',
    currentRoute: '/account/settings',
    tabId: 'pos-receipt',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.pos',
    requiredPermission: 'pos.settings',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 31,
    compatibilityNotes:
      'Thermal receipt paper width (80mm/58mm), store address, VAT number, barcode display. Owned by POS plugin.',
  },
  {
    id: 'network-printing',
    label: 'Direct Network Printing',
    group: 'POS',
    currentRoute: '/account/settings',
    tabId: 'network-printing',
    ownershipType: 'PLUGIN_OWNED',
    owningCapability: 'erpfy.printing',
    requiredPermission: 'printing.manage',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 32,
    compatibilityNotes:
      'Raw TCP ESC/POS network printer IP, port, and timeout. Owned by Direct Printing plugin.',
  },

  /* ------------------------------------------------------------------ *
   * Group: Integrations — Core Integrations, Extensions & L10n
   * ------------------------------------------------------------------ */
  {
    id: 'appearance',
    label: 'Appearance',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'appearance',
    ownershipType: 'USER_PREFERENCE',
    owningCapability: 'core.ui',
    requiredPermission: 'settings.read',
    scope: 'account',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'always_visible',
    futureDynamicEligible: false,
    order: 40,
    compatibilityNotes:
      'Dark mode, portal color scheme synchronization, and language picker. Preserves existing design system.',
  },
  {
    id: 'pwa',
    label: 'PWA',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'pwa',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.pwa',
    requiredPermission: 'settings.write',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 41,
    compatibilityNotes:
      'Progressive Web App installation names, theme color, background color, and standalone display mode.',
  },
  {
    id: 'mobile-app',
    label: 'Mobile App',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'mobile-app',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.mobile',
    requiredPermission: 'settings.write',
    scope: 'company',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 42,
    compatibilityNotes:
      'Mobile API gateway endpoints, biometric authentication support, and FCM push notifications.',
  },
  {
    id: 'mail',
    label: 'Mail',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'mail',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.integration.mail',
    requiredPermission: 'integrations.mail',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 43,
    compatibilityNotes:
      'Core email delivery integration (SMTP driver, host, port, credentials). Passwords AES-256-GCM encrypted in core_company_secrets.',
  },
  {
    id: 'sms',
    label: 'SMS',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'sms',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.integration.sms',
    requiredPermission: 'integrations.sms',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 44,
    compatibilityNotes:
      'Core SMS gateway integration (Twilio, Vonage, etc.). API secrets AES-256-GCM encrypted in core_company_secrets.',
  },
  {
    id: 'payment-gateway',
    label: 'Payment Gateway',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'payment-gateway',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.integration.payments',
    requiredPermission: 'integrations.payments',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 45,
    compatibilityNotes:
      'Core payment gateway integration framework (Stripe, PayPal, RazorPay, EasyPaisa, JazzCash). Secrets AES-256-GCM encrypted in core_company_secrets.',
  },
  {
    id: 'zatca',
    label: 'ZATCA E-Invoicing',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'zatca',
    ownershipType: 'COUNTRY_LOCALIZATION',
    owningCapability: 'erpfy.l10n_sa',
    requiredPermission: 'l10n.zatca',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: true,
    order: 46,
    compatibilityNotes:
      'Saudi Arabia statutory electronic invoicing compliance. Country localization pack for KSA.',
  },
  {
    id: 'custom-fields',
    label: 'Custom Fields',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'custom-fields',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.custom_fields',
    requiredPermission: 'custom_fields.manage',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 47,
    compatibilityNotes:
      'Core platform schema extension framework: custom fields for products, customers, suppliers, orders.',
  },
  {
    id: 'backup-archives',
    label: 'Backup archives',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'backup-archives',
    ownershipType: 'PLATFORM_ADMIN',
    owningCapability: 'core.backup',
    requiredPermission: 'backup.manage',
    scope: 'company',
    adminOnly: true,
    developerOnly: false,
    currentVisibility: 'company_context',
    futureDynamicEligible: false,
    order: 48,
    compatibilityNotes:
      'Live read-only projection of database backup archives. Admin only.',
  },
  {
    id: 'login-devices',
    label: 'Login Devices',
    group: 'Integrations',
    currentRoute: '/account/settings',
    tabId: 'login-devices',
    ownershipType: 'CORE_PLATFORM',
    owningCapability: 'core.security',
    requiredPermission: 'settings.read',
    scope: 'account',
    adminOnly: false,
    developerOnly: false,
    currentVisibility: 'always_visible',
    futureDynamicEligible: false,
    order: 49,
    compatibilityNotes:
      'Live read-only projection of active sessions for current user. Stored in core_sessions.',
  },
] as const;

/** Lookup map by stable tab id */
const SETTINGS_REGISTRY_MAP = new Map<string, SettingsRegistryItem>(
  SETTINGS_REGISTRY.map((item) => [item.id, item]),
);

/**
 * Returns the classification metadata for a given settings tab id.
 */
export function getSettingsMetadata(id: string): SettingsRegistryItem | undefined {
  return SETTINGS_REGISTRY_MAP.get(id);
}

/**
 * Returns all settings registry items.
 */
export function getAllSettingsMetadata(): readonly SettingsRegistryItem[] {
  return SETTINGS_REGISTRY;
}

/**
 * Returns settings items filtered by ownership type.
 */
export function getSettingsByOwnership(
  ownershipType: SettingsOwnershipType,
): SettingsRegistryItem[] {
  return SETTINGS_REGISTRY.filter((item) => item.ownershipType === ownershipType);
}

/**
 * Returns settings items filtered by UI group.
 */
export function getSettingsByGroup(
  group: string | null,
): SettingsRegistryItem[] {
  return SETTINGS_REGISTRY.filter((item) => item.group === group);
}

/**
 * Checks whether a settings item is owned by a business plugin.
 */
export function isPluginOwnedSetting(id: string): boolean {
  const item = SETTINGS_REGISTRY_MAP.get(id);
  return item?.ownershipType === 'PLUGIN_OWNED';
}

/**
 * Checks whether a settings item is a country statutory localization pack.
 */
export function isCountryLocalizationSetting(id: string): boolean {
  const item = SETTINGS_REGISTRY_MAP.get(id);
  return item?.ownershipType === 'COUNTRY_LOCALIZATION';
}
