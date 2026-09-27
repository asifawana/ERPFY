import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getStoreThemeSettings,
  saveStoreThemeSettings,
  getDraftThemeSettings,
  saveDraftThemeSettings,
  revertDraftTheme,
  listAvailableThemes,
  publishTheme,
} from '@/lib/theme-engine/settings';
import type { StoreThemeSettings } from '@/lib/theme-engine/types';

function queryParam(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);
  return value && value.length <= 128 ? value : null;
}

/**
 * GET /api/ecommerce/theme?companyId=xxx
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const companyId = queryParam(request, 'companyId');
    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    const { draft, published } = await getDraftThemeSettings(db, companyId);
    const availableThemes = listAvailableThemes();

    return json({ ok: true, settings: published, draft, availableThemes });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/ecommerce/theme
 * Updates visual theme customizer settings or publishes/activates/drafts a theme.
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
      throw new ApiError(403, 'Only owners and admins can customize storefront themes.');
    }

    if (payload.action === 'publish') {
      const themeId = typeof payload.themeId === 'string' ? payload.themeId.trim() : '';
      if (!themeId) {
        throw new ApiError(400, 'Theme ID is required to publish.');
      }
      const updated = await publishTheme(db, companyId, themeId, viewer.accountId);
      return json({ ok: true, settings: updated });
    }

    if (payload.action === 'revert_draft') {
      const reverted = await revertDraftTheme(db, companyId, viewer.accountId);
      return json({ ok: true, settings: reverted });
    }

    const settings = payload.settings as StoreThemeSettings;
    if (!settings || typeof settings !== 'object') {
      throw new ApiError(400, 'Theme settings object is required.');
    }

    if (payload.action === 'save_draft') {
      const savedDraft = await saveDraftThemeSettings(db, companyId, settings, viewer.accountId);
      return json({ ok: true, draft: savedDraft });
    }

    const saved = await saveStoreThemeSettings(db, companyId, settings, viewer.accountId);
    return json({ ok: true, settings: saved });
  } catch (error) {
    return failure(error);
  }
}
