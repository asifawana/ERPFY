import { database, failure, json, body, ApiError, auditStatement } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  resolvePlugin,
  listAvailableCategoryTemplates,
} from '@/lib/content/category-plugins';
import { SECTORS } from '@/lib/content/industries';
import { validateModuleToggle } from '@/lib/modules/engine';

function queryParam(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);
  return value && value.length <= 128 ? value : null;
}

function findSectorForIndustry(industrySlug: string): string {
  for (const sector of SECTORS) {
    if (sector.industries.some((ind) => ind.slug === industrySlug)) {
      return sector.slug;
    }
  }
  return '';
}

/**
 * Returns the category-driven module list for a company, based on its stored
 * industry/sector. Includes all available modules with their active status,
 * disabled module IDs, category name, and template registry for switching.
 *
 * GET /api/apps/category-modules?companyId=xxx
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = queryParam(request, 'companyId');

    if (!companyId) {
      return json({
        modules: [],
        allModules: [],
        categoryName: '',
        industrySlug: '',
        sectorSlug: '',
        disabledModuleIds: [],
        availableTemplates: listAvailableCategoryTemplates(),
      });
    }

    const company = await requireCompanyAccess(db, viewer.accountId, companyId);

    const row = await db
      .prepare(
        `SELECT industry_slug, sector_slug FROM core_companies WHERE id = ?1`,
      )
      .bind(companyId)
      .first<{ industry_slug: string; sector_slug: string }>();

    const industrySlug = row?.industry_slug ?? '';
    const sectorSlug = row?.sector_slug ?? '';

    let disabledModuleIds: string[] = [];
    const settingsRow = await db
      .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
      .bind(companyId)
      .first<{ data: string }>();

    if (settingsRow?.data) {
      try {
        const parsed = JSON.parse(settingsRow.data);
        if (Array.isArray(parsed.disabledCategoryModules)) {
          disabledModuleIds = parsed.disabledCategoryModules;
        }
      } catch {
        // ignore
      }
    }

    const plugin = resolvePlugin(industrySlug, sectorSlug);
    const disabledSet = new Set(disabledModuleIds);

    const allModules = plugin.modules.map((m) => ({
      ...m,
      href: m.href.replace(/:slug/g, company.slug),
      isActive: !disabledSet.has(m.id),
    }));

    const activeModules = allModules.filter((m) => m.isActive);

    return json({
      modules: activeModules,
      allModules,
      categoryName: plugin.name,
      industrySlug,
      sectorSlug,
      disabledModuleIds,
      terminology: plugin.terminology ?? {},
      availableTemplates: listAvailableCategoryTemplates(),
    });
  } catch (error) {
    return failure(error);
  }
}

/**
 * Mutates category configuration:
 * 1. action: 'toggle-module' -> turn a specific category module on/off
 * 2. action: 'set-category' -> switch company industry/sector ERP template
 * 3. action: 'reset-modules' -> restore all category modules to default active state
 *
 * POST /api/apps/category-modules
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId : null;
    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    const company = await requireCompanyAccess(db, viewer.accountId, companyId);
    if (company.role !== 'owner' && company.role !== 'administrator') {
      throw new ApiError(403, 'Only owners and admins can configure business category modules.');
    }


    const action = typeof payload.action === 'string' ? payload.action : '';

    // Read current settings
    const settingsRow = await db
      .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
      .bind(companyId)
      .first<{ data: string }>();

    let settingsDoc: Record<string, unknown> = {};
    if (settingsRow?.data) {
      try {
        settingsDoc = JSON.parse(settingsRow.data);
      } catch {
        settingsDoc = {};
      }
    }

    let disabledModuleIds: string[] = Array.isArray(settingsDoc.disabledCategoryModules)
      ? (settingsDoc.disabledCategoryModules as string[])
      : [];

    const now = Date.now();

    if (action === 'toggle-module') {
      const moduleId = typeof payload.moduleId === 'string' ? payload.moduleId.trim() : '';
      const enabled = Boolean(payload.enabled);
      if (!moduleId) {
        throw new ApiError(400, 'Module ID is required.');
      }

      // Check dependencies before toggling
      const compRow = await db
        .prepare(`SELECT industry_slug, sector_slug FROM core_companies WHERE id = ?1`)
        .bind(companyId)
        .first<{ industry_slug: string; sector_slug: string }>();
      const currentPlugin = resolvePlugin(compRow?.industry_slug ?? '', compRow?.sector_slug ?? '');
      const activeIds = currentPlugin.modules
        .map((m) => m.id)
        .filter((id) => !disabledModuleIds.includes(id));

      const validation = validateModuleToggle(moduleId, enabled, activeIds);
      if (!validation.allowed) {
        throw new ApiError(400, validation.reason || 'Module dependency constraint violated.');
      }

      if (enabled) {
        disabledModuleIds = disabledModuleIds.filter((id) => id !== moduleId);
      } else {
        if (!disabledModuleIds.includes(moduleId)) {
          disabledModuleIds.push(moduleId);
        }
      }

      settingsDoc.disabledCategoryModules = disabledModuleIds;

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
          .bind(companyId, JSON.stringify(settingsDoc), now, viewer.accountId),
        auditStatement(db, {
          companyId,
          accountId: viewer.accountId,
          action: 'category.module.toggled',
          detail: `${enabled ? 'Enabled' : 'Disabled'} category module "${moduleId}"`,
        }),
      ]);
    } else if (action === 'set-category') {
      const industrySlug = typeof payload.industrySlug === 'string' ? payload.industrySlug.trim() : '';
      if (!industrySlug) {
        throw new ApiError(400, 'Industry slug is required.');
      }
      const sectorSlug =
        typeof payload.sectorSlug === 'string' && payload.sectorSlug.trim()
          ? payload.sectorSlug.trim()
          : findSectorForIndustry(industrySlug);

      // Reset disabled modules when switching category so the new template starts fresh
      disabledModuleIds = [];
      settingsDoc.disabledCategoryModules = disabledModuleIds;

      await db.batch([
        db
          .prepare(
            `UPDATE core_companies SET industry_slug = ?1, sector_slug = ?2 WHERE id = ?3`,
          )
          .bind(industrySlug, sectorSlug, companyId),
        db
          .prepare(
            `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT (company_id) DO UPDATE SET
               data = excluded.data,
               updated_at = excluded.updated_at,
               updated_by = excluded.updated_by`,
          )
          .bind(companyId, JSON.stringify(settingsDoc), now, viewer.accountId),
        auditStatement(db, {
          companyId,
          accountId: viewer.accountId,
          action: 'category.template.changed',
          detail: `Changed business category ERP to "${industrySlug}"`,
        }),
      ]);
    } else if (action === 'reset-modules') {
      disabledModuleIds = [];
      settingsDoc.disabledCategoryModules = disabledModuleIds;

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
          .bind(companyId, JSON.stringify(settingsDoc), now, viewer.accountId),
        auditStatement(db, {
          companyId,
          accountId: viewer.accountId,
          action: 'category.modules.reset',
          detail: 'Reset all category modules to default active state',
        }),
      ]);
    } else {
      throw new ApiError(400, `Unknown action: "${action}"`);
    }

    // Read updated company category
    const row = await db
      .prepare(`SELECT industry_slug, sector_slug FROM core_companies WHERE id = ?1`)
      .bind(companyId)
      .first<{ industry_slug: string; sector_slug: string }>();

    const industrySlug = row?.industry_slug ?? '';
    const sectorSlug = row?.sector_slug ?? '';
    const plugin = resolvePlugin(industrySlug, sectorSlug);
    const disabledSet = new Set(disabledModuleIds);

    const allModules = plugin.modules.map((m) => ({
      ...m,
      href: m.href.replace(/:slug/g, company.slug),
      isActive: !disabledSet.has(m.id),
    }));

    return json({
      ok: true,
      modules: allModules.filter((m) => m.isActive),
      allModules,
      categoryName: plugin.name,
      industrySlug,
      sectorSlug,
      disabledModuleIds,
      terminology: plugin.terminology ?? {},
      availableTemplates: listAvailableCategoryTemplates(),
    });
  } catch (error) {
    return failure(error);
  }
}
