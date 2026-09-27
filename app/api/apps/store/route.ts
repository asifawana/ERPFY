import { database, failure, json } from '@/lib/core/server';
import { currentViewer } from '@/lib/core/viewer';
import { LEGACY_SAMPLE_APP_IDS } from '@/lib/eap/catalog-policy';

export async function GET(request: Request) {
  try {
    const db = database();


    const viewer = await currentViewer(db, request.headers);
    const url = new URL(request.url);
    const requestedCompanyId = url.searchParams.get('companyId');
    let companyId: string | null = null;

    if (viewer) {
      if (requestedCompanyId) {
        const mem = await db
          .prepare(
            `SELECT company_id FROM core_memberships
              WHERE account_id = ?1 AND company_id = ?2 AND status = 'active'
              LIMIT 1`,
          )
          .bind(viewer.accountId, requestedCompanyId)
          .first<{ company_id: string }>();
        companyId = mem?.company_id ?? null;
      } else {
        const mem = await db
          .prepare(
            `SELECT company_id FROM core_memberships
              WHERE account_id = ?1 AND status = 'active'
              LIMIT 1`,
          )
          .bind(viewer.accountId)
          .first<{ company_id: string }>();
        companyId = mem?.company_id ?? null;
      }
    }

    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const featuredOnly = url.searchParams.get('featured') === 'true';

    const params: (string | number)[] = [...LEGACY_SAMPLE_APP_IDS];

    // Visibility condition:
    // 1. Published public & first-party apps (always visible in store)
    // 2. Private apps: ONLY visible if companyId is provided AND (installed in companyId OR belongs to companyId's private org)
    let visibilitySql = `(a.status = 'published' AND (a.app_type IN ('public', 'first_party') OR a.official_app = 1))`;
    if (companyId) {
      params.push(companyId);
      const companyParamIdx = params.length;
      params.push(`org_priv_${companyId.slice(0, 16)}`);
      const orgParamIdx = params.length;
      visibilitySql = `(${visibilitySql} OR (a.app_type = 'private' AND (a.id IN (SELECT app_id FROM eap_app_installations WHERE company_id = ?${companyParamIdx} AND status != 'uninstalled') OR a.organization_id = ?${orgParamIdx})))`;
    }

    let sql = `
      SELECT a.id, a.slug, a.name, a.short_description, a.full_description,
             a.category, a.app_type, a.official_app, a.pricing_type, a.price_amount,
             a.icon_url, a.status, a.is_killed, a.kill_reason, a.published_at,
             o.id as org_id, o.name as org_name, o.status as org_status,
             (SELECT COUNT(*) FROM eap_app_installations i WHERE i.app_id = a.id AND i.status = 'installed') as installed_count
        FROM eap_apps a
        JOIN eap_dev_organizations o ON o.id = a.organization_id
       WHERE ${visibilitySql}
         AND a.id NOT IN (${LEGACY_SAMPLE_APP_IDS.map((_, index) => `?${index + 1}`).join(', ')})
    `;

    if (category === 'Private') {
      sql += ` AND a.app_type = 'private'`;
    } else if (category && category !== 'All') {
      params.push(category);
      sql += ` AND a.category = ?${params.length}`;
    }

    if (featuredOnly) {
      sql += ` AND a.official_app = 1`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (a.name LIKE ?${params.length} OR a.short_description LIKE ?${params.length})`;
    }

    sql += ` ORDER BY a.official_app DESC, a.created_at DESC`;

    interface StoreAppRow {
      id: string;
      slug: string;
      name: string;
      short_description: string;
      full_description: string;
      category: string;
      icon_url: string;
      app_type: string;
      pricing_type: string;
      price_amount: number;
      official_app: number;
      status: string;
      is_killed: number;
      kill_reason: string | null;
      installed_count: number;
      published_at: number | null;
      org_id: string;
      org_name: string;
      org_status: string;
    }

    const { results: appRows } = await db
      .prepare(sql)
      .bind(...params)
      .all<StoreAppRow>();

    // Query active & disabled installations for current company
    const installedMap = new Map<string, { version: string; installedAt: number; status: string }>();
    if (companyId) {
      const { results: installs } = await db
        .prepare(
          `SELECT i.app_id, i.status, i.installed_at, v.version
             FROM eap_app_installations i
             JOIN eap_app_versions v ON v.id = i.version_id
            WHERE i.company_id = ?1 AND i.status IN ('installed', 'disabled')`,
        )
        .bind(companyId)
        .all<{ app_id: string; status: string; installed_at: number; version: string }>();

      for (const inst of installs) {
        installedMap.set(inst.app_id, {
          version: inst.version,
          installedAt: inst.installed_at,
          status: inst.status,
        });
      }
    }

    // Query latest version per app
    const apps = await Promise.all(
      appRows.map(async (app) => {
        const latestVer = await db
          .prepare(
            `SELECT id, version, protocol, manifest_json, package_hash, signature, changelog, published_at
               FROM eap_app_versions
              WHERE app_id = ?1 AND review_status IN ('approved', 'published', 'private_approved')
              ORDER BY created_at DESC
              LIMIT 1`,
          )
          .bind(app.id)
          .first<{
            id: string;
            version: string;
            protocol: string;
            manifest_json: string;
            package_hash: string;
            signature: string;
            changelog: string;
            published_at: number | null;
          }>();

        let parsedManifest: Record<string, unknown> = {};
        try {
          if (latestVer?.manifest_json) {
            const value: unknown = JSON.parse(latestVer.manifest_json);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              parsedManifest = value as Record<string, unknown>;
            }
          }
        } catch {}

        const permissions = parsedManifest.permissions;
        const permissionOptions = permissions && typeof permissions === 'object' && !Array.isArray(permissions)
          ? permissions as Record<string, unknown>
          : {};
        const scopes = (value: unknown): string[] => Array.isArray(value)
          ? value.filter((scope): scope is string => typeof scope === 'string')
          : [];

        const installation = installedMap.get(app.id);

        return {
          id: app.id,
          slug: app.slug,
          name: app.name,
          tagline: app.short_description,
          description: app.full_description,
          category: app.category,
          appType: app.app_type,
          isPrivate: app.app_type === 'private',
          isFirstParty:
            app.app_type === 'first_party' ||
            app.official_app === 1 ||
            app.id === 'erpfy.contacts_crm',
          iconUrl: app.icon_url,
          pricingModel: app.pricing_type,
          priceCents: Math.round(app.price_amount * 100),
          currency: 'USD',
          isFeatured: app.official_app === 1,
          isKilled: app.is_killed === 1,
          killReason: app.kill_reason,
          ratingAverage: null,
          ratingCount: 0,
          installedCount: app.installed_count || 0,
          publishedAt: app.published_at,
          developer: {
            id: app.org_id,
            name:
              app.app_type === 'first_party' ||
              app.official_app === 1 ||
              app.id === 'erpfy.contacts_crm'
                ? 'ERPFY'
                : (app.org_name || 'Private Tenant Apps').replace(/\s*\([a-f0-9-]{8,}\)/i, ''),
            verified: app.org_status === 'verified' || app.official_app === 1,
          },
          latestVersion: latestVer
            ? {
                version: latestVer.version,
                protocol: latestVer.protocol,
                releaseDate: latestVer.published_at,
                changelog: latestVer.changelog,
                packageHash: latestVer.package_hash,
                isSigned: Boolean(latestVer.signature),
                requiredScopes: scopes(Array.isArray(permissions) ? permissions : permissionOptions.requiredScopes),
                dependencies: Array.isArray(parsedManifest?.dependencies) ? parsedManifest.dependencies : [],
                navigation: parsedManifest?.navigation || null,
              }
            : null,
          installation: installation
            ? {
                isInstalled: true,
                version: installation.version,
                enabled: installation.status === 'installed',
                installedAt: installation.installedAt,
              }
            : {
                isInstalled: false,
                version: null,
                enabled: false,
                installedAt: null,
              },
        };
      }),
    );

    return json({ apps, total: apps.length });
  } catch (error) {
    return failure(error);
  }
}
