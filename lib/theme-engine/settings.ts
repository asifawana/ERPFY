/**
 * ERPfy.net — Theme Settings Storage & Resolution Engine
 * Authority: ERPfy.net Complete Implementation Master Specification (§11, §12)
 *
 * Supports multi-tenant theme switching, section configuration, and persistence.
 */

import { auditStatement } from '../core/server.ts';
import { DEFAULT_THEME_SETTINGS, type StoreThemeSettings } from './types';

export interface ThemeSummary {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  defaultColors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: string;
}

export const AVAILABLE_THEMES: Record<string, ThemeSummary> = {
  'portal-default': {
    id: 'portal-default',
    name: 'Portal Default',
    version: '1.0.0',
    author: 'ERPfy Design Team',
    description: 'High-converting modern ecommerce theme with responsive product grids and slide-over cart drawer.',
    defaultColors: {
      primary: '#15803d',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#171717',
    },
    typography: 'Inter, -apple-system, sans-serif',
  },
  'boutique-luxury': {
    id: 'boutique-luxury',
    name: 'Boutique Luxury',
    version: '1.0.0',
    author: 'ERPfy Design Studio',
    description: 'Sophisticated aesthetic with serif typography, editorial lookbooks, and warm gold luxury accents.',
    defaultColors: {
      primary: '#b45309',
      accent: '#d97706',
      background: '#fffbeb',
      text: '#1c1917',
    },
    typography: 'Playfair Display, Georgia, serif',
  },
};

/**
 * Returns all available themes in the platform.
 */
export function listAvailableThemes(): ThemeSummary[] {
  return Object.values(AVAILABLE_THEMES);
}

/**
 * Loads customized theme settings for a company workspace, falling back to defaults.
 */
export async function getStoreThemeSettings(
  db: D1Database,
  companyId: string,
): Promise<StoreThemeSettings> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!row?.data) return DEFAULT_THEME_SETTINGS;

  try {
    const doc = JSON.parse(row.data);
    if (doc.storeThemeSettings && typeof doc.storeThemeSettings === 'object') {
      const activeThemeId = doc.storeThemeSettings.themeId || DEFAULT_THEME_SETTINGS.themeId;
      const themeMeta = AVAILABLE_THEMES[activeThemeId] || AVAILABLE_THEMES['portal-default'];

      const rawColors = doc.storeThemeSettings.colors || {};
      const brandPrimary = rawColors.brandPrimary || rawColors.primary || themeMeta.defaultColors.primary;
      const primary = rawColors.primary || brandPrimary;

      const rawTypo = doc.storeThemeSettings.typography || {};
      const fontFamily = rawTypo.fontFamily || rawTypo.headingFont || themeMeta.typography;
      const headingFont = rawTypo.headingFont || fontFamily;
      const bodyFont = rawTypo.bodyFont || fontFamily;

      return {
        ...DEFAULT_THEME_SETTINGS,
        themeId: activeThemeId,
        ...doc.storeThemeSettings,
        colors: {
          ...DEFAULT_THEME_SETTINGS.colors,
          ...rawColors,
          brandPrimary,
          primary,
          accent: rawColors.accent || themeMeta.defaultColors.accent,
          background: rawColors.background || themeMeta.defaultColors.background,
          text: rawColors.text || themeMeta.defaultColors.text,
        },
        typography: {
          ...DEFAULT_THEME_SETTINGS.typography,
          ...rawTypo,
          headingFont,
          bodyFont,
          fontFamily,
        },
        header: { ...DEFAULT_THEME_SETTINGS.header, ...(doc.storeThemeSettings.header || {}) },
        footer: { ...DEFAULT_THEME_SETTINGS.footer, ...(doc.storeThemeSettings.footer || {}) },
        sections: Array.isArray(doc.storeThemeSettings.sections)
          ? doc.storeThemeSettings.sections
          : DEFAULT_THEME_SETTINGS.sections,
      };
    }
    return DEFAULT_THEME_SETTINGS;
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

/**
 * Persists customized theme settings for a company workspace.
 */
export async function saveStoreThemeSettings(
  db: D1Database,
  companyId: string,
  settings: StoreThemeSettings,
  accountId: string,
): Promise<StoreThemeSettings> {
  const now = Date.now();
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  let doc: Record<string, unknown> = {};
  if (row?.data) {
    try {
      doc = JSON.parse(row.data);
    } catch {
      doc = {};
    }
  }

  const rawColors = settings.colors || {};
  const brandPrimary = rawColors.brandPrimary || rawColors.primary || '#1e5631';
  const primary = rawColors.primary || brandPrimary;
  const rawTypo = settings.typography || {};
  const fontFamily = rawTypo.fontFamily || rawTypo.headingFont || 'Inter, sans-serif';
  const headingFont = rawTypo.headingFont || fontFamily;
  const bodyFont = rawTypo.bodyFont || fontFamily;

  const normalizedSettings: StoreThemeSettings = {
    ...settings,
    colors: {
      ...rawColors,
      brandPrimary,
      primary,
    },
    typography: {
      ...rawTypo,
      headingFont,
      bodyFont,
      fontFamily,
    },
  };

  doc.storeThemeSettings = normalizedSettings;

  await db.batch([
    db
      .prepare(
        `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (company_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(companyId, JSON.stringify(doc), now, accountId),
    auditStatement(db, {
      companyId,
      accountId,
      action: 'store.theme.customized',
      detail: `Updated storefront theme settings for theme "${settings.themeId}"`,
    }),
  ]);

  return normalizedSettings;
}

/**
 * Loads draft customized theme settings (if any), falling back to published settings.
 */
export async function getDraftThemeSettings(
  db: D1Database,
  companyId: string,
): Promise<{ draft: StoreThemeSettings | null; published: StoreThemeSettings }> {
  const published = await getStoreThemeSettings(db, companyId);
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!row?.data) return { draft: null, published };

  try {
    const doc = JSON.parse(row.data);
    const draft = doc.draftThemeSettings && typeof doc.draftThemeSettings === 'object'
      ? (doc.draftThemeSettings as StoreThemeSettings)
      : null;
    return { draft, published };
  } catch {
    return { draft: null, published };
  }
}

/**
 * Saves draft theme settings without modifying the live storefront.
 */
export async function saveDraftThemeSettings(
  db: D1Database,
  companyId: string,
  settings: StoreThemeSettings,
  accountId: string,
): Promise<StoreThemeSettings> {
  const now = Date.now();
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  let doc: Record<string, unknown> = {};
  if (row?.data) {
    try {
      doc = JSON.parse(row.data);
    } catch {
      doc = {};
    }
  }

  doc.draftThemeSettings = settings;

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (company_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(companyId, JSON.stringify(doc), now, accountId)
    .run();

  return settings;
}

/**
 * Reverts draft changes back to live published theme settings.
 */
export async function revertDraftTheme(
  db: D1Database,
  companyId: string,
  accountId: string,
): Promise<StoreThemeSettings> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (row?.data) {
    try {
      const doc = JSON.parse(row.data);
      delete doc.draftThemeSettings;
      await db
        .prepare(`UPDATE core_company_settings SET data = ?1, updated_at = ?2, updated_by = ?3 WHERE company_id = ?4`)
        .bind(JSON.stringify(doc), Date.now(), accountId, companyId)
        .run();
    } catch {
      // Ignored
    }
  }

  return getStoreThemeSettings(db, companyId);
}

/**
 * Switches and activates a theme for a company workspace.
 */
export async function publishTheme(
  db: D1Database,
  companyId: string,
  themeId: string,
  accountId: string,
): Promise<StoreThemeSettings> {
  const theme = AVAILABLE_THEMES[themeId];
  if (!theme) {
    throw new Error(`Theme "${themeId}" is not registered in the theme catalog.`);
  }

  const current = await getStoreThemeSettings(db, companyId);
  const updated: StoreThemeSettings = {
    ...current,
    themeId,
    colors: {
      ...current.colors,
      brandPrimary: theme.defaultColors.primary || current.colors.brandPrimary,
      primary: theme.defaultColors.primary || current.colors.primary,
      accent: theme.defaultColors.accent || current.colors.accent,
      background: theme.defaultColors.background || current.colors.background,
      text: theme.defaultColors.text || current.colors.text,
    },
    typography: {
      ...current.typography,
      headingFont: theme.typography,
      bodyFont: theme.typography,
      fontFamily: theme.typography,
    },
  };


  return saveStoreThemeSettings(db, companyId, updated, accountId);
}

