/**
 * ERPFY Theme Engine & Registry
 *
 * Equivalent to WordPress theme management, but built for TypeScript & React.
 * Manages registered themes, active theme selection, and theme switching.
 */

import portalDefault from '@/erp-content/themes/portal-default/theme.json';

export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive';
  supports: {
    customHeaderColor?: boolean;
    darkMode?: boolean;
    sidebarCollapsible?: boolean;
  };
  defaultPreset?: string;
  presets?: Array<{ name: string; color: string }>;
}

/** Registry of all themes installed in erp-content/themes/ */
const INSTALLED_THEMES: Record<string, ThemeManifest> = {
  'portal-default': portalDefault as ThemeManifest,
};

let activeThemeId = 'portal-default';

export function getInstalledThemes(): ThemeManifest[] {
  return Object.values(INSTALLED_THEMES);
}

export function getActiveTheme(): ThemeManifest {
  return INSTALLED_THEMES[activeThemeId] || INSTALLED_THEMES['portal-default'];
}

export function setActiveTheme(themeId: string): boolean {
  if (INSTALLED_THEMES[themeId]) {
    activeThemeId = themeId;
    return true;
  }
  return false;
}

export function registerTheme(manifest: ThemeManifest): void {
  INSTALLED_THEMES[manifest.id] = manifest;
}
