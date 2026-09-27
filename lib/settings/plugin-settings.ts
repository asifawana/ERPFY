import { ApiError, auditStatement } from '@/lib/core/server';
import { requirePermission, authorize } from '@/lib/core/authorization';
import { importSecretKey, seal } from '@/lib/core/crypto';
import { secretKeyMaterial } from '@/lib/core/session';
import type { EapManifest } from '@/lib/eap/manifest';

export type DynamicPluginSettingField = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  label: string;
  default?: unknown;
  options?: { label: string; value: string }[];
  value: unknown;
  isSecret: boolean;
  isConfigured?: boolean;
};

export type DynamicPluginSettingsSection = {
  pluginId: string;
  pluginSlug: string;
  pluginName: string;
  version: string;
  category: string;
  iconUrl: string;
  tabId: string;
  label: string;
  fields: DynamicPluginSettingField[];
  isOverlappingWithLegacy: boolean;
  legacyTabId?: string;
  installedAt: number;
};

/**
 * Explicit compatibility mapping for legacy overlapping capabilities (Rule 11).
 * Prevents duplicate settings navigation tabs while preserving working legacy panels.
 */
const LEGACY_OVERLAPS: Record<string, { tabId: string; label: string }> = {
  sales: { tabId: 'sales-defaults', label: 'Sales Defaults' },
  'erpfy-sales': { tabId: 'sales-defaults', label: 'Sales Defaults' },
  'erpfy.sales': { tabId: 'sales-defaults', label: 'Sales Defaults' },
  pos: { tabId: 'pos-settings', label: 'POS Settings' },
  'erpfy-pos': { tabId: 'pos-settings', label: 'POS Settings' },
  'erpfy.pos': { tabId: 'pos-settings', label: 'POS Settings' },
  printing: { tabId: 'network-printing', label: 'Direct Network Printing' },
  'erpfy-printing': { tabId: 'network-printing', label: 'Direct Network Printing' },
  'network-printing': { tabId: 'network-printing', label: 'Direct Network Printing' },
  pharmacy: { tabId: 'pharmacy', label: 'Pharmacy' },
  'erpfy-pharmacy': { tabId: 'pharmacy', label: 'Pharmacy' },
  'erpfy.pharmacy': { tabId: 'pharmacy', label: 'Pharmacy' },
  zatca: { tabId: 'zatca', label: 'ZATCA E-Invoicing' },
  'erpfy-l10n-sa': { tabId: 'zatca', label: 'ZATCA E-Invoicing' },
  'erpfy.l10n_sa': { tabId: 'zatca', label: 'ZATCA E-Invoicing' },
};

export function detectLegacyOverlap(slug: string): {
  isOverlapping: boolean;
  legacyTabId?: string;
  legacyLabel?: string;
} {
  const match = LEGACY_OVERLAPS[slug.toLowerCase()];
  if (match) {
    return {
      isOverlapping: true,
      legacyTabId: match.tabId,
      legacyLabel: match.label,
    };
  }
  return { isOverlapping: false };
}

/**
 * Loads dynamic plugin settings contributions for an active company workspace.
 * Strictly verifies company boundary, installation status, killswitch, and permissions.
 */
export async function loadTenantPluginSettings(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<DynamicPluginSettingsSection[]> {
  // 1. Permission check: viewer must have settings view permission in this company
  await requirePermission(db, accountId, companyId, 'settings.view');

  // 2. Fetch all installed and active apps with their latest approved version manifest
  const { results } = await db
    .prepare(
      `SELECT i.id as installation_id,
              i.app_id,
              i.configuration,
              i.installed_at,
              a.slug,
              a.name,
              a.category,
              a.icon_url,
              a.is_killed,
              v.version,
              v.manifest_json
         FROM eap_app_installations i
         JOIN eap_apps a ON a.id = i.app_id
         JOIN eap_app_versions v ON v.id = i.version_id
        WHERE i.company_id = ?1
          AND i.status = 'installed'
          AND a.is_killed = 0
        ORDER BY a.name ASC`,
    )
    .bind(companyId)
    .all<{
      installation_id: string;
      app_id: string;
      configuration: string;
      installed_at: number;
      slug: string;
      name: string;
      category: string;
      icon_url: string;
      is_killed: number;
      version: string;
      manifest_json: string;
    }>();

  const sections: DynamicPluginSettingsSection[] = [];

  // 3. Query existing encrypted secrets names for this company
  const secretRows = await db
    .prepare(
      `SELECT name FROM core_company_secrets WHERE company_id = ?1`,
    )
    .bind(companyId)
    .all<{ name: string }>();

  const configuredSecretNames = new Set((secretRows.results || []).map((r) => r.name));

  for (const row of results || []) {
    try {
      const manifest = JSON.parse(row.manifest_json) as EapManifest;
      if (!manifest.settings || Object.keys(manifest.settings).length === 0) {
        continue;
      }

      // Check dependencies if defined in manifest
      if (manifest.dependencies && Array.isArray(manifest.dependencies)) {
        let dependenciesSatisfied = true;
        for (const dep of manifest.dependencies) {
          const depInstalled = await db
            .prepare(
              `SELECT id FROM eap_app_installations
                WHERE company_id = ?1 AND app_id = ?2 AND status = 'installed'`,
            )
            .bind(companyId, dep.app_id)
            .first();
          if (!depInstalled) {
            dependenciesSatisfied = false;
            break;
          }
        }
        if (!dependenciesSatisfied) {
          continue;
        }
      }

      let storedConfig: Record<string, unknown> = {};
      try {
        storedConfig = JSON.parse(row.configuration || '{}');
      } catch {
        storedConfig = {};
      }

      const overlap = detectLegacyOverlap(row.slug);
      const fields: DynamicPluginSettingField[] = [];

      for (const [key, fieldDef] of Object.entries(manifest.settings)) {
        const isSecret = fieldDef.type === 'secret';
        const secretKeyName = `plugin:${row.slug}:${key}`;
        const isConfigured = isSecret ? configuredSecretNames.has(secretKeyName) : false;

        fields.push({
          key,
          type: fieldDef.type,
          label: fieldDef.label,
          default: fieldDef.default,
          options: fieldDef.options,
          // For secrets, NEVER return plaintext! Always return empty string.
          value: isSecret ? '' : (storedConfig[key] ?? fieldDef.default ?? ''),
          isSecret,
          isConfigured,
        });
      }

      sections.push({
        pluginId: row.app_id,
        pluginSlug: row.slug,
        pluginName: row.name,
        version: row.version,
        category: row.category,
        iconUrl: row.icon_url,
        tabId: `plugin:${row.slug}`,
        label: row.name,
        fields,
        isOverlappingWithLegacy: overlap.isOverlapping,
        legacyTabId: overlap.legacyTabId,
        installedAt: row.installed_at,
      });
    } catch {
      // Ignore malformed manifests safely
    }
  }

  return sections;
}

/**
 * Saves non-secret configuration and encrypted secrets for one installed plugin.
 * Scoped strictly to the target installation; rejects cross-plugin writes and unknown keys.
 */
export async function saveTenantPluginSettings(
  db: D1Database,
  accountId: string,
  companyId: string,
  pluginSlug: string,
  submittedFields: Record<string, unknown>,
): Promise<{ success: boolean; updatedFields: string[]; secretsUpdated: string[] }> {
  // 1. Permission check: require settings.manage authorization
  const auth = await authorize(db, accountId, companyId, 'settings.manage');
  if (!auth.allowed) {
    throw new ApiError(403, 'You do not have permission to manage company settings.');
  }

  // 2. Fetch target installation & manifest
  const installation = await db
    .prepare(
      `SELECT i.id, i.app_id, i.version_id, i.configuration, i.status, a.is_killed, a.slug, v.manifest_json
         FROM eap_app_installations i
         JOIN eap_apps a ON a.id = i.app_id
         JOIN eap_app_versions v ON v.id = i.version_id
        WHERE i.company_id = ?1 AND a.slug = ?2 AND i.status = 'installed'`,
    )
    .bind(companyId, pluginSlug)
    .first<{
      id: string;
      app_id: string;
      version_id: string;
      configuration: string;
      status: string;
      is_killed: number;
      slug: string;
      manifest_json: string;
    }>();

  if (!installation) {
    throw new ApiError(404, `Plugin '${pluginSlug}' is not installed or active in this workspace.`);
  }

  if (installation.is_killed === 1) {
    throw new ApiError(403, `Plugin '${pluginSlug}' has been suspended globally by platform security.`);
  }

  const manifest = JSON.parse(installation.manifest_json) as EapManifest;
  const manifestSettings = manifest.settings || {};

  // 3. Validate submitted fields against manifest schema
  let currentConfig: Record<string, unknown> = {};
  try {
    currentConfig = JSON.parse(installation.configuration || '{}');
  } catch {
    currentConfig = {};
  }

  const updatedConfig = { ...currentConfig };
  const updatedFields: string[] = [];
  const secretsUpdated: string[] = [];
  const statements: D1PreparedStatement[] = [];
  const now = Date.now();

  const keyMaterial = secretKeyMaterial();

  for (const [fieldKey, rawValue] of Object.entries(submittedFields)) {
    const fieldDef = manifestSettings[fieldKey];
    if (!fieldDef) {
      throw new ApiError(400, `Unknown setting field '${fieldKey}' for plugin '${pluginSlug}'.`);
    }

    if (fieldDef.type === 'secret') {
      // Secret handling
      if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        if (!keyMaterial) {
          throw new ApiError(503, 'Platform secret encryption key is not configured.');
        }
        const cryptoKey = await importSecretKey(keyMaterial);
        const sealed = await seal(cryptoKey, rawValue);
        const secretName = `plugin:${pluginSlug}:${fieldKey}`;

        statements.push(
          db
            .prepare(
              `INSERT INTO core_company_secrets (company_id, name, cipher, iv, updated_at, updated_by)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6)
               ON CONFLICT (company_id, name) DO UPDATE SET
                 cipher = excluded.cipher,
                 iv = excluded.iv,
                 updated_at = excluded.updated_at,
                 updated_by = excluded.updated_by`,
            )
            .bind(companyId, secretName, sealed.cipher, sealed.iv, now, accountId),
        );
        secretsUpdated.push(fieldKey);
      }
      // Secrets are NEVER stored in ordinary configuration JSON
    } else {
      // Type validation
      let validatedValue: unknown = rawValue;
      if (fieldDef.type === 'boolean') {
        validatedValue = Boolean(rawValue);
      } else if (fieldDef.type === 'number') {
        const num = Number(rawValue);
        if (Number.isNaN(num)) {
          throw new ApiError(400, `Field '${fieldKey}' must be a valid number.`);
        }
        validatedValue = num;
      } else if (fieldDef.type === 'select') {
        const str = typeof rawValue === 'string' ? rawValue : typeof rawValue === 'number' || typeof rawValue === 'boolean' ? String(rawValue) : '';
        if (fieldDef.options && Array.isArray(fieldDef.options)) {
          const allowed = fieldDef.options.map((o) => o.value);
          if (!allowed.includes(str)) {
            throw new ApiError(400, `Invalid option '${str}' for field '${fieldKey}'. Allowed: ${allowed.join(', ')}.`);
          }
        }
        validatedValue = str;
      } else {
        validatedValue = typeof rawValue === 'string' ? rawValue : typeof rawValue === 'number' || typeof rawValue === 'boolean' ? String(rawValue) : '';
      }

      updatedConfig[fieldKey] = validatedValue;
      updatedFields.push(fieldKey);
    }
  }

  // 4. Update configuration JSON on eap_app_installations
  statements.push(
    db
      .prepare(
        `UPDATE eap_app_installations
            SET configuration = ?1,
                updated_at = ?2
          WHERE id = ?3`,
      )
      .bind(JSON.stringify(updatedConfig), now, installation.id),
  );

  // 5. Audit log
  statements.push(
    auditStatement(db, {
      companyId,
      accountId,
      action: `plugin.settings.updated`,
      detail: JSON.stringify({
        pluginSlug,
        updatedFields,
        secretsUpdated,
      }),
    }),
  );

  await db.batch(statements);

  return {
    success: true,
    updatedFields,
    secretsUpdated,
  };
}
