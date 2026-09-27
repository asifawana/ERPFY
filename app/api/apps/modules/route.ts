import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { LEGACY_SAMPLE_APP_IDS } from '@/lib/eap/catalog-policy';

export interface DynamicModuleItem {
  id: string;
  appId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  version: string;
  appType: 'public' | 'private';
  isPrivate: boolean;
  status:
    | 'active'
    | 'disabled'
    | 'not_installed'
    | 'dependency_missing'
    | 'killed'
    | 'update_available';
  isInstalled: boolean;
  isActive: boolean;
  canToggle: boolean;
  missingDependencies: string[];
  isKilled: boolean;
  killReason?: string | null;
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    const url = new URL(request.url);
    const requestedCompanyId = url.searchParams.get('companyId');

    if (!requestedCompanyId) {
      return json({ error: 'Company ID is required.' }, 400);
    }

    // Tenant isolation & access verification
    await requireCompanyAccess(db, viewer.accountId, requestedCompanyId);
    const companyId = requestedCompanyId;

    // Check permissions
    const [authApps, authInteg, authSettings] = await Promise.all([
      authorize(db, viewer.accountId, companyId, 'apps.manage').catch(() => ({ allowed: false })),
      authorize(db, viewer.accountId, companyId, 'integrations.manage').catch(() => ({ allowed: false })),
      authorize(db, viewer.accountId, companyId, 'settings.manage').catch(() => ({ allowed: false })),
    ]);
    const canManage = Boolean(authApps.allowed || authInteg.allowed || authSettings.allowed);

    // 1. Fetch all installations for this company (installed and disabled)
    const { results: rawInstalls } = await db
      .prepare(
        `SELECT i.id as installation_id,
                i.app_id,
                i.version_id,
                i.status as install_status,
                i.installed_at,
                i.updated_at,
                a.slug as app_slug,
                a.name as app_name,
                a.short_description,
                a.category,
                a.icon_url,
                a.app_type,
                a.is_killed,
                a.kill_reason,
                v.version as installed_version,
                v.manifest_json
           FROM eap_app_installations i
           JOIN eap_apps a ON a.id = i.app_id
           JOIN eap_app_versions v ON v.id = i.version_id
          WHERE i.company_id = ?1 AND i.status IN ('installed', 'disabled')
          ORDER BY a.name ASC`,
      )
      .bind(companyId)
      .all<{
        installation_id: string;
        app_id: string;
        version_id: string;
        install_status: string;
        installed_at: number;
        updated_at: number;
        app_slug: string;
        app_name: string;
        short_description: string;
        category: string;
        icon_url: string;
        app_type: string;
        is_killed: number;
        kill_reason: string | null;
        installed_version: string;
        manifest_json: string;
      }>();

    const installedAppIds = new Set<string>();
    const activeAppIds = new Set<string>();

    for (const inst of rawInstalls || []) {
      installedAppIds.add(inst.app_id);
      if (inst.install_status === 'installed' && inst.is_killed === 0) {
        activeAppIds.add(inst.app_id);
      }
    }

    const modules: DynamicModuleItem[] = [];

    // Process installed apps
    for (const inst of rawInstalls || []) {
      if (LEGACY_SAMPLE_APP_IDS.includes(inst.app_id as unknown as (typeof LEGACY_SAMPLE_APP_IDS)[number])) continue;

      const missingDeps: string[] = [];
      let isDependencyMissing = false;

      try {
        const manifest = JSON.parse(inst.manifest_json || '{}');
        if (Array.isArray(manifest.dependencies)) {
          for (const dep of manifest.dependencies) {
            if (dep && dep.required !== false && dep.app_id) {
              if (!activeAppIds.has(dep.app_id)) {
                isDependencyMissing = true;
                missingDeps.push(dep.app_id);
              }
            }
          }
        }
      } catch {}

      const isKilled = inst.is_killed === 1;
      const isInstalled = true;
      const isActive = inst.install_status === 'installed' && !isKilled;

      let status: DynamicModuleItem['status'] = isActive ? 'active' : 'disabled';
      if (isKilled) {
        status = 'killed';
      } else if (isDependencyMissing && isActive) {
        status = 'dependency_missing';
      }

      const canToggle = !isKilled && (!isDependencyMissing || !isActive);

      modules.push({
        id: inst.app_id,
        appId: inst.app_slug || inst.app_id,
        slug: inst.app_slug,
        name: inst.app_name,
        description: inst.short_description || '',
        category: inst.category || 'Business',
        iconUrl: inst.icon_url || '',
        version: inst.installed_version || '1.0.0',
        appType: (inst.app_type as 'public' | 'private') || 'public',
        isPrivate: inst.app_type === 'private',
        status,
        isInstalled,
        isActive,
        canToggle,
        missingDependencies: missingDeps,
        isKilled,
        killReason: inst.kill_reason,
      });
    }

    // 2. Fetch published store catalog apps that are NOT installed
    const storeParams: (string | number)[] = [...LEGACY_SAMPLE_APP_IDS, companyId];
    const { results: rawCatalog } = await db
      .prepare(
        `SELECT a.id, a.slug, a.name, a.short_description, a.category,
                a.icon_url, a.app_type, a.is_killed, a.kill_reason,
                (SELECT v.version FROM eap_app_versions v 
                  WHERE v.app_id = a.id AND v.review_status IN ('published', 'approved', 'private_approved')
                  ORDER BY v.created_at DESC LIMIT 1) as latest_version
           FROM eap_apps a
          WHERE (a.status = 'published' AND a.app_type = 'public')
            AND a.id NOT IN (${LEGACY_SAMPLE_APP_IDS.map((_, i) => `?${i + 1}`).join(', ')})
            AND a.id NOT IN (
              SELECT app_id FROM eap_app_installations 
               WHERE company_id = ?${storeParams.length} AND status IN ('installed', 'disabled')
            )
          ORDER BY a.official_app DESC, a.name ASC`,
      )
      .bind(...storeParams)
      .all<{
        id: string;
        slug: string;
        name: string;
        short_description: string;
        category: string;
        icon_url: string;
        app_type: string;
        is_killed: number;
        kill_reason: string | null;
        latest_version: string | null;
      }>();

    for (const cat of rawCatalog || []) {
      modules.push({
        id: cat.id,
        appId: cat.slug || cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.short_description || '',
        category: cat.category || 'Business',
        iconUrl: cat.icon_url || '',
        version: cat.latest_version || '1.0.0',
        appType: (cat.app_type as 'public' | 'private') || 'public',
        isPrivate: cat.app_type === 'private',
        status: 'not_installed',
        isInstalled: false,
        isActive: false,
        canToggle: false,
        missingDependencies: [],
        isKilled: cat.is_killed === 1,
        killReason: cat.kill_reason,
      });
    }

    return json({ success: true, modules, canManage });
  } catch (error) {
    return failure(error);
  }
}
