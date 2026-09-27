/**
 * Category Management & Admin Registry Layer
 * Preserves the 22 core blueprints while providing admin-managed customizations and dynamic categories.
 */

import { getAllBlueprints, getBlueprintByCategory, type ERPBlueprint } from '@/lib/blueprints/registry';
import type { D1Database } from '@cloudflare/workers-types';

export interface AdminCategoryDefinition extends Partial<ERPBlueprint> {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  isCustom?: boolean;
  isActive?: boolean;
  featureFlags?: Record<string, boolean>;
  recommendedModules?: string[];
  requiredModules?: string[];
  optionalModules?: string[];
  dashboardWidgets?: string[];
}

const SETTINGS_KEY = 'platform.categories_registry';

/**
 * Returns merged category blueprints (built-in 22 blueprints + admin overrides / custom categories).
 */
export async function getAdminCategories(db?: D1Database): Promise<AdminCategoryDefinition[]> {
  const builtIn = getAllBlueprints().map((b) => ({
    ...b,
    isCustom: false,
    isActive: true,
  }));

  if (!db) return builtIn;

  try {
    const row = await db
      .prepare(`SELECT data FROM core_company_settings WHERE company_id = '__platform__' LIMIT 1`)
      .first<{ data: string }>();

    if (!row?.data) return builtIn;
    const doc = JSON.parse(row.data);
    const overrides: Record<string, AdminCategoryDefinition> = doc[SETTINGS_KEY] || {};

    const merged = new Map<string, AdminCategoryDefinition>();
    for (const cat of builtIn) {
      merged.set(cat.slug, cat);
    }
    for (const [slug, customCat] of Object.entries(overrides)) {
      const existing = merged.get(slug);
      if (existing) {
        merged.set(slug, { ...existing, ...customCat });
      } else {
        merged.set(slug, { ...customCat, isCustom: true, isActive: customCat.isActive !== false });
      }
    }

    return Array.from(merged.values());
  } catch {
    return builtIn;
  }
}

/**
 * Saves or updates a category definition in the platform settings.
 */
export async function saveAdminCategory(
  db: D1Database,
  category: AdminCategoryDefinition,
  actorId: string,
): Promise<AdminCategoryDefinition> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = '__platform__' LIMIT 1`)
    .first<{ data: string }>();

  let doc: Record<string, unknown> = {};
  if (row?.data) {
    try {
      doc = JSON.parse(row.data);
    } catch {
      doc = {};
    }
  }

  const registry: Record<string, AdminCategoryDefinition> = (doc[SETTINGS_KEY] as Record<string, AdminCategoryDefinition>) || {};
  registry[category.slug] = {
    ...category,
    isActive: category.isActive !== false,
  };
  doc[SETTINGS_KEY] = registry;

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES ('__platform__', ?1, ?2, ?3)
       ON CONFLICT (company_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(JSON.stringify(doc), Date.now(), actorId)
    .run();

  return registry[category.slug];
}
