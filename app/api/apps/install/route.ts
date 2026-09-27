import { body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { isLegacySampleApp } from '@/lib/eap/catalog-policy';
import {
  installTenantApp,
  uninstallTenantApp,
  getTenantInstalledApps,
} from '@/lib/eap/installation';

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    const url = new URL(request.url);
    const requestedCompanyId = url.searchParams.get('companyId');
    let companyId: string | null = null;

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

    if (!companyId) {
      return json({ apps: [] });
    }

    const apps = await getTenantInstalledApps(db, companyId);
    return json({ apps });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    const data = await body(request);
    const action = field(data, 'action', { max: 30 });
    const appId = typeof data.appId === 'string' ? data.appId : '';
    const requestedCompanyId = typeof data.companyId === 'string' ? data.companyId : null;

    let companyId: string | null = null;
    if (requestedCompanyId) {
      const mem = await db
        .prepare(
          `SELECT company_id FROM core_memberships
            WHERE account_id = ?1 AND company_id = ?2 AND status = 'active'
            LIMIT 1`,
        )
        .bind(viewer.accountId, requestedCompanyId)
        .first<{ company_id: string }>();
      if (!mem) {
        return json({ error: 'Company not found or access denied.' }, 403);
      }
      companyId = mem.company_id;
    } else {
      const mem = await db
        .prepare(
          `SELECT company_id FROM core_memberships
            WHERE account_id = ?1 AND status = 'active'
            LIMIT 1`,
        )
        .bind(viewer.accountId)
        .first<{ company_id: string }>();
      if (!mem) {
        return json({ error: 'No active company workspace found for this user.' }, 403);
      }
      companyId = mem.company_id;
    }

    // RBAC: Require apps.manage, integrations.manage, or settings.manage
    const [authApps, authInteg, authSettings] = await Promise.all([
      authorize(db, viewer.accountId, companyId, 'apps.manage').catch(() => ({ allowed: false })),
      authorize(db, viewer.accountId, companyId, 'integrations.manage').catch(() => ({ allowed: false })),
      authorize(db, viewer.accountId, companyId, 'settings.manage').catch(() => ({ allowed: false })),
    ]);
    if (!authApps.allowed && !authInteg.allowed && !authSettings.allowed) {
      return json({ error: 'Permission denied: apps.manage or integrations.manage required.' }, 403);
    }

    if (action === 'enable-all') {
      const now = Date.now();
      const eligible = await db
        .prepare(
          `SELECT i.id, i.app_id
             FROM eap_app_installations i
             JOIN eap_apps a ON a.id = i.app_id
            WHERE i.company_id = ?1 AND i.status = 'disabled' AND a.is_killed = 0`,
        )
        .bind(companyId)
        .all<{ id: string; app_id: string }>();

      let enabledCount = 0;
      for (const row of eligible.results ?? []) {
        if (isLegacySampleApp(row.app_id)) continue;
        await db
          .prepare(
            `UPDATE eap_app_installations SET status = 'installed', updated_at = ?1 WHERE id = ?2`,
          )
          .bind(now, row.id)
          .run();
        enabledCount++;
      }
      return json({ success: true, count: enabledCount });
    }

    if (action === 'disable-all') {
      const now = Date.now();
      const res = await db
        .prepare(
          `UPDATE eap_app_installations
              SET status = 'disabled', updated_at = ?1
            WHERE company_id = ?2 AND status = 'installed'`,
        )
        .bind(now, companyId)
        .run();
      return json({ success: true, count: res.meta?.changes ?? 0 });
    }

    if (!appId) {
      return json({ error: 'appId is required.' }, 400);
    }

    if (action === 'install') {
      const grantedPermissions = Array.isArray(data.grantedScopes)
        ? (data.grantedScopes as string[])
        : [];

      const installation = await installTenantApp(db, {
        companyId,
        appId,
        accountId: viewer.accountId,
        grantedPermissions,
      });

      return json({
        success: true,
        message: 'App installation saved for this company.',
        installation,
      });
    }

    if (action === 'uninstall') {
      await uninstallTenantApp(db, {
        companyId,
        appId,
        accountId: viewer.accountId,
      });

      return json({
        success: true,
        message: 'App successfully uninstalled.',
      });
    }

    if (action === 'toggle' || action === 'disable' || action === 'enable') {
      const appRow = await db
        .prepare(`SELECT id, slug, name, is_killed, kill_reason FROM eap_apps WHERE id = ?1 OR slug = ?1`)
        .bind(appId)
        .first<{ id: string; slug: string; name: string; is_killed: number; kill_reason: string | null }>();

      const targetAppId = appRow?.id || appId;
      const targetSlug = appRow?.slug || appId;

      const existing = await db
        .prepare(
          `SELECT id, status, version_id, app_id FROM eap_app_installations
            WHERE company_id = ?1 AND (app_id = ?2 OR app_id = ?3)`,
        )
        .bind(companyId, appId, targetAppId)
        .first<{ id: string; status: string; version_id: string; app_id: string }>();

      if (!existing) {
        return json({ error: 'Installation record not found.' }, 404);
      }

      let newStatus: string;
      if (action === 'disable') {
        newStatus = 'disabled';
      } else if (action === 'enable') {
        newStatus = 'installed';
      } else {
        newStatus = existing.status === 'installed' ? 'disabled' : 'installed';
      }

      if (newStatus === 'installed') {
        if (isLegacySampleApp(targetAppId) || isLegacySampleApp(targetSlug)) {
          return json({ error: 'This sample application is not available for activation.' }, 409);
        }

        // Killswitch protection: cannot activate if killed/revoked
        if (appRow?.is_killed) {
          return json({ error: 'Cannot activate: This application has been suspended by platform administrators.' }, 403);
        }

        // Dependency protection on enable
        const versionRow = await db
          .prepare(`SELECT manifest_json FROM eap_app_versions WHERE id = ?1`)
          .bind(existing.version_id)
          .first<{ manifest_json: string }>();

        if (versionRow) {
          try {
            const manifest = JSON.parse(versionRow.manifest_json || '{}');
            if (Array.isArray(manifest.dependencies)) {
              for (const dep of manifest.dependencies) {
                if (dep && dep.required !== false && dep.app_id) {
                  const depInstalled = await db
                    .prepare(
                      `SELECT i.id FROM eap_app_installations i
                         JOIN eap_apps a ON a.id = i.app_id
                        WHERE i.company_id = ?1 AND (i.app_id = ?2 OR a.slug = ?2) AND i.status = 'installed'
                          AND a.is_killed = 0`,
                    )
                    .bind(companyId, dep.app_id)
                    .first();
                  if (!depInstalled) {
                    return json(
                      { error: `Cannot enable: Required dependency '${dep.app_id}' is not active.` },
                      400,
                    );
                  }
                }
              }
            }
          } catch {}
        }
      }

      if (newStatus === 'disabled') {
        const otherInstalls = await db
          .prepare(
            `SELECT i.app_id, v.manifest_json, a.name, a.slug
               FROM eap_app_installations i
               JOIN eap_app_versions v ON v.id = i.version_id
               JOIN eap_apps a ON a.id = i.app_id
              WHERE i.company_id = ?1 AND i.status = 'installed' AND i.app_id != ?2`,
          )
          .bind(companyId, targetAppId)
          .all<{ app_id: string; manifest_json: string; name: string; slug: string }>();

        for (const row of otherInstalls.results ?? []) {
          try {
            const manifest = JSON.parse(row.manifest_json);
            let dependsOnThis = false;
            if (Array.isArray(manifest.dependencies)) {
              dependsOnThis = manifest.dependencies.some(
                (d: { app_id?: string; required?: boolean }) =>
                  (d.app_id === targetAppId || d.app_id === targetSlug || d.app_id === appId) && d.required !== false,
              );
            } else if (manifest.dependencies && typeof manifest.dependencies === 'object') {
              dependsOnThis = Boolean(
                manifest.dependencies[targetAppId] ||
                manifest.dependencies[targetSlug] ||
                manifest.dependencies[appId],
              );
            }

            if (dependsOnThis) {
              return json(
                { error: `Cannot disable app because active installed apps depend on it: ${row.name}` },
                409,
              );
            }
          } catch {}
        }
      }

      const now = Date.now();

      await db
        .prepare(
          `UPDATE eap_app_installations
              SET status = ?1, updated_at = ?2
            WHERE id = ?3`,
        )
        .bind(newStatus, now, existing.id)
        .run();

      return json({
        success: true,
        enabled: newStatus === 'installed',
        status: newStatus,
        installation: {
          id: existing.id,
          appId: targetSlug || targetAppId,
          status: newStatus,
        },
      });
    }

    if (action === 'update') {
      const targetVersion = typeof data.targetVersion === 'string' ? data.targetVersion.trim() : '';
      if (!targetVersion) {
        return json({ error: 'targetVersion is required for update.' }, 400);
      }

      // Check existing installation
      const existing = await db
        .prepare(
          `SELECT i.id, i.version_id, v.version, v.package_hash
             FROM eap_app_installations i
             JOIN eap_app_versions v ON v.id = i.version_id
            WHERE i.company_id = ?1 AND i.app_id = ?2`,
        )
        .bind(companyId, appId)
        .first<{ id: string; version_id: string; version: string; package_hash: string }>();

      if (!existing) {
        return json({ error: 'Application is not currently installed.' }, 404);
      }

      // Find new version to update to
      const newVersion = await db
        .prepare(
          `SELECT id, version, package_hash, signature, release_id
             FROM eap_app_versions
            WHERE app_id = ?1 AND version = ?2 AND review_status IN ('published', 'approved', 'private_approved')`,
        )
        .bind(appId, targetVersion)
        .first<{ id: string; version: string; package_hash: string; signature: string; release_id: string }>();

      if (!newVersion) {
        return json({ error: `Version ${targetVersion} not found or not approved.` }, 400);
      }

      // Requirement 18 & 19: Never silently overwrite same version + different hash
      if (existing.version === newVersion.version && existing.package_hash !== newVersion.package_hash) {
        return json({ error: 'Integrity violation: version hash conflict detected.' }, 400);
      }

      const now = Date.now();
      await db
        .prepare(
          `UPDATE eap_app_installations
              SET version_id = ?1, status = 'installed', updated_at = ?2
            WHERE id = ?3`,
        )
        .bind(newVersion.id, now, existing.id)
        .run();

      return json({
        success: true,
        message: `Application updated to version ${newVersion.version}.`,
        version: newVersion.version,
      });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (error) {
    return failure(error);
  }
}
