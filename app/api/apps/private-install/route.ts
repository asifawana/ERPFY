import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { getQuarantinedPackage } from '@/lib/eap/quarantine';
import { validatePlatformBinding, verifyPluginEntitlement } from '@/lib/eap/platform-binding';
import { signReleaseBuild } from '@/lib/eap/signing';
import { installTenantApp } from '@/lib/eap/installation';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);

    const appId = field(data, 'appId', { max: 64 });
    const version = field(data, 'version', { max: 32 });
    const companyId = field(data, 'companyId', { max: 64 });
    const grantedScopes = Array.isArray(data.grantedScopes)
      ? (data.grantedScopes as string[])
      : [];

    // 1. Verify company membership & administrative authority
    const membership = await db
      .prepare(
        `SELECT role, status FROM core_memberships
          WHERE account_id = ?1 AND company_id = ?2 AND status = 'active'
          LIMIT 1`,
      )
      .bind(viewer.accountId, companyId)
      .first<{ role: string; status: string }>();

    if (!membership) {
      return failure(new ApiError(403, 'Company workspace not found or access denied.'));
    }

    const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'administrator';
    if (!isOwnerOrAdmin) {
      const perm = await db
        .prepare(
          `SELECT 1 FROM core_role_permissions rp
             JOIN core_roles r ON r.id = rp.role_id
            WHERE r.company_id = ?1 AND r.name = ?2
              AND rp.permission_key IN ('integrations.manage', 'apps.manage', 'apps.upload_private')
            LIMIT 1`,
        )
        .bind(companyId, membership.role)
        .first();

      if (!perm) {
        return failure(
          new ApiError(403, 'Permission denied: installing private plugins requires administrative privileges.'),
        );
      }
    }

    // 2. Retrieve quarantined package and cryptographically verify hash
    const quarantined = await getQuarantinedPackage(appId, version);
    if (!quarantined) {
      return failure(
        new ApiError(400, 'Quarantined package bundle not found or expired. Please upload the plugin again.'),
      );
    }

    // 3. Re-verify platform binding and entitlement for this company
    validatePlatformBinding(quarantined.manifest);
    verifyPluginEntitlement(quarantined.manifest, companyId);

    // 4. Perform trusted server-side cryptographic release signing
    const platformSecret =
      (globalThis as unknown as { __erpTestSecretKey?: string }).__erpTestSecretKey ||
      process.env.ERPFY_SECRET_KEY ||
      'erpfy-platform-master-signing-key';

    const signed = signReleaseBuild(
      appId,
      version,
      quarantined.packageHash,
      platformSecret,
    );

    const now = Date.now();

    // 5. Ensure organization exists
    const isOfficialFirstParty =
      quarantined.manifest.developer_id === 'erpfy.core' ||
      appId.startsWith('erpfy.');

    let orgId = `org_priv_${companyId.slice(0, 16)}`;
    if (isOfficialFirstParty) {
      orgId = 'org_erpfy_official';
      await db
        .prepare(
          `INSERT OR IGNORE INTO eap_dev_organizations
            (id, name, slug, status, website, support_email, created_at)
           VALUES ('org_erpfy_official', 'ERPFY', 'erpfy-official', 'verified', 'https://erpfy.com', 'support@erpfy.com', ?1)`,
        )
        .bind(now)
        .run();
    } else {
      const existingOrg = await db
        .prepare('SELECT id FROM eap_dev_organizations WHERE id = ?1')
        .bind(orgId)
        .first();

      if (!existingOrg) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO eap_dev_organizations
              (id, name, slug, status, website, support_email, created_at)
             VALUES (?1, ?2, ?3, 'verified', '', '', ?4)`,
          )
          .bind(orgId, 'Private Tenant Apps', `tenant-${companyId.slice(0, 8)}-${now}`, now)
          .run();
      }
    }

    // 6. Ensure eap_apps record exists with appropriate classification
    const existingApp = await db
      .prepare('SELECT id, is_killed FROM eap_apps WHERE id = ?1')
      .bind(appId)
      .first<{ id: string; is_killed: number }>();

    if (existingApp?.is_killed === 1) {
      return failure(new ApiError(403, 'This application has been suspended globally by platform security.'));
    }

    const manifestJson = JSON.stringify(quarantined.manifest);

    const manifestMeta = quarantined.manifest as unknown as Record<string, unknown>;
    const description = typeof manifestMeta.description === 'string' ? manifestMeta.description : 'Official ERPFY foundation plugin';
    const category = typeof manifestMeta.category === 'string' ? manifestMeta.category : 'CRM';
    const iconUrl = typeof manifestMeta.icon === 'string' ? manifestMeta.icon : '';

    const appType = isOfficialFirstParty ? 'first_party' : 'private';
    const officialApp = isOfficialFirstParty ? 1 : 0;
    const status = isOfficialFirstParty ? 'published' : 'private';

    if (!existingApp) {
      await db
        .prepare(
          `INSERT INTO eap_apps
            (id, organization_id, slug, name, short_description, full_description,
             category, app_type, official_app, pricing_type, price_amount, icon_url,
             status, created_by_account_id, first_uploaded_at, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'free', 0, ?10, ?11, ?12, ?13, ?13, ?13)`,
        )
        .bind(
          appId,
          orgId,
          quarantined.manifest.slug || appId,
          quarantined.manifest.name,
          description,
          description,
          category,
          appType,
          officialApp,
          iconUrl,
          status,
          viewer.accountId,
          now,
        )
        .run();
    } else {
      await db
        .prepare(
          `UPDATE eap_apps
              SET organization_id = ?1, app_type = ?2, official_app = ?3, status = ?4, updated_at = ?5
            WHERE id = ?6`,
        )
        .bind(orgId, appType, officialApp, status, now, appId)
        .run();
    }

    // 7. Ensure eap_app_versions has signed record with review_status = 'private_approved'
    const existingVersion = await db
      .prepare('SELECT id FROM eap_app_versions WHERE app_id = ?1 AND version = ?2')
      .bind(appId, version)
      .first<{ id: string }>();

    let versionId = existingVersion?.id;
    if (!versionId) {
      versionId = `ver_${crypto.randomBytes(10).toString('hex')}`;
      await db
        .prepare(
          `INSERT INTO eap_app_versions
            (id, app_id, version, protocol, min_platform_version, manifest_json, changelog,
             package_hash, signature, release_id, review_status, created_at, approved_at, published_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'private_approved', ?11, ?12, ?12)`,
        )
        .bind(
          versionId,
          appId,
          version,
          quarantined.manifest.protocol || 'eap-v1',
          quarantined.manifest.minimum_platform_version || '1.0.0',
          manifestJson,
          'Private direct install',
          quarantined.packageHash,
          signed.signature,
          signed.releaseId,
          now,
          signed.signedAt,
        )
        .run();
    } else {
      await db
        .prepare(
          `UPDATE eap_app_versions
              SET package_hash = ?1, signature = ?2, release_id = ?3,
                  manifest_json = ?4, review_status = 'private_approved',
                  approved_at = ?5, published_at = ?5
            WHERE id = ?6`,
        )
        .bind(quarantined.packageHash, signed.signature, signed.releaseId, manifestJson, signed.signedAt, versionId)
        .run();
    }

    // 8. Invoke standard tenant installation service
    const effectivePermissions = grantedScopes.length > 0
      ? grantedScopes
      : (quarantined.manifest.permissions || []);

    const installation = await installTenantApp(db, {
      companyId,
      appId,
      accountId: viewer.accountId,
      grantedPermissions: effectivePermissions,
    });

    // 9. Record audit trail
    await db
      .prepare(
        `INSERT INTO eap_app_audit_logs
          (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
         VALUES (?1, ?2, 'user', ?3, ?4, 'private_plugin.installed', ?5, ?6)`,
      )
      .bind(
        `audit_${crypto.randomBytes(12).toString('hex')}`,
        viewer.accountId,
        appId,
        versionId,
        JSON.stringify({ companyId, version, packageHash: quarantined.packageHash }),
        now,
      )
      .run();

    return json({
      success: true,
      message: 'Private plugin successfully installed and verified for this workspace.',
      installation,
    });
  } catch (error) {
    return failure(error);
  }
}
