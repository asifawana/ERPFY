/**
 * ERPFY Dashboard Personalization & Canonical Resolution Engine
 * Authority: ERPFY-MASTER-PLAN.md & USER-SPECIFIC DASHBOARD PERSONALIZATION SPEC
 *
 * Final Dashboard Resolution Model:
 * ERPFY Core DashboardShell
 *         ↓
 * Installed plugins
 *         ↓
 * Active plugins
 *         ↓
 * Company entitlement
 *         ↓
 * Plugin dependencies
 *         ↓
 * Current user's RBAC permissions
 *         ↓
 * Available Widget Registry
 *         ↓
 * Company dashboard policy/defaults
 *         ↓
 * Current user's personal dashboard preferences
 *         ↓
 * ERPFY Layout Engine
 *         ↓
 * Final Dashboard
 *
 * Invariants:
 * 1. Plugins determine which widgets EXIST.
 * 2. Permissions determine which widgets the user MAY SEE.
 * 3. User preferences determine how authorized widgets are ARRANGED.
 * 4. A user preference must NEVER grant access to an unauthorized widget (fail-closed RBAC).
 */

import {
  CORE_DASHBOARD_WIDGETS,
  getActiveDashboardWidgets,
  getActiveQuickActions,
} from './widget-registry.ts';
import type {
  DashboardWidgetDefinition,
  DashboardWidgetSize,
  DashboardWidgetType,
} from './widget-registry.ts';

export type DashboardZone = 'kpi' | 'analytics' | 'secondary' | 'tables' | 'actions';

export interface UserWidgetPreference {
  id: string; // Stable widget ID (e.g. "crm.total_contacts")
  visible?: boolean;
  order?: number;
  size?: DashboardWidgetSize;
  collapsed?: boolean;
}

export interface CompanyDashboardDefault {
  widgets?: UserWidgetPreference[];
  widgetOrder?: string[];
}

export interface UserDashboardPreferences {
  widgets?: UserWidgetPreference[];
}

export interface ResolvedDashboardWidget extends DashboardWidgetDefinition {
  visible: boolean;
  order: number;
  resolvedSize: DashboardWidgetSize;
  collapsed: boolean;
  zone: DashboardZone;
}

export interface ResolveDashboardOptions {
  user?: {
    id?: string;
    accountId?: string;
    email?: string;
    role?: string;
  } | null;
  companyId?: string;
  companySlug?: string;
  installedAppSlugs: string[];
  userPermissions?: string[];
  companyDefaults?: CompanyDashboardDefault | null;
  userPreferences?: UserDashboardPreferences | null;
}

export interface ResolvedDashboardResult {
  widgets: ResolvedDashboardWidget[];
  quickActions: { id: string; label: string; href: string; icon: string }[];
  zones: {
    kpi: ResolvedDashboardWidget[];
    analytics: ResolvedDashboardWidget[];
    secondary: ResolvedDashboardWidget[];
    tables: ResolvedDashboardWidget[];
    actions: ResolvedDashboardWidget[];
  };
}

/**
 * Maps a widget definition to its canonical layout zone.
 */
export function getWidgetZone(widget: DashboardWidgetDefinition): DashboardZone {
  if (widget.type === 'kpi') return 'kpi';
  if (widget.type === 'chart') return 'analytics';
  if (widget.type === 'table' || widget.id === 'recent-sales') return 'tables';
  if (widget.type === 'action' || widget.id === 'quick-actions') return 'actions';
  return 'secondary';
}

/**
 * Canonical dashboard resolver for a user in the context of a company.
 * 
 * Strict resolution order:
 * User Preferences > Company Defaults > Plugin/Registry Defaults.
 * 
 * RBAC always wins: Unauthorized widgets are stripped unconditionally.
 */
export function resolveDashboardForUser(options: ResolveDashboardOptions): ResolvedDashboardResult {
  const {
    installedAppSlugs,
    userPermissions,
    companySlug = '',
    companyDefaults = null,
    userPreferences = null,
  } = options;

  // 1. Resolve Available & Authorized Widgets (Plugins + Dependencies + RBAC)
  const authorizedWidgets = getActiveDashboardWidgets({
    installedAppSlugs,
    userPermissions,
  });

  // Create lookup maps for fast access
  const authorizedMap = new Map<string, DashboardWidgetDefinition>();
  for (const w of authorizedWidgets) {
    authorizedMap.set(w.id, w);
  }

  // User preferences map (Level C)
  const userPrefMap = new Map<string, UserWidgetPreference>();
  if (userPreferences?.widgets && Array.isArray(userPreferences.widgets)) {
    for (const p of userPreferences.widgets) {
      if (p && typeof p.id === 'string') {
        userPrefMap.set(p.id, p);
      }
    }
  }

  // Company defaults map (Level B)
  const companyDefaultMap = new Map<string, UserWidgetPreference>();
  if (companyDefaults?.widgets && Array.isArray(companyDefaults.widgets)) {
    for (const p of companyDefaults.widgets) {
      if (p && typeof p.id === 'string') {
        companyDefaultMap.set(p.id, p);
      }
    }
  }

  // Allowed sizes check
  const allowedSizes: DashboardWidgetSize[] = ['kpi', 'small', 'medium', 'large', 'full'];

  // 2. Resolve each authorized widget with precedence
  // User preference overrides Company default overrides Registry default
  const resolvedWidgets: ResolvedDashboardWidget[] = [];

  for (const widget of authorizedWidgets) {
    const userPref = userPrefMap.get(widget.id);
    const companyPref = companyDefaultMap.get(widget.id);
    const zone = getWidgetZone(widget);

    let visible = true;
    let order = widget.priority;
    let resolvedSize = widget.preferredSize;
    let collapsed = false;

    if (userPref) {
      // User preference wins
      if (typeof userPref.visible === 'boolean') {
        visible = userPref.visible;
      } else if (companyPref && typeof companyPref.visible === 'boolean') {
        visible = companyPref.visible;
      }
      if (typeof userPref.order === 'number') {
        order = userPref.order;
      } else if (companyPref && typeof companyPref.order === 'number') {
        order = companyPref.order;
      }
      if (userPref.size && allowedSizes.includes(userPref.size)) {
        resolvedSize = userPref.size;
      } else if (companyPref?.size && allowedSizes.includes(companyPref.size)) {
        resolvedSize = companyPref.size;
      }
      if (typeof userPref.collapsed === 'boolean') {
        collapsed = userPref.collapsed;
      }
    } else if (companyPref) {
      // Company default applies
      if (typeof companyPref.visible === 'boolean') {
        visible = companyPref.visible;
      }
      if (typeof companyPref.order === 'number') {
        order = companyPref.order;
      }
      if (companyPref.size && allowedSizes.includes(companyPref.size)) {
        resolvedSize = companyPref.size;
      }
      if (typeof companyPref.collapsed === 'boolean') {
        collapsed = companyPref.collapsed;
      }
    } else {
      // Registry default applies
      visible = true;
      order = widget.priority;
      resolvedSize = widget.preferredSize;
      collapsed = false;
    }

    resolvedWidgets.push({
      ...widget,
      visible,
      order,
      resolvedSize,
      collapsed,
      zone,
    });
  }

  // 3. Stable sorting: Sort by resolved order, then priority, then title
  resolvedWidgets.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.title.localeCompare(b.title);
  });

  // Re-index sequential order within the final list
  resolvedWidgets.forEach((w, index) => {
    w.order = index + 1;
  });

  // 4. Partition into layout zones
  const zones: ResolvedDashboardResult['zones'] = {
    kpi: [],
    analytics: [],
    secondary: [],
    tables: [],
    actions: [],
  };

  for (const widget of resolvedWidgets) {
    zones[widget.zone].push(widget);
  }

  // 5. Resolve dynamic Quick Actions
  const quickActions = getActiveQuickActions({
    installedAppSlugs,
    userPermissions,
    companySlug,
  });

  return {
    widgets: resolvedWidgets,
    quickActions,
    zones,
  };
}
