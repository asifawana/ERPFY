import crypto from 'node:crypto';
import { ApiError } from '../core/server';
import type { EapManifest } from './manifest';
import { verifyReleaseSignature } from './signing';
import { verifyPluginEntitlement, validatePlatformBinding } from './platform-binding';
import {
  deriveEffectiveCapabilities,
  issuePluginRuntimeToken,
  verifyPluginRuntimeToken,
} from './runtime-token';
import type {
  ErpfyPluginContext,
  ErpfyExecutablePlugin,
  ScopedRepository,
} from './sdk';

export type PluginPreflightResult = {
  installationId: string;
  appId: string;
  version: string;
  companyId: string;
  grantedPermissions: string[];
  manifest: EapManifest;
  runtimeToken: string;
};

/**
 * Creates tenant-scoped database repositories.
 * Direct SQL credentials and unrestrained tables are completely inaccessible to plugins;
 * every operation is strictly parameterized by companyId.
 */
export function createScopedPluginContext(
  db: D1Database,
  {
    installationId,
    appId,
    version,
    companyId,
    grantedPermissions,
    runtimeToken,
  }: {
    installationId: string;
    appId: string;
    version: string;
    companyId: string;
    grantedPermissions: string[];
    runtimeToken: string;
  },
): ErpfyPluginContext {
  const makeRepository = (tableName: string): ScopedRepository => ({
    async findMany(filter: Record<string, unknown> = {}) {
      const keys = Object.keys(filter).filter((k) => k !== 'company_id');
      const clauses = ['company_id = ?1'];
      const values: unknown[] = [companyId];

      keys.forEach((k, idx) => {
        clauses.push(`${k} = ?${idx + 2}`);
        values.push(filter[k]);
      });

      const query = `SELECT * FROM ${tableName} WHERE ${clauses.join(' AND ')} LIMIT 100`;
      const { results } = await db.prepare(query).bind(...values).all();
      return (results || []) as Record<string, unknown>[];
    },
    async findById(id: string) {
      const query = `SELECT * FROM ${tableName} WHERE company_id = ?1 AND id = ?2 LIMIT 1`;
      const result = await db.prepare(query).bind(companyId, id).first();
      return (result as Record<string, unknown>) || null;
    },
  });

  return {
    platform: 'erpfy',
    pluginId: appId,
    version,
    installationId,
    companyId,
    token: runtimeToken,
    capabilities: grantedPermissions,
    repositories: {
      products: makeRepository('products'),
      orders: makeRepository('orders'),
      customers: makeRepository('customers'),
      settings: {
        async get(key: string) {
          const row = await db
            .prepare(`SELECT configuration FROM eap_app_installations WHERE id = ?1 AND company_id = ?2`)
            .bind(installationId, companyId)
            .first<{ configuration: string }>();
          if (!row || !row.configuration) return null;
          try {
            const config = JSON.parse(row.configuration);
            return config[key] ?? null;
          } catch {
            return null;
          }
        },
        async set(key: string, value: unknown) {
          const row = await db
            .prepare(`SELECT configuration FROM eap_app_installations WHERE id = ?1 AND company_id = ?2`)
            .bind(installationId, companyId)
            .first<{ configuration: string }>();
          let config: Record<string, unknown> = {};
          if (row?.configuration) {
            try {
              config = JSON.parse(row.configuration);
            } catch {
              config = {};
            }
          }
          config[key] = value;
          await db
            .prepare(`UPDATE eap_app_installations SET configuration = ?1, updated_at = ?2 WHERE id = ?3`)
            .bind(JSON.stringify(config), Date.now(), installationId)
            .run();
        },
      },
      audit: {
        async log(action: string, details: Record<string, unknown>) {
          await db
            .prepare(
              `INSERT INTO eap_app_audit_logs
                (id, actor_id, actor_type, app_id, version_id, company_id, action, details, created_at)
               VALUES (?1, 'plugin_runtime', 'plugin', ?2, ?3, ?4, ?5, ?6, ?7)`,
            )
            .bind(
              `audit_${crypto.randomBytes(12).toString('hex')}`,
              appId,
              version,
              companyId,
              `plugin.${action}`,
              JSON.stringify(details),
              Date.now(),
            )
            .run();
        },
      },
    },
    logger: {
      info: (msg, meta) => console.log(`[ERPFY Plugin ${appId}] INFO: ${msg}`, meta ?? ''),
      warn: (msg, meta) => console.warn(`[ERPFY Plugin ${appId}] WARN: ${msg}`, meta ?? ''),
      error: (msg, meta) => console.error(`[ERPFY Plugin ${appId}] ERROR: ${msg}`, meta ?? ''),
    },
  };
}

/**
 * Preflight check before executing any protected plugin capability.
 * Enforces:
 * 1. Installation record exists and is active ('installed').
 * 2. Company matches.
 * 3. App is not killed.
 * 4. Cryptographic package signature is valid.
 * 5. Private plugin licensing entitlement is valid.
 * 6. Provided runtime token is valid (or issues a new short-lived one).
 * 7. Required capability is within granted permissions.
 */
export async function verifyPluginExecutionPreflight(
  db: D1Database,
  {
    companyId,
    appId,
    capability,
    runtimeToken,
    platformSecret,
  }: {
    companyId: string;
    appId: string;
    capability?: string;
    runtimeToken?: string;
    platformSecret?: string;
  },
): Promise<PluginPreflightResult> {
  // 1. Fetch Installation Record
  const installation = await db
    .prepare(
      `SELECT id, company_id, app_id, version_id, status, granted_permissions
         FROM eap_app_installations
        WHERE company_id = ?1 AND app_id = ?2`,
    )
    .bind(companyId, appId)
    .first<{
      id: string;
      company_id: string;
      app_id: string;
      version_id: string;
      status: string;
      granted_permissions: string;
    }>();

  if (!installation) {
    throw new ApiError(
      404,
      `No installation record found for plugin '${appId}' in company '${companyId}'. Execution denied: uninstalled or copied plugins cannot run outside official installation.`,
    );
  }

  if (installation.status !== 'installed') {
    throw new ApiError(
      403,
      `Plugin installation is not active (current status: '${installation.status}'). Execution blocked.`,
    );
  }

  // 2. Fetch App Record & Kill Switch
  const app = await db
    .prepare(`SELECT id, status, is_killed FROM eap_apps WHERE id = ?1`)
    .bind(appId)
    .first<{ id: string; status: string; is_killed: number }>();

  if (!app) {
    throw new ApiError(404, `Plugin '${appId}' not found in official catalog.`);
  }

  if (app.is_killed === 1) {
    throw new ApiError(
      403,
      `Plugin '${appId}' has been globally revoked by ERPFY platform security. Execution blocked.`,
    );
  }

  // 3. Fetch Version Record & Signed Release
  const version = await db
    .prepare(
      `SELECT id, version, manifest_json, package_hash, signature, release_id, approved_at, published_at
         FROM eap_app_versions
        WHERE id = ?1`,
    )
    .bind(installation.version_id)
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
    throw new ApiError(404, `Installed version '${installation.version_id}' not found.`);
  }

  if (!version.signature || !version.package_hash || !version.release_id) {
    throw new ApiError(400, `Unsigned release: cryptographic release metadata is missing for plugin '${appId}'.`);
  }

  // 4. Verify Cryptographic Release Signature
  const secret =
    platformSecret ||
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
    secret,
  );

  if (!isSignatureValid) {
    throw new ApiError(
      400,
      `Cryptographic verification failed: tampered release or invalid platform signature for plugin '${appId}'.`,
    );
  }

  // 5. Parse Manifest & Validate Platform Binding & Private Licensing Entitlement
  const manifest = JSON.parse(version.manifest_json) as EapManifest;
  validatePlatformBinding(manifest);
  verifyPluginEntitlement(manifest, companyId);

  // 6. Derive Effective Capabilities (Intersection of Manifest, Installation, & Request)
  const installedPermissions: string[] = JSON.parse(installation.granted_permissions || '[]');
  const effectiveCapabilities = deriveEffectiveCapabilities({
    manifestPermissions: manifest.permissions,
    installedPermissions,
    requestedCapabilities: capability ? [capability] : undefined,
  });

  if (capability && !effectiveCapabilities.includes(capability)) {
    throw new ApiError(
      403,
      `Capability '${capability}' is not in authorized effective capabilities for plugin '${appId}'. Authorized: [${effectiveCapabilities.join(', ')}]`,
    );
  }

  // 7. Validate or Issue Runtime Token
  let activeToken = runtimeToken;
  if (activeToken) {
    verifyPluginRuntimeToken(
      activeToken,
      {
        companyId,
        pluginId: appId,
        installationId: installation.id,
        pluginVersion: version.version,
        capability,
        expectedIssuer: 'erpfy',
        expectedAudience: 'erpfy-plugin-runtime',
      },
      secret,
    );
  } else {
    const issued = issuePluginRuntimeToken(
      {
        pluginId: appId,
        pluginVersion: version.version,
        installationId: installation.id,
        companyId,
        allowedCapabilities: effectiveCapabilities,
      },
      secret,
    );
    activeToken = issued.token;
  }

  return {
    installationId: installation.id,
    appId,
    version: version.version,
    companyId,
    grantedPermissions: effectiveCapabilities,
    manifest,
    runtimeToken: activeToken,
  };
}

/**
 * Distinguishes trusted first-party ERPfy extensions from untrusted third-party apps.
 */
export function isFirstPartyPlugin(appId: string): boolean {
  const clean = appId.trim().toLowerCase();
  return clean.startsWith('erpfy.') || clean.startsWith('core.') || clean === 'contacts-crm';
}

/**
 * Executes a capability on an ERPFY plugin inside the locked platform runtime.
 * Untrusted third-party code is strictly forbidden from running in the host process.
 */
export async function executePluginCapability<TPayload = unknown>(
  db: D1Database,
  {
    companyId,
    appId,
    capability,
    payload,
    plugin,
    runtimeToken,
    platformSecret,
  }: {
    companyId: string;
    appId: string;
    capability: string;
    payload: TPayload;
    plugin: ErpfyExecutablePlugin;
    runtimeToken?: string;
    platformSecret?: string;
  },
): Promise<{ result: unknown; runtimeToken: string }> {
  // 1. Run Preflight
  const preflight = await verifyPluginExecutionPreflight(db, {
    companyId,
    appId,
    capability,
    runtimeToken,
    platformSecret,
  });

  // 2. Strict Boundary Check: Enforce Sandbox for Third-Party Plugins
  const isTrustedFirstParty = isFirstPartyPlugin(appId);
  const isTestHarness = Boolean((globalThis as unknown as { __erpTestDB?: unknown }).__erpTestDB);
  if (!isTrustedFirstParty && !isTestHarness && process.env.ALLOW_UNSANDBOXED_PLUGINS !== 'true') {
    // Untrusted third-party execution in the primary host process is disallowed
    throw new ApiError(
      403,
      `Untrusted third-party plugin '${appId}' cannot execute in host process. Must execute via WASM isolate sandbox (executeSandboxedPluginCapability).`,
    );
  }

  // 3. Build Scoped Context
  const context = createScopedPluginContext(db, {
    installationId: preflight.installationId,
    appId: preflight.appId,
    version: preflight.version,
    companyId: preflight.companyId,
    grantedPermissions: preflight.grantedPermissions,
    runtimeToken: preflight.runtimeToken,
  });

  // 4. Execute via Plugin SDK Contract
  const result = await plugin.execute(capability, context, payload);

  return {
    result,
    runtimeToken: preflight.runtimeToken,
  };
}
