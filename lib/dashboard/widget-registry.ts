/**
 * ERPFY Dashboard Widget & Quick Action Registry
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 40, 88. Design: DESIGN.md.
 *
 * Core owns the grid, layout, ordering, greeting, and date/currency filter framework.
 * Plugins contribute business widgets and quick actions when installed, active, and entitled.
 */

export type DashboardWidgetType =
  | 'kpi'
  | 'chart'
  | 'list'
  | 'table'
  | 'action'
  | 'summary'
  | 'progress'
  | 'panel';

export type DashboardWidgetCategory = 'kpi' | 'chart' | 'table' | 'action' | 'panel';

export type DashboardWidgetSize = 'kpi' | 'small' | 'medium' | 'large' | 'full';

export type DashboardWidgetDefinition = {
  id: string;
  title: string;
  label: string; // backwards compatibility alias
  type: DashboardWidgetType;
  category: DashboardWidgetCategory; // backwards compatibility alias
  preferredSize: DashboardWidgetSize;
  defaultSpan?: 'full' | 'half' | 'quarter';
  priority: number; // 1-99 KPI, 100-199 analytics, 200-299 tables/lists, 300+ actions
  ownerPlugin: string;
  /** Owning plugin slug(s). Match any of these for single-plugin ownership. */
  pluginSlugs: string[];
  /** Required cross-plugin dependencies. ALL listed plugins must be installed and active. */
  requiredPlugins?: string[];
  /** Optional granular permissions required to view the widget. */
  requiredPermissions?: string[];
  emptyMessage?: string;
  icon?: string;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  icon: string;
  ownerPlugin: string;
  requiredPermissions?: string[];
};

export const CORE_DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  // -------------------------------------------------------------
  // CRM Widgets (owner: erpfy.contacts_crm)
  // -------------------------------------------------------------
  {
    id: 'crm.total_contacts',
    title: 'Total Contacts',
    label: 'Total Contacts',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 10,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['contacts.view'],
    emptyMessage: 'No contacts registered yet',
    icon: 'Users',
  },
  {
    id: 'crm.active_leads',
    title: 'Active Leads',
    label: 'Active Leads',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 20,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['crm.leads.view'],
    emptyMessage: 'No active leads yet',
    icon: 'Target',
  },
  {
    id: 'crm.organizations',
    title: 'Organizations',
    label: 'Organizations',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 30,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['contacts.view'],
    emptyMessage: 'No organizations registered',
    icon: 'Building2',
  },
  {
    id: 'crm.activities_due',
    title: 'Activities Due',
    label: 'Activities Due',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 40,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['crm.activities.view'],
    emptyMessage: 'No pending activities',
    icon: 'Calendar',
  },

  // Backwards compatibility alias keys for CRM widgets
  {
    id: 'crm-total-parties',
    title: 'Total Contacts',
    label: 'CRM — Total Contacts',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 10,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['contacts.view'],
    emptyMessage: 'No contacts registered yet',
    icon: 'Users',
  },
  {
    id: 'crm-active-leads',
    title: 'Active Leads',
    label: 'CRM — Active Leads',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 20,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['crm.leads.view'],
    emptyMessage: 'No active leads yet',
    icon: 'Target',
  },
  {
    id: 'crm-organizations',
    title: 'Organizations',
    label: 'CRM — Organizations',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 30,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPermissions: ['contacts.view'],
    emptyMessage: 'No organizations registered',
    icon: 'Building2',
  },

  // -------------------------------------------------------------
  // Sales Widgets (owner: erpfy.sales)
  // -------------------------------------------------------------
  {
    id: 'stat-sales',
    title: 'Sales & Invoices Stats',
    label: 'Sales & Invoices Stats',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'half',
    priority: 50,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.sales'],
    requiredPermissions: ['sales.view'],
    icon: 'DollarSign',
  },
  {
    id: 'stat-purchases',
    title: 'Purchases Stats',
    label: 'Purchases Stats',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'half',
    priority: 60,
    ownerPlugin: 'erpfy.purchasing',
    pluginSlugs: ['erpfy.purchasing'],
    requiredPermissions: ['purchasing.view'],
    icon: 'Calendar',
  },
  {
    id: 'stat-returns',
    title: 'Returns Stats',
    label: 'Returns Stats',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'half',
    priority: 70,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.sales', 'erpfy.purchasing'],
    icon: 'Undo2',
  },
  {
    id: 'stat-due',
    title: 'Receivables & Payables Due',
    label: 'Receivables & Payables Due',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'half',
    priority: 80,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.sales', 'erpfy.purchasing'],
    icon: 'AlertCircle',
  },
  {
    id: 'stat-profit',
    title: 'Profit',
    label: 'Profit',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 90,
    ownerPlugin: 'erpfy.accounting',
    pluginSlugs: ['erpfy.accounting'],
    requiredPermissions: ['accounting.view'],
    icon: 'TrendingUp',
  },

  // -------------------------------------------------------------
  // Analytics / Chart Widgets
  // -------------------------------------------------------------
  {
    id: 'sales-purchases-chart',
    title: 'Sales & Purchases Chart',
    label: 'Sales & Purchases Chart',
    type: 'chart',
    category: 'chart',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 110,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.sales', 'erpfy.purchasing'],
    requiredPermissions: ['sales.view'],
  },
  {
    id: 'top-products-chart',
    title: 'Top Selling Products Chart',
    label: 'Top Selling Products Chart',
    type: 'chart',
    category: 'chart',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 120,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.catalog', 'erpfy.sales'],
    requiredPermissions: ['sales.view'],
  },
  {
    id: 'payment-sent-received-chart',
    title: 'Payment Sent & Received Chart',
    label: 'Payment Sent & Received Chart',
    type: 'chart',
    category: 'chart',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 130,
    ownerPlugin: 'erpfy.accounting',
    pluginSlugs: ['erpfy.accounting'],
    requiredPermissions: ['accounting.view'],
  },
  {
    // Cross-plugin dependency: strictly requires BOTH contacts_crm AND sales
    id: 'top-customers-chart',
    title: 'Top Customers Chart',
    label: 'Top Customers Chart',
    type: 'chart',
    category: 'chart',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 140,
    ownerPlugin: 'erpfy.contacts_crm',
    pluginSlugs: ['erpfy.contacts_crm', 'contacts-crm'],
    requiredPlugins: ['erpfy.contacts_crm', 'erpfy.sales'],
    requiredPermissions: ['contacts.view', 'sales.view'],
  },

  // -------------------------------------------------------------
  // Category-Specific Business Widgets (§8)
  // -------------------------------------------------------------
  {
    id: 'category.live_kot',
    title: 'Live Kitchen Orders (KOT)',
    label: 'Live Kitchen Orders (KOT)',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 15,
    ownerPlugin: 'erpfy.restaurant',
    pluginSlugs: ['erpfy.restaurant', 'erpfy.core', 'restaurant-operations', 'kot'],
    emptyMessage: 'No pending kitchen tickets',
    icon: 'ClipboardList',
  },
  {
    id: 'category.active_tables',
    title: 'Dine-In Table Occupancy',
    label: 'Dine-In Table Occupancy',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 16,
    ownerPlugin: 'erpfy.restaurant',
    pluginSlugs: ['erpfy.restaurant', 'erpfy.core', 'restaurant-operations', 'tables'],
    emptyMessage: 'All tables vacant',
    icon: 'Landmark',
  },
  {
    id: 'category.imei_stock',
    title: 'IMEI Tracked Devices in Stock',
    label: 'IMEI Tracked Devices in Stock',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 17,
    ownerPlugin: 'erpfy.mobile',
    pluginSlugs: ['erpfy.mobile', 'erpfy.core', 'mobile-shop', 'imei'],
    emptyMessage: 'No serialised devices in stock',
    icon: 'Shield',
  },
  {
    id: 'category.open_repairs',
    title: 'Pending Device Repairs',
    label: 'Pending Device Repairs',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 18,
    ownerPlugin: 'erpfy.mobile',
    pluginSlugs: ['erpfy.mobile', 'erpfy.core', 'mobile-shop', 'parts-workshop', 'repairs'],
    emptyMessage: 'No repair tickets in queue',
    icon: 'Settings',
  },
  {
    id: 'category.expiring_drugs',
    title: 'Medicines Expiring Soon (< 60 Days)',
    label: 'Medicines Expiring Soon (< 60 Days)',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 19,
    ownerPlugin: 'erpfy.pharmacy',
    pluginSlugs: ['erpfy.pharmacy', 'erpfy.core', 'pharmacy'],
    emptyMessage: 'Zero near-expiry batches detected',
    icon: 'AlertTriangle',
  },
  {
    id: 'category.prescriptions_due',
    title: 'Prescriptions to Dispense',
    label: 'Prescriptions to Dispense',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 21,
    ownerPlugin: 'erpfy.pharmacy',
    pluginSlugs: ['erpfy.pharmacy', 'erpfy.core', 'pharmacy', 'clinics'],
    emptyMessage: 'No pending prescriptions',
    icon: 'FileSpreadsheet',
  },
  {
    id: 'category.pos_counter_sales',
    title: 'Today POS Counter Sales',
    label: 'Today POS Counter Sales',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 22,
    ownerPlugin: 'erpfy.pos',
    pluginSlugs: ['erpfy.pos', 'erpfy.core', 'general-retail', 'grocery-supermarket', 'fashion-apparel'],
    emptyMessage: 'No register sales recorded today',
    icon: 'Store',
  },
  {
    id: 'category.active_work_orders',
    title: 'Active Production Work Orders',
    label: 'Active Production Work Orders',
    type: 'kpi',
    category: 'kpi',
    preferredSize: 'kpi',
    defaultSpan: 'quarter',
    priority: 23,
    ownerPlugin: 'erpfy.manufacturing',
    pluginSlugs: ['erpfy.manufacturing', 'erpfy.core', 'discrete-manufacturing', 'process-manufacturing'],
    emptyMessage: 'No active production runs',
    icon: 'Layers',
  },

  // -------------------------------------------------------------
  // Panel / List / Table Widgets
  // -------------------------------------------------------------
  {
    id: 'sales-by-payment',
    title: 'Sales by Payment Method',
    label: 'Sales by Payment Method',
    type: 'panel',
    category: 'panel',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 210,
    ownerPlugin: 'erpfy.payments',
    pluginSlugs: ['erpfy.payments'],
  },
  {
    id: 'stock-value',
    title: 'Stock Valuation',
    label: 'Stock Valuation',
    type: 'panel',
    category: 'panel',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 220,
    ownerPlugin: 'erpfy.inventory',
    pluginSlugs: ['erpfy.inventory'],
    requiredPermissions: ['inventory.view'],
  },
  {
    id: 'stock-alert',
    title: 'Stock Alerts',
    label: 'Stock Alerts',
    type: 'panel',
    category: 'panel',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 230,
    ownerPlugin: 'erpfy.inventory',
    pluginSlugs: ['erpfy.inventory'],
    requiredPermissions: ['inventory.view'],
  },
  {
    id: 'top-selling-list',
    title: 'Top Selling Products List',
    label: 'Top Selling Products List',
    type: 'panel',
    category: 'panel',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 240,
    ownerPlugin: 'erpfy.catalog',
    pluginSlugs: ['erpfy.catalog', 'erpfy.sales'],
  },
  {
    id: 'recent-sales',
    title: 'Recent Sales Table',
    label: 'Recent Sales Table',
    type: 'table',
    category: 'table',
    preferredSize: 'full',
    defaultSpan: 'full',
    priority: 250,
    ownerPlugin: 'erpfy.sales',
    pluginSlugs: ['erpfy.sales'],
    requiredPermissions: ['sales.view'],
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    label: 'Quick Actions',
    type: 'action',
    category: 'action',
    preferredSize: 'medium',
    defaultSpan: 'half',
    priority: 300,
    ownerPlugin: 'erpfy.core',
    pluginSlugs: [
      'erpfy.pos',
      'erpfy.sales',
      'erpfy.purchasing',
      'erpfy.catalog',
      'erpfy.inventory',
      'erpfy.contacts_crm',
      'contacts-crm',
      'erpfy.accounting',
    ],
  },
];

export const CORE_QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    id: 'action.add_party',
    label: 'Add Contact',
    href: '/c/:companySlug/crm?action=add-party',
    icon: 'UserPlus',
    ownerPlugin: 'erpfy.contacts_crm',
    requiredPermissions: ['contacts.edit'],
  },
  {
    id: 'action.new_lead',
    label: 'Add Lead',
    href: '/c/:companySlug/crm?view=leads&action=new',
    icon: 'Target',
    ownerPlugin: 'erpfy.contacts_crm',
    requiredPermissions: ['crm.leads.manage'],
  },
  {
    id: 'crm.add_contact',
    label: 'Add Contact',
    href: '/c/:companySlug/crm?action=add-party',
    icon: 'UserPlus',
    ownerPlugin: 'erpfy.contacts_crm',
    requiredPermissions: ['contacts.create'],
  },
  {
    id: 'crm.add_org',
    label: 'Add Organization',
    href: '/c/:companySlug/crm?action=add-org',
    icon: 'Building2',
    ownerPlugin: 'erpfy.contacts_crm',
    requiredPermissions: ['contacts.create'],
  },
  {
    id: 'crm.add_lead',
    label: 'Add Lead',
    href: '/c/:companySlug/crm?action=add-lead',
    icon: 'Target',
    ownerPlugin: 'erpfy.contacts_crm',
    requiredPermissions: ['crm.leads.manage'],
  },
  {
    id: 'sales.new_sale',
    label: 'New Sale',
    href: '/account/orders?action=new&company=:companySlug',
    icon: 'ShoppingCart',
    ownerPlugin: 'erpfy.sales',
    requiredPermissions: ['sales.create'],
  },
  {
    id: 'pos.open',
    label: 'Open POS',
    href: '/account/pos?company=:companySlug',
    icon: 'Store',
    ownerPlugin: 'erpfy.pos',
    requiredPermissions: ['pos.view'],
  },
  {
    id: 'catalog.add_product',
    label: 'Add Product',
    href: '/account/products?action=new&company=:companySlug',
    icon: 'Tag',
    ownerPlugin: 'erpfy.catalog',
    requiredPermissions: ['catalog.create'],
  },
  {
    id: 'core.manage_apps',
    label: 'Manage Apps',
    href: '/account/app-store?company=:companySlug',
    icon: 'Layers',
    ownerPlugin: 'erpfy.core',
  },
];

/**
 * Normalizes plugin slugs for comparison (handles 'contacts-crm' vs 'erpfy.contacts_crm').
 */
function normalizePluginId(slug: string): string {
  const clean = slug.trim().toLowerCase();
  if (clean === 'contacts-crm') return 'erpfy.contacts_crm';
  return clean;
}

/**
 * Returns the list of registered widgets that are currently active for a company
 * based on its installed application slugs and user permissions.
 *
 * Implements strict fail-closed cross-plugin dependency evaluation:
 * If a widget specifies `requiredPlugins`, ALL of them must be present in installedAppSlugs.
 */
export function getActiveDashboardWidgets(
  optionsOrSlugs: string[] | { installedAppSlugs: string[]; userPermissions?: string[] } = [],
  legacyPermissions: string[] = [],
): DashboardWidgetDefinition[] {
  const installedAppSlugs = Array.isArray(optionsOrSlugs)
    ? optionsOrSlugs
    : (optionsOrSlugs?.installedAppSlugs ?? []);
  const userPermissions = Array.isArray(optionsOrSlugs)
    ? (legacyPermissions.length > 0 ? legacyPermissions : undefined)
    : optionsOrSlugs?.userPermissions;
  const installedSet = new Set(installedAppSlugs.map(normalizePluginId));
  const permSet = new Set(userPermissions ?? []);
  const isSuper = permSet.has('*') || userPermissions === undefined;

  // Deduplicate by canonical ID
  const seenIds = new Set<string>();
  const activeWidgets: DashboardWidgetDefinition[] = [];

  for (const widget of CORE_DASHBOARD_WIDGETS) {
    if (seenIds.has(widget.id)) continue;

    // 1. Cross-plugin dependencies: ALL must be present if defined
    if (widget.requiredPlugins && widget.requiredPlugins.length > 0) {
      const allDepsMet = widget.requiredPlugins.every((req) =>
        installedSet.has(normalizePluginId(req)),
      );
      if (!allDepsMet) continue;
    } else {
      // 2. Single plugin: must match at least one owner slug
      const hasPlugin = widget.pluginSlugs.some((slug) =>
        installedSet.has(normalizePluginId(slug)),
      );
      if (!hasPlugin) continue;
    }

    // 3. User permissions: user must hold required permissions
    if (widget.requiredPermissions && !isSuper) {
      const hasPerm = widget.requiredPermissions.every((p) => permSet.has(p));
      if (!hasPerm) continue;
    }

    seenIds.add(widget.id);
    activeWidgets.push(widget);
  }

  return activeWidgets;
}

/**
 * Resolves active quick actions based on installed plugins and permissions.
 */
export function getActiveQuickActions(
  optionsOrSlugs: string[] | { installedAppSlugs: string[]; userPermissions?: string[]; companySlug?: string } = [],
  legacyPermissions: string[] = [],
): { id: string; label: string; href: string; icon: string }[] {
  const installedAppSlugs = Array.isArray(optionsOrSlugs)
    ? optionsOrSlugs
    : (optionsOrSlugs?.installedAppSlugs ?? []);
  const userPermissions = Array.isArray(optionsOrSlugs)
    ? legacyPermissions
    : (optionsOrSlugs?.userPermissions ?? []);
  const companySlug = Array.isArray(optionsOrSlugs)
    ? ''
    : (optionsOrSlugs?.companySlug ?? '');
  if (installedAppSlugs.length === 0) {
    return [];
  }

  const installedSet = new Set(installedAppSlugs.map(normalizePluginId));
  const permSet = new Set(userPermissions);
  const isSuper = permSet.has('*') || userPermissions.length === 0;

  return CORE_QUICK_ACTIONS.filter((action) => {
    // Core actions are always available if any app is installed
    if (action.ownerPlugin === 'erpfy.core') return true;

    // Check plugin is installed
    if (!installedSet.has(normalizePluginId(action.ownerPlugin))) return false;

    // Check permissions
    if (action.requiredPermissions && !isSuper) {
      const hasPerm = action.requiredPermissions.every((p) => permSet.has(p));
      if (!hasPerm) return false;
    }

    return true;
  }).map((action) => ({
    id: action.id,
    label: action.label,
    href: action.href.replace(/:companySlug/g, encodeURIComponent(companySlug || '')),
    icon: action.icon,
  }));
}

/**
 * Sorts active widgets according to saved user/tenant dashboard widgetOrder.
 */
export function sortWidgetsByOrder(
  widgets: DashboardWidgetDefinition[],
  savedOrder: string[] = [],
): DashboardWidgetDefinition[] {
  if (!savedOrder || savedOrder.length === 0) {
    return [...widgets].sort((a, b) => a.priority - b.priority);
  }

  const map = new Map(widgets.map((w) => [w.id, w]));
  const result: DashboardWidgetDefinition[] = [];

  for (const id of savedOrder) {
    const w = map.get(id);
    if (w) {
      result.push(w);
      map.delete(id);
    }
  }

  // Append remaining active widgets
  for (const remaining of map.values()) {
    result.push(remaining);
  }

  return result;
}

/**
 * Validates a widget definition from a plugin manifest against platform rules.
 */
export function validateWidgetDefinition(widget: unknown): { valid: boolean; error?: string } {
  if (!widget || typeof widget !== 'object') {
    return { valid: false, error: 'Widget definition must be an object' };
  }
  const w = widget as Record<string, unknown>;
  if (typeof w.id !== 'string' || !/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/.test(w.id)) {
    return { valid: false, error: `Invalid widget ID '${String(w.id)}'. Expected format 'module.widget_name'.` };
  }
  if (w.title !== undefined && (typeof w.title !== 'string' || !w.title.trim())) {
    return { valid: false, error: 'Widget title must be a non-empty string.' };
  }
  if (!w.title && !w.label) {
    return { valid: false, error: 'Widget definition must have a title or label.' };
  }
  const allowedTypes: DashboardWidgetType[] = ['kpi', 'chart', 'list', 'table', 'action', 'summary', 'progress', 'panel'];
  if (w.type !== undefined && !allowedTypes.includes(w.type as DashboardWidgetType)) {
    const typeStr = typeof w.type === 'string' ? w.type : JSON.stringify(w.type);
    return { valid: false, error: `Unknown widget type '${typeStr}'. Allowed: ${allowedTypes.join(', ')}.` };
  }
  const allowedSizes: DashboardWidgetSize[] = ['kpi', 'small', 'medium', 'large', 'full'];
  const size = (w.preferredSize || w.preferred_size) as DashboardWidgetSize | undefined;
  if (size !== undefined && !allowedSizes.includes(size)) {
    const sizeStr = typeof size === 'string' ? size : JSON.stringify(size);
    return { valid: false, error: `Unknown widget size '${sizeStr}'. Allowed: ${allowedSizes.join(', ')}.` };
  }
  return { valid: true };
}
