import { body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import {
  loadTenantPluginSettings,
  saveTenantPluginSettings,
} from '@/lib/settings/plugin-settings';
import { getTenantInstalledApps } from '@/lib/eap/installation';

function companyParam(request: Request): string | null {
  const value = new URL(request.url).searchParams.get('companyId');
  return value && value.length <= 64 ? value : null;
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = companyParam(request);

    if (!companyId) {
      return json({ pluginSettings: [], installedSlugs: [] });
    }

    const [pluginSettings, installedApps] = await Promise.all([
      loadTenantPluginSettings(db, viewer.accountId, companyId),
      getTenantInstalledApps(db, companyId).catch(() => []),
    ]);

    const installedSlugs = installedApps
      .filter((a) => a.status === 'installed')
      .map((a) => a.slug);

    return json({ pluginSettings, installedSlugs });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);
    const viewer = await requireViewer(db, request.headers);

    const companyId =
      typeof data.companyId === 'string' ? data.companyId : companyParam(request);
    const pluginSlug = typeof data.pluginSlug === 'string' ? data.pluginSlug : '';
    const settings =
      data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
        ? (data.settings as Record<string, unknown>)
        : {};

    if (!companyId) {
      return json({ error: 'Company context is required to save plugin settings.' }, 400);
    }

    if (!pluginSlug) {
      return json({ error: 'Plugin slug is required.' }, 400);
    }

    const result = await saveTenantPluginSettings(
      db,
      viewer.accountId,
      companyId,
      pluginSlug,
      settings,
    );

    return json(result);
  } catch (error) {
    return failure(error);
  }
}
