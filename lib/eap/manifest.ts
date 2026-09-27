
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type EapExtensionType = 'dashboard_widget' | 'page_action' | 'settings_tab';

export type EapNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
  permission?: string;
  position?: 'main' | 'footer';
  group?: string;
};

export type EapExtensionItem = {
  type: EapExtensionType;
  slot: string;
  label: string;
};

export type EapSettingField = {
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  label: string;
  default?: unknown;
  options?: { label: string; value: string }[];
};

export type EapPlatformBinding = {
  id: string;
  protocol: string;
  minimum_platform_version?: string;
  plugin_id?: string;
  publisher_id?: string;
  allowed_companies?: string[];
};

export type EapManifest = {
  protocol: 'eap-v1';
  app_id: string;
  name: string;
  slug: string;
  version: string;
  minimum_platform_version: string;
  developer_id: string;
  platform?: EapPlatformBinding;
  entrypoints?: {
    client?: string;
    server?: string;
  };
  permissions: string[];
  events?: string[];
  webhooks?: {
    event: string;
    path: string;
  }[];
  navigation?: EapNavigationItem[];
  extensions?: EapExtensionItem[];
  settings?: Record<string, EapSettingField>;
  dependencies?: { app_id: string; version: string; required?: boolean }[];
  ui?: {
    design_system: 'erpfy';
    theme_inheritance: 'required';
  };
  dashboard?: {
    widgets?: {
      id: string;
      title: string;
      type?: string;
      preferred_size?: string;
      priority?: number;
      permission?: string;
      dependencies?: string[];
      empty_message?: string;
    }[];
  };
  quick_actions?: {
    id: string;
    label: string;
    href: string;
    icon?: string;
    permission?: string;
  }[];
};

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const PERMISSION_REGEX = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates an incoming EAP v1 manifest structure according to protocol rules.
 */
export function validateEapManifest(raw: unknown): EapManifest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, 'Manifest must be a valid JSON object.');
  }

  const data = raw as Record<string, unknown>;

  if (data.protocol !== 'eap-v1') {
    throw new ApiError(400, "Manifest protocol must be 'eap-v1'.");
  }

  if (typeof data.app_id !== 'string' || !data.app_id.trim()) {
    throw new ApiError(400, 'Manifest must have a valid app_id.');
  }

  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80) {
    throw new ApiError(400, 'Manifest name must be between 1 and 80 characters.');
  }

  if (typeof data.slug !== 'string' || !SLUG_REGEX.test(data.slug)) {
    throw new ApiError(400, 'Manifest slug must be lowercase alphanumeric with hyphens.');
  }

  if (typeof data.version !== 'string' || !SEMVER_REGEX.test(data.version)) {
    throw new ApiError(400, 'Manifest version must be a valid SemVer string (e.g. 1.0.0).');
  }

  if (typeof data.minimum_platform_version !== 'string' || !SEMVER_REGEX.test(data.minimum_platform_version)) {
    throw new ApiError(400, 'Manifest minimum_platform_version must be a valid SemVer string.');
  }

  if (!Array.isArray(data.permissions)) {
    throw new ApiError(400, 'Manifest permissions must be an array.');
  }

  for (const perm of data.permissions) {
    if (typeof perm !== 'string' || !PERMISSION_REGEX.test(perm)) {
      throw new ApiError(400, `Invalid permission format in manifest: '${perm}'. Expected 'module.action' or 'module.submodule.action'.`);
    }
  }

  const manifest: EapManifest = {
    protocol: 'eap-v1',
    app_id: data.app_id.trim(),
    name: data.name.trim(),
    slug: data.slug.trim(),
    version: data.version.trim(),
    minimum_platform_version: data.minimum_platform_version.trim(),
    developer_id: typeof data.developer_id === 'string' ? data.developer_id.trim() : '',
    permissions: (data.permissions as string[]).map((p) => p.trim()),
  };

  if (data.navigation && Array.isArray(data.navigation)) {
    manifest.navigation = data.navigation.map((item) => {
      const nav = item as Record<string, unknown>;
      return {
        id: typeof nav.id === 'string' ? nav.id : '',
        label: typeof nav.label === 'string' ? nav.label : '',
        href: typeof nav.href === 'string' ? nav.href : '',
        icon: typeof nav.icon === 'string' ? nav.icon : undefined,
        permission: typeof nav.permission === 'string' ? nav.permission : undefined,
        position: nav.position === 'footer' ? 'footer' : 'main',
        group: typeof nav.group === 'string' ? nav.group.trim() : undefined,
      };
    });
  }

  if (data.extensions && Array.isArray(data.extensions)) {
    manifest.extensions = data.extensions.map((item) => {
      const ext = item as Record<string, unknown>;
      return {
        type: ext.type as EapExtensionType,
        slot: typeof ext.slot === 'string' ? ext.slot : '',
        label: typeof ext.label === 'string' ? ext.label : '',
      };
    });
  }

  if (data.settings && typeof data.settings === 'object') {
    manifest.settings = data.settings as Record<string, EapSettingField>;
  }

  if (data.entrypoints && typeof data.entrypoints === 'object') {
    const ep = data.entrypoints as Record<string, unknown>;
    manifest.entrypoints = {
      client: typeof ep.client === 'string' && ep.client.trim() ? ep.client.trim() : undefined,
      server: typeof ep.server === 'string' && ep.server.trim() ? ep.server.trim() : undefined,
    };
  }

  if (data.events && Array.isArray(data.events)) {
    manifest.events = data.events.map(String);
  }

  if (data.dependencies && Array.isArray(data.dependencies)) {
    manifest.dependencies = data.dependencies.map((d) => {
      const dep = d as Record<string, unknown>;
      return {
        app_id: typeof dep.app_id === 'string' ? dep.app_id.trim() : '',
        version: typeof dep.version === 'string' ? dep.version.trim() : '1.0.0',
        required: dep.required !== false,
      };
    });
  }

  if (data.platform !== undefined) {
    if (!data.platform || typeof data.platform !== 'object' || Array.isArray(data.platform)) {
      throw new ApiError(400, 'Manifest platform declaration must be a valid object.');
    }
    const plat = data.platform as Record<string, unknown>;
    if (typeof plat.id !== 'string' || plat.id !== 'erpfy') {
      throw new ApiError(400, "Manifest platform.id must be 'erpfy'. Non-ERPFY or standalone plugins are strictly forbidden.");
    }
    if (plat.protocol !== undefined && plat.protocol !== 'eap-v1') {
      throw new ApiError(400, "Manifest platform.protocol must be 'eap-v1'.");
    }
    if (plat.minimum_platform_version !== undefined && (typeof plat.minimum_platform_version !== 'string' || !SEMVER_REGEX.test(plat.minimum_platform_version))) {
      throw new ApiError(400, 'Manifest platform.minimum_platform_version must be a valid SemVer string.');
    }
    manifest.platform = {
      id: 'erpfy',
      protocol: 'eap-v1',
      minimum_platform_version: typeof plat.minimum_platform_version === 'string' ? plat.minimum_platform_version.trim() : undefined,
      plugin_id: typeof plat.plugin_id === 'string' ? plat.plugin_id.trim() : undefined,
      publisher_id: typeof plat.publisher_id === 'string' ? plat.publisher_id.trim() : undefined,
      allowed_companies: Array.isArray(plat.allowed_companies) ? (plat.allowed_companies as string[]).map(String) : undefined,
    };
  }

  if (data.ui !== undefined) {
    if (!data.ui || typeof data.ui !== 'object' || Array.isArray(data.ui)) {
      throw new ApiError(400, 'Manifest ui declaration must be a valid object.');
    }
    const ui = data.ui as Record<string, unknown>;
    if (ui.design_system !== 'erpfy') {
      throw new ApiError(400, "Manifest ui.design_system must be 'erpfy'. Non-ERPFY design systems are forbidden.");
    }
    if (ui.theme_inheritance !== 'required') {
      throw new ApiError(400, "Manifest ui.theme_inheritance must be 'required'.");
    }
    manifest.ui = {
      design_system: 'erpfy',
      theme_inheritance: 'required',
    };
  }

  if (data.dashboard !== undefined) {
    if (!data.dashboard || typeof data.dashboard !== 'object' || Array.isArray(data.dashboard)) {
      throw new ApiError(400, 'Manifest dashboard declaration must be a valid object.');
    }
    const dash = data.dashboard as Record<string, unknown>;
    if (dash.widgets !== undefined) {
      if (!Array.isArray(dash.widgets)) {
        throw new ApiError(400, 'Manifest dashboard.widgets must be an array.');
      }
      const seenWidgetIds = new Set<string>();
      const allowedWidgetTypes = ['kpi', 'chart', 'list', 'table', 'action', 'summary', 'progress'];
      const allowedWidgetSizes = ['kpi', 'small', 'medium', 'large', 'full'];

      manifest.dashboard = {
        widgets: dash.widgets.map((item) => {
          const w = item as Record<string, unknown>;
          if (typeof w.id !== 'string' || !PERMISSION_REGEX.test(w.id)) {
            throw new ApiError(400, `Invalid widget id '${String(w.id)}' in dashboard.widgets.`);
          }
          if (seenWidgetIds.has(w.id)) {
            throw new ApiError(400, `Duplicate widget id '${w.id}' declared in dashboard.widgets.`);
          }
          seenWidgetIds.add(w.id);

          const typeStr = typeof w.type === 'string' ? w.type : JSON.stringify(w.type);
          if (w.type !== undefined && !allowedWidgetTypes.includes(typeStr)) {
            throw new ApiError(400, `Unknown widget type '${typeStr}' in dashboard.widgets.`);
          }
          const sizeStr = typeof w.preferred_size === 'string' ? w.preferred_size : JSON.stringify(w.preferred_size);
          if (w.preferred_size !== undefined && !allowedWidgetSizes.includes(sizeStr)) {
            throw new ApiError(400, `Unknown widget size '${sizeStr}' in dashboard.widgets.`);
          }
          const permStr = typeof w.permission === 'string' ? w.permission : JSON.stringify(w.permission);
          if (w.permission !== undefined && (typeof w.permission !== 'string' || !PERMISSION_REGEX.test(w.permission))) {
            throw new ApiError(400, `Invalid permission '${permStr}' in dashboard.widgets.`);
          }

          return {
            id: w.id,
            title: typeof w.title === 'string' && w.title.trim() ? w.title.trim() : w.id,
            type: typeof w.type === 'string' ? (w.type as 'kpi' | 'chart' | 'list' | 'table') : 'kpi',
            preferred_size: typeof w.preferred_size === 'string' ? (w.preferred_size as 'kpi' | 'small' | 'medium') : 'kpi',
            priority: typeof w.priority === 'number' ? w.priority : 10,
            permission: typeof w.permission === 'string' ? w.permission : undefined,
            dependencies: Array.isArray(w.dependencies) ? w.dependencies.map(String) : undefined,
            empty_message: typeof w.empty_message === 'string' ? w.empty_message : undefined,
          };
        }),
      };
    }
  }

  if (data.quick_actions !== undefined) {
    if (!Array.isArray(data.quick_actions)) {
      throw new ApiError(400, 'Manifest quick_actions must be an array.');
    }
    manifest.quick_actions = data.quick_actions.map((item) => {
      const q = item as Record<string, unknown>;
      if (typeof q.id !== 'string' || !PERMISSION_REGEX.test(q.id)) {
        throw new ApiError(400, `Invalid quick action id '${String(q.id)}'.`);
      }
      if (typeof q.label !== 'string' || !q.label.trim()) {
        throw new ApiError(400, `Quick action '${q.id}' must have a valid label.`);
      }
      if (typeof q.href !== 'string' || !q.href.trim() || !q.href.startsWith('/')) {
        throw new ApiError(400, `Quick action '${q.id}' must have a valid relative path starting with '/'.`);
      }
      return {
        id: q.id,
        label: q.label.trim(),
        href: q.href.trim(),
        icon: typeof q.icon === 'string' ? q.icon.trim() : undefined,
        permission: typeof q.permission === 'string' ? q.permission.trim() : undefined,
      };
    });
  }

  return manifest;
}

export const parsePluginManifest = validateEapManifest;

export function validatePluginManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  try {
    validateEapManifest(manifest);
    return { valid: true, errors: [] };
  } catch (err: unknown) {
    return { valid: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}
