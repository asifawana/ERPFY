import crypto from 'node:crypto';
import { ApiError } from '../core/server';
import { authorize } from '../core/authorization';
import { requireCompanyAccess } from '../core/company';
import type { EapManifest, EapNavigationItem } from './manifest';
import { verifyReleaseSignature } from './signing';
import { getQuarantinedPackage } from './quarantine';
import { isLegacySampleApp } from './catalog-policy';
import { validatePlatformBinding, verifyPluginEntitlement } from './platform-binding';

export type TenantInstalledApp = {
  installationId: string;
  appId: string;
  slug: string;
  name: string;
  category: string;
  iconUrl: string;
  officialApp: boolean;
  version: string;
  versionId: string;
  status: 'installed' | 'disabled' | 'uninstalled';
  grantedPermissions: string[];
  configuration: Record<string, unknown>;
  installedAt: number;
};

/**
 * Installs an approved EAP application for a tenant.
 */
export async function installTenantApp(
  db: D1Database,
  {
    companyId,
    appId,
    accountId,
    grantedPermissions,
    initialConfiguration = {},
  }: {
    companyId: string;
    appId: string;
    accountId: string;
    grantedPermissions: string[];
    initialConfiguration?: Record<string, unknown>;
  },
): Promise<TenantInstalledApp> {
  if (isLegacySampleApp(appId)) {
    throw new ApiError(409, 'This sample application is not available for installation.');
  }

  // 1. Fetch app record
  const app = await db
    .prepare(
      `SELECT id, slug, name, category, icon_url, official_app, app_type, status, is_killed
         FROM eap_apps
        WHERE id = ?1`,
    )
    .bind(appId)
    .first<{
      id: string;
      slug: string;
      name: string;
      category: string;
      icon_url: string;
      official_app: number;
      app_type: string;
      status: string;
      is_killed: number;
    }>();

  if (!app) {
    throw new ApiError(404, 'Application not found.');
  }

  if (app.is_killed === 1) {
    throw new ApiError(403, 'This application has been suspended globally by platform security.');
  }

  const isPrivateInstall = app.app_type === 'private' && (app.status === 'private' || app.status === 'approved');
  if (app.status !== 'published' && !isPrivateInstall) {
    throw new ApiError(400, 'Only published applications can be installed by customers.');
  }

  // 2. Fetch latest published & signed version
  const version = await db
    .prepare(
      `SELECT id, version, manifest_json, package_hash, signature, release_id, approved_at, published_at
         FROM eap_app_versions
        WHERE app_id = ?1 AND review_status IN ('published', 'approved', 'private_approved')
        ORDER BY created_at DESC
        LIMIT 1`,
    )
    .bind(appId)
    .first<{
      id: string;
      version: string;
      manifest_json: string;
      package_hash: string;
      signature: string;
      release_id: string;
      approved_at: number | null;
      published_at: number | null;
    }>();

  if (!version) {
    throw new ApiError(400, 'No approved or published release found for this application.');
  }

  if (!version.signature || !version.release_id || !version.package_hash) {
    throw new ApiError(400, 'Unsigned release: cryptographic release metadata is missing.');
  }

  // 3. Cryptographic release signature verification (Trust Boundary Enforcement)
  const platformSecret =
    (globalThis as unknown as { __erpTestSecretKey?: string }).__erpTestSecretKey ||
    process.env.ERPFY_SECRET_KEY ||
    'erpfy-platform-master-signing-key';
  const signedAt = version.published_at || version.approved_at || 0;
  const isSignatureValid = verifyReleaseSignature(
    appId,
    version.version,
    version.package_hash,
    signedAt,
    version.release_id,
    version.signature,
    platformSecret,
  );

  if (!isSignatureValid) {
    throw new ApiError(400, 'Cryptographic verification failed: tampered release or invalid platform signature.');
  }

  // 4. Verify hash match against stored quarantine bundle if present
  try {
    const quarantined = await getQuarantinedPackage(appId, version.version);
    if (quarantined && quarantined.packageHash !== version.package_hash) {
      throw new ApiError(400, 'Package hash mismatch: quarantined bundle has been tampered.');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  const manifest = JSON.parse(version.manifest_json) as EapManifest;

  // 4b. Enforce ERPFY platform binding and private plugin entitlement
  validatePlatformBinding(manifest);
  verifyPluginEntitlement(manifest, companyId);

  // Check required dependencies
  if (Array.isArray(manifest.dependencies)) {
    for (const dep of manifest.dependencies) {
      if (dep.required !== false) {
        const depInstalled = await db
          .prepare(
            `SELECT id FROM eap_app_installations
              WHERE company_id = ?1 AND app_id = ?2 AND status = 'installed'`,
          )
          .bind(companyId, dep.app_id)
          .first<{ id: string }>();
        if (!depInstalled) {
          throw new ApiError(400, `Required dependency '${dep.app_id}' must be installed first.`);
        }
      }
    }
  }

  const requiredPerms: string[] = Array.isArray(manifest.permissions)
    ? manifest.permissions
    : (((manifest.permissions as Record<string, unknown> | undefined)?.requiredScopes as string[]) || []);

  for (const perm of requiredPerms) {
    if (!grantedPermissions.includes(perm)) {
      throw new ApiError(400, `Permission '${perm}' must be approved to install this application.`);
    }
  }

  const now = Date.now();
  const existing = await db
    .prepare(
      `SELECT id, status FROM eap_app_installations
        WHERE company_id = ?1 AND app_id = ?2`,
    )
    .bind(companyId, appId)
    .first<{ id: string; status: string }>();

  let installationId = existing?.id;

  if (existing) {
    await db
      .prepare(
        `UPDATE eap_app_installations
            SET version_id = ?1,
                status = 'installed',
                granted_permissions = ?2,
                configuration = ?3,
                updated_at = ?4,
                uninstalled_at = NULL
          WHERE id = ?5`,
      )
      .bind(
        version.id,
        JSON.stringify(grantedPermissions),
        JSON.stringify(initialConfiguration),
        now,
        existing.id,
      )
      .run();
  } else {
    installationId = `inst_${crypto.randomBytes(12).toString('hex')}`;
    await db
      .prepare(
        `INSERT INTO eap_app_installations
          (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'installed', ?6, ?7, ?8, ?8)`,
      )
      .bind(
        installationId,
        companyId,
        appId,
        version.id,
        accountId,
        JSON.stringify(grantedPermissions),
        JSON.stringify(initialConfiguration),
        now,
      )
      .run();
  }

  // Record audit log
  await db
    .prepare(
      `INSERT INTO eap_app_audit_logs
        (id, actor_id, actor_type, app_id, version_id, company_id, action, details, created_at)
       VALUES (?1, ?2, 'tenant_user', ?3, ?4, ?5, 'app.installed', ?6, ?7)`,
    )
    .bind(
      `audit_${crypto.randomBytes(12).toString('hex')}`,
      accountId,
      appId,
      version.id,
      companyId,
      JSON.stringify({ grantedPermissions, version: version.version }),
      now,
    )
    .run();

  // Provision default role permissions for owner & admin
  await provisionInstalledPluginPermissions(db, companyId, grantedPermissions, accountId);

  return {
    installationId: installationId!,
    appId,
    slug: app.slug,
    name: app.name,
    category: app.category,
    iconUrl: app.icon_url,
    officialApp: app.official_app === 1,
    version: version.version,
    versionId: version.id,
    status: 'installed',
    grantedPermissions,
    configuration: initialConfiguration,
    installedAt: now,
  };
}

/**
 * Provisions granted plugin permissions into core_permissions, core_roles, and core_role_permissions
 * for company owner and administrator roles, strictly adhering to relational RBAC.
 */
export async function provisionInstalledPluginPermissions(
  db: D1Database,
  companyId: string,
  grantedPermissions: string[],
  actorAccountId: string,
): Promise<void> {
  if (!grantedPermissions || grantedPermissions.length === 0) return;
  const now = Date.now();

  // 1. Ensure permissions exist in core_permissions catalog
  for (const perm of grantedPermissions) {
    if (typeof perm !== 'string' || !perm.trim()) continue;
    await db
      .prepare(
        `INSERT OR IGNORE INTO core_permissions (key, description, created_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(perm, `Permission for ${perm}`, now)
      .run();
  }

  // 2. Ensure company has Owner and Admin roles
  let ownerRole = await db
    .prepare(`SELECT id FROM core_roles WHERE company_id = ?1 AND key = 'owner' LIMIT 1`)
    .bind(companyId)
    .first<{ id: string }>();

  if (!ownerRole) {
    const ownerRoleId = `role_${crypto.randomBytes(10).toString('hex')}`;
    await db
      .prepare(
        `INSERT INTO core_roles (id, company_id, key, name, is_system, created_at)
         VALUES (?1, ?2, 'owner', 'Owner', 1, ?3)`,
      )
      .bind(ownerRoleId, companyId, now)
      .run();
    ownerRole = { id: ownerRoleId };
  }

  let adminRole = await db
    .prepare(`SELECT id FROM core_roles WHERE company_id = ?1 AND key = 'admin' LIMIT 1`)
    .bind(companyId)
    .first<{ id: string }>();

  if (!adminRole) {
    const adminRoleId = `role_${crypto.randomBytes(10).toString('hex')}`;
    await db
      .prepare(
        `INSERT INTO core_roles (id, company_id, key, name, is_system, created_at)
         VALUES (?1, ?2, 'admin', 'Administrator', 1, ?3)`,
      )
      .bind(adminRoleId, companyId, now)
      .run();
    adminRole = { id: adminRoleId };
  }

  // Base platform permissions that owner and administrator roles always possess
  const BASE_ROLES_PERMS = [
    'settings.view',
    'settings.manage',
    'integrations.manage',
    'apps.manage',
    'apps.upload_private',
  ];
  for (const bp of BASE_ROLES_PERMS) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO core_permissions (key, description, created_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(bp, `Base platform permission: ${bp}`, now)
      .run();

    await db
      .prepare(
        `INSERT OR IGNORE INTO core_role_permissions (role_id, permission_key, effect, scope)
         VALUES (?1, ?2, 'allow', 'COMPANY')`,
      )
      .bind(ownerRole.id, bp)
      .run();

    await db
      .prepare(
        `INSERT OR IGNORE INTO core_role_permissions (role_id, permission_key, effect, scope)
         VALUES (?1, ?2, 'allow', 'COMPANY')`,
      )
      .bind(adminRole.id, bp)
      .run();
  }

  // 3. Assign active owners & admins to their corresponding relational roles
  const activeMembers = await db
    .prepare(
      `SELECT account_id, role FROM core_memberships
        WHERE company_id = ?1 AND status = 'active'`,
    )
    .bind(companyId)
    .all<{ account_id: string; role: string }>();

  for (const member of activeMembers.results || []) {
    const roleId =
      member.role === 'owner'
        ? ownerRole.id
        : member.role === 'administrator' || member.role === 'admin'
        ? adminRole.id
        : null;

    if (roleId) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO core_membership_roles
            (company_id, account_id, role_id, assigned_at, assigned_by)
           VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(companyId, member.account_id, roleId, now, actorAccountId || member.account_id)
        .run();
    }
  }

  // 4. Provision granted permissions to Owner and Admin roles
  for (const perm of grantedPermissions) {
    if (typeof perm !== 'string' || !perm.trim()) continue;

    // Grant to Owner
    await db
      .prepare(
        `INSERT OR REPLACE INTO core_role_permissions (role_id, permission_key, effect, scope)
         VALUES (?1, ?2, 'allow', 'COMPANY')`,
      )
      .bind(ownerRole.id, perm)
      .run();

    // Grant to Admin
    await db
      .prepare(
        `INSERT OR REPLACE INTO core_role_permissions (role_id, permission_key, effect, scope)
         VALUES (?1, ?2, 'allow', 'COMPANY')`,
      )
      .bind(adminRole.id, perm)
      .run();
  }
}

/**
 * Uninstalls an installed application cleanly from a tenant workspace.
 */
export async function uninstallTenantApp(
  db: D1Database,
  {
    companyId,
    appId,
    accountId,
  }: {
    companyId: string;
    appId: string;
    accountId: string;
  },
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id, version_id FROM eap_app_installations
        WHERE company_id = ?1 AND app_id = ?2 AND status IN ('installed', 'disabled')`,
    )
    .bind(companyId, appId)
    .first<{ id: string; version_id: string }>();

  if (!existing) {
    throw new ApiError(404, 'Application is not currently installed or active.');
  }

  // Verify no other active installed app on this company depends on this app
  const otherInstalls = await db
    .prepare(
      `SELECT i.app_id, v.manifest_json, a.name
         FROM eap_app_installations i
         JOIN eap_app_versions v ON v.id = i.version_id
         JOIN eap_apps a ON a.id = i.app_id
        WHERE i.company_id = ?1 AND i.status = 'installed' AND i.app_id != ?2`,
    )
    .bind(companyId, appId)
    .all<{ app_id: string; manifest_json: string; name: string }>();

  for (const row of otherInstalls.results ?? []) {
    try {
      const manifest = JSON.parse(row.manifest_json);
      if (Array.isArray(manifest.dependencies)) {
        const dep = manifest.dependencies.find(
          (d: { app_id?: string; required?: boolean }) => d.app_id === appId && d.required !== false,
        );
        if (dep) {
          throw new ApiError(400, `Cannot uninstall: '${row.name}' requires this application.`);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  const now = Date.now();

  await db
    .prepare(
      `UPDATE eap_app_installations
          SET status = 'uninstalled',
              updated_at = ?1,
              uninstalled_at = ?1
        WHERE id = ?2`,
    )
    .bind(now, existing.id)
    .run();

  // Disable any active webhooks for this tenant and app
  await db
    .prepare(
      `UPDATE eap_app_webhooks
          SET status = 'disabled'
        WHERE company_id = ?1 AND app_id = ?2`,
    )
    .bind(companyId, appId)
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO eap_app_audit_logs
        (id, actor_id, actor_type, app_id, version_id, company_id, action, details, created_at)
       VALUES (?1, ?2, 'tenant_user', ?3, ?4, ?5, 'app.uninstalled', '{}', ?6)`,
    )
    .bind(
      `audit_${crypto.randomBytes(12).toString('hex')}`,
      accountId,
      appId,
      existing.version_id,
      companyId,
      now,
    )
    .run();
}

/**
 * Returns all active installed applications for a company.
 */
export async function getTenantInstalledApps(
  db: D1Database,
  companyId: string,
  options?: { includeDisabled?: boolean },
): Promise<TenantInstalledApp[]> {
  const statusFilter = options?.includeDisabled
    ? `i.status IN ('installed', 'disabled')`
    : `i.status = 'installed'`;
  const { results } = await db
    .prepare(
      `SELECT i.id as installation_id,
              i.app_id,
              a.slug,
              a.name,
              a.category,
              a.icon_url,
              a.official_app,
              v.version,
              v.id as version_id,
              i.status,
              i.granted_permissions,
              i.configuration,
              i.installed_at
         FROM eap_app_installations i
         JOIN eap_apps a ON a.id = i.app_id
         JOIN eap_app_versions v ON v.id = i.version_id
        WHERE i.company_id = ?1 AND ${statusFilter} AND a.is_killed = 0
        ORDER BY i.installed_at DESC`,
    )
    .bind(companyId)
    .all<{
      installation_id: string;
      app_id: string;
      slug: string;
      name: string;
      category: string;
      icon_url: string;
      official_app: number;
      version: string;
      version_id: string;
      status: 'installed' | 'disabled';
      granted_permissions: string;
      configuration: string;
      installed_at: number;
    }>();

  return (results || []).map((row) => ({
    installationId: row.installation_id,
    appId: row.app_id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    iconUrl: row.icon_url,
    officialApp: row.official_app === 1,
    version: row.version,
    versionId: row.version_id,
    status: row.status,
    grantedPermissions: JSON.parse(row.granted_permissions || '[]'),
    configuration: JSON.parse(row.configuration || '{}'),
    installedAt: row.installed_at,
  }));
}

/**
 * Computes dynamic navigation items contributed by all active installed apps for a company.
 */
export async function getTenantAppNavigation(
  db: D1Database,
  companyId: string,
): Promise<EapNavigationItem[]> {
  const { results } = await db
    .prepare(
      `SELECT v.manifest_json
         FROM eap_app_installations i
         JOIN eap_apps a ON a.id = i.app_id
         JOIN eap_app_versions v ON v.id = i.version_id
        WHERE i.company_id = ?1 AND i.status = 'installed' AND a.is_killed = 0`,
    )
    .bind(companyId)
    .all<{ manifest_json: string }>();

  const items: EapNavigationItem[] = [];
  for (const row of results || []) {
    try {
      const manifest = JSON.parse(row.manifest_json) as EapManifest;
      if (Array.isArray(manifest.navigation)) {
        for (const nav of manifest.navigation) {
          if (nav.label && nav.href) {
            items.push(nav);
          }
        }
      }
    } catch {
      // Ignore malformed individual manifest
    }
  }

  return items;
}

export type DynamicSidebarNavItem = {
  /** Stable namespaced identity: plugin:<pluginSlug>:<navId> */
  id: string;
  rawId: string;
  pluginSlug: string;
  label: string;
  href: string;
  icon?: string;
  group?: string;
  position: 'main' | 'footer';
  permission?: string;
};

function hasRouteControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint < 32 || codePoint === 127;
  });
}

/**
 * Plugin destinations belong below the current company's route. Validate the
 * pathname before browser normalization so traversal and encoded separators
 * cannot escape the tenant or disguise a core destination.
 */
export function isSafePluginRoute(href: string, companySlug?: string): boolean {
  if (!companySlug || typeof href !== 'string' || /[\s\\]/.test(href) || hasRouteControlCharacter(href)) return false;
  const pathname = href.split(/[?#]/, 1)[0];
  const prefix = `/c/${companySlug}/`;
  if (!pathname.startsWith(prefix) || pathname === prefix) return false;

  try {
    for (const segment of pathname.split('/').slice(1)) {
      const decoded = decodeURIComponent(segment);
      if (!decoded || decoded === '.' || decoded === '..' || /[%/\\\s]/.test(decoded) || hasRouteControlCharacter(decoded)) {
        return false;
      }
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * Computes authorized, safe, deduplicated dynamic navigation items contributed by all
 * active installed apps for a company, strictly enforcing RBAC and company isolation (Rule 2-8).
 */
export async function getAuthorizedTenantAppNavigation(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<DynamicSidebarNavItem[]> {
  // Membership applies even to launchers without an additional permission.
  // The URL slug is company metadata, never a caller-controlled tenant selector.
  const { slug: companySlug } = await requireCompanyAccess(db, accountId, companyId);

  const { results } = await db
    .prepare(
      `SELECT a.id as app_id, a.slug as app_slug, v.manifest_json
         FROM eap_app_installations i
         JOIN eap_apps a ON a.id = i.app_id
         JOIN eap_app_versions v ON v.id = i.version_id AND v.app_id = a.id
        WHERE i.company_id = ?1 AND i.status = 'installed' AND a.is_killed = 0
          AND a.status IN ('published', 'private') AND v.review_status IN ('approved', 'published', 'private_approved')
        ORDER BY a.name ASC`,
    )
    .bind(companyId)
    .all<{ app_id: string; app_slug: string; manifest_json: string }>();

  const items: DynamicSidebarNavItem[] = [];
  const seenIds = new Set<string>();

  for (const row of results || []) {
    if (isLegacySampleApp(row.app_id)) continue;
    try {
      const manifest = JSON.parse(row.manifest_json) as EapManifest;
      if (!Array.isArray(manifest.navigation)) continue;

      // Check dependencies if any
      if (manifest.dependencies && Array.isArray(manifest.dependencies)) {
        let dependenciesSatisfied = true;
        for (const dep of manifest.dependencies) {
          if (dep.required === false) continue;
          const depInstalled = await db
            .prepare(
              `SELECT i.id FROM eap_app_installations i
                 JOIN eap_apps a ON a.id = i.app_id
                 JOIN eap_app_versions v ON v.id = i.version_id AND v.app_id = a.id
                WHERE i.company_id = ?1 AND i.app_id = ?2 AND i.status = 'installed'
                  AND a.is_killed = 0 AND a.status IN ('published', 'private')
                  AND v.review_status IN ('approved', 'published', 'private_approved')`,
            )
            .bind(companyId, dep.app_id)
            .first();
          if (!depInstalled) {
            dependenciesSatisfied = false;
            break;
          }
        }
        if (!dependenciesSatisfied) continue;
      }

      for (const nav of manifest.navigation) {
        if (!nav || typeof nav.label !== 'string' || !nav.label.trim() || typeof nav.href !== 'string') continue;

        // Resolve route, replacing :companySlug placeholder if used
        let resolvedHref = nav.href.replace(/:companySlug/g, companySlug);
        if (resolvedHref.startsWith('/c/[slug]')) {
          resolvedHref = resolvedHref.replace('/c/[slug]', `/c/${companySlug}`);
        }

        // Validate safe route
        if (!isSafePluginRoute(resolvedHref, companySlug)) {
          continue;
        }

        // Permission check
        if (nav.permission !== undefined) {
          if (typeof nav.permission !== 'string' || !/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/.test(nav.permission)) continue;
          const auth = await authorize(db, accountId, companyId, nav.permission);
          if (!auth.allowed) {
            continue;
          }
        }

        // Stable namespaced ID: plugin:<slug>:<rawId>
        const rawId = typeof nav.id === 'string' && nav.id.trim()
          ? nav.id
          : nav.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const stableId = `plugin:${row.app_slug}:${rawId}`;

        // Deduplicate
        if (seenIds.has(stableId)) continue;
        seenIds.add(stableId);

        items.push({
          id: stableId,
          rawId,
          pluginSlug: row.app_slug,
          label: nav.label,
          href: resolvedHref,
          icon: typeof nav.icon === 'string' ? nav.icon : undefined,
          group: typeof nav.group === 'string' ? nav.group : undefined,
          position: nav.position === 'footer' ? 'footer' : 'main',
          permission: nav.permission,
        });
      }
    } catch {
      // Ignore individual malformed manifest
    }
  }

  return items;
}
