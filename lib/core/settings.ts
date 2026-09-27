import { importSecretKey, seal } from './crypto';
import { type CompanyAccess } from './company';
import { authorize, requirePermission } from './authorization';
import { secretKeyMaterial } from './session';
import { ApiError, auditStatement } from './server';
import {
  DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
  SECRET_KEYS,
  normalizeAccountSystemSettings,
  pickKnown,
  splitByScope,
  type AccountSystemSettings,
} from '@/lib/settings/schema';

/**
 * Server side of the settings screens.
 * Authority: ERPFY-MASTER-PLAN.md sections 42, 47, 49, 64, 65, 81, 99.
 *
 * Three stores, one API. Personal display preferences live on the account, company
 * configuration lives on the company, and integration credentials live encrypted in
 * `core_company_secrets` and never travel back to a browser.
 *
 * Settings reads and writes use capability checks. Role names are presentation; the
 * backend permission resolver is authority.
 */

export type SecretStatus = {
  /** True when a credential is stored. The value itself is never disclosed. */
  configured: boolean;
  updatedAt: number | null;
};

export type SettingsResult = {
  settings: AccountSystemSettings;
  /** Per-secret configured/last-changed, keyed by settings field name. */
  secrets: Record<string, SecretStatus>;
  company: {
    id: string;
    name: string;
    role: string;
    /** False when the viewer may read the settings but not change the company's. */
    canEdit: boolean;
  } | null;
  /**
   * False when this deployment has no `ERPFY_SECRET_KEY`. Credential fields must then be
   * shown as unavailable rather than accepting a value there is no way to protect.
   */
  secretsAvailable: boolean;
};

function parseDocument(
  raw: string | null | undefined,
): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    // A corrupt document must not lock a person out of their own settings screen.
    return {};
  }
}

/** Blanks every credential field, whatever the caller passed in. */
function withoutSecrets(
  settings: AccountSystemSettings,
): AccountSystemSettings {
  const out = { ...settings } as Record<string, unknown>;
  for (const key of SECRET_KEYS) out[key] = '';
  return out as AccountSystemSettings;
}

/**
 * Loads the effective settings for one person, optionally in the context of one company.
 *
 * With no company the company-scoped fields fall back to their defaults and `company` is
 * null, so a settings screen can say plainly that business configuration needs an ERP
 * rather than saving into nothing.
 */
export async function loadSettings(
  db: D1Database,
  accountId: string,
  companyId: string | null,
): Promise<SettingsResult> {
  let access: CompanyAccess | null = null;
  let canEdit = false;
  if (companyId) {
    access = (await requirePermission(
      db,
      accountId,
      companyId,
      'settings.view',
    )).access;
    canEdit = (
      await authorize(db, accountId, companyId, 'settings.manage')
    ).allowed;
  }

  const accountRow = await db
    .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
    .bind(accountId)
    .first<{ data: string }>();

  const companyRow = access
    ? await db
        .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
        .bind(access.id)
        .first<{ data: string }>()
    : null;

  const secretRows = access
    ? await db
        .prepare(
          'SELECT name, updated_at FROM core_company_secrets WHERE company_id = ?',
        )
        .bind(access.id)
        .all<{ name: string; updated_at: number }>()
    : null;

  const legalNameRow = access
    ? await db
        .prepare('SELECT legal_name FROM core_companies WHERE id = ?')
        .bind(access.id)
        .first<{ legal_name: string }>()
    : null;

  const stored = {
    ...parseDocument(companyRow?.data),
    ...parseDocument(accountRow?.data),
  };
  const effectiveSettings = normalizeAccountSystemSettings(stored);
  if (access) {
    effectiveSettings.companyName = access.name;
    effectiveSettings.companyLegalName = legalNameRow?.legal_name ?? '';
    effectiveSettings.defaultCurrency = access.currency;
    effectiveSettings.companyTimezone = access.timezone;
    effectiveSettings.defaultLanguage = access.language;
  }

  const secrets: Record<string, SecretStatus> = {};
  for (const key of SECRET_KEYS)
    secrets[key] = { configured: false, updatedAt: null };
  for (const row of secretRows?.results ?? []) {
    if (row.name in secrets) {
      secrets[row.name] = { configured: true, updatedAt: row.updated_at };
    }
  }

  return {
    settings: withoutSecrets(effectiveSettings),
    secrets,
    company: access
      ? {
          id: access.id,
          name: access.name,
          role: access.role,
          canEdit,
        }
      : null,
    secretsAvailable: secretKeyMaterial() !== null,
  };
}

export type SaveOutcome = SettingsResult & {
  /** Field names whose credential was replaced by this save. */
  secretsUpdated: string[];
};

/**
 * Saves settings and returns the effective state afterwards.
 *
 * Personal preferences always save. Company configuration and credentials save only for a
 * role that may change the business, and only with a company in context — otherwise the
 * company half is rejected rather than silently dropped, because a settings screen that
 * reports success without writing is the failure mode section 99 exists to prevent.
 */
export async function saveSettings(
  db: D1Database,
  accountId: string,
  companyId: string | null,
  input: unknown,
): Promise<SaveOutcome> {
  const requested = pickKnown(input);
  const merged = normalizeAccountSystemSettings({
    ...DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
    ...(await loadSettings(db, accountId, companyId)).settings,
    ...requested,
  });
  if ('companyName' in requested) {
    merged.companyName = merged.companyName.trim();
    if (!merged.companyName || merged.companyName.length > 120) {
      throw new ApiError(
        400,
        'Company name must be between 1 and 120 characters.',
      );
    }
  }
  if (merged.companyEmail.length > 254) {
    throw new ApiError(400, 'Company email must be 254 characters or fewer.');
  }
  if (merged.companyPhone.length > 40 || merged.companyAddress.length > 500) {
    throw new ApiError(400, 'Company contact details are too long.');
  }
  if (
    merged.companyFooter.length > 300 ||
    merged.companyDevelopedBy.length > 120
  ) {
    throw new ApiError(400, 'Company footer details are too long.');
  }
  if (
    merged.companyLogoDataUrl &&
    (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(
      merged.companyLogoDataUrl,
    ) ||
      merged.companyLogoDataUrl.length > 700_000)
  ) {
    throw new ApiError(
      400,
      'Company logo must be a PNG, JPEG or WebP image up to 500 KB.',
    );
  }
  if ('defaultLanguage' in requested) {
    merged.defaultLanguage = merged.defaultLanguage.trim().toLowerCase();
    if (
      !['en', 'ur', 'ar', 'fr', 'tr', 'th', 'hi', 'de', 'es'].includes(
        merged.defaultLanguage,
      )
    ) {
      throw new ApiError(400, 'Choose a supported default language.');
    }
  }
  if ('defaultCurrency' in requested) {
    merged.defaultCurrency = merged.defaultCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(merged.defaultCurrency)) {
      throw new ApiError(400, 'Choose a valid three-letter currency code.');
    }
  }
  if ('companyTimezone' in requested) {
    merged.companyTimezone = merged.companyTimezone.trim();
    try {
      new Intl.DateTimeFormat('en', {
        timeZone: merged.companyTimezone,
      }).format();
    } catch {
      throw new ApiError(400, 'Choose a valid IANA time zone.');
    }
  }
  const { account, company, secrets } = splitByScope(merged);

  const touchesCompany = Object.keys(company).some((key) => key in requested);
  const touchesSecrets = Object.keys(secrets).length > 0;

  let access: CompanyAccess | null = null;
  if (companyId)
    access = await requireCompanyAccessForSettings(db, accountId, companyId);

  if ((touchesCompany || touchesSecrets) && !access) {
    throw new ApiError(
      400,
      'Open an ERP before changing business settings. Personal preferences were not affected.',
    );
  }
  if (access && touchesCompany) {
    await requirePermission(db, accountId, access.id, 'settings.manage');
  }
  if (access && touchesSecrets) {
    await requirePermission(db, accountId, access.id, 'integrations.manage');
  }

  const now = Date.now();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO core_account_settings (account_id, data, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT (account_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at`,
      )
      .bind(accountId, JSON.stringify(account), now),
  ];

  if (access && touchesCompany) {
    statements.push(
      db
        .prepare(
          `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (company_id) DO UPDATE SET
             data = excluded.data,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
        )
        .bind(access.id, JSON.stringify(company), now, accountId),
    );
    if ('companyName' in requested) {
      statements.push(
        db
          .prepare('UPDATE core_companies SET name = ?1 WHERE id = ?2')
          .bind(merged.companyName, access.id),
      );
    }
    if ('companyLegalName' in requested) {
      statements.push(
        db
          .prepare('UPDATE core_companies SET legal_name = ?1 WHERE id = ?2')
          .bind(merged.companyLegalName, access.id),
      );
    }
    if (
      'defaultCurrency' in requested ||
      'companyTimezone' in requested ||
      'defaultLanguage' in requested
    ) {
      statements.push(
        db
          .prepare(
            `UPDATE core_companies
                SET currency = ?1, timezone = ?2, language = ?3
              WHERE id = ?4`,
          )
          .bind(
            merged.defaultCurrency,
            merged.companyTimezone,
            merged.defaultLanguage,
            access.id,
          ),
      );
    }
  }

  const secretsUpdated: string[] = [];
  if (access && touchesSecrets) {
    const keyMaterial = secretKeyMaterial();
    if (!keyMaterial) {
      // Refusing is the honest outcome: there is no way to store this safely, and writing
      // it in clear would be worse than not saving it at all.
      throw new ApiError(
        503,
        'Credentials cannot be stored: this deployment has no encryption key configured.',
      );
    }
    const key = await importSecretKey(keyMaterial);
    for (const [name, value] of Object.entries(secrets)) {
      const sealed = await seal(key, value);
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
          .bind(access.id, name, sealed.cipher, sealed.iv, now, accountId),
      );
      secretsUpdated.push(name);
    }
  }

  statements.push(
    auditStatement(db, {
      companyId: access?.id ?? null,
      accountId,
      action: 'settings.updated',
      // Names only. A credential's value never reaches the audit trail.
      detail: describeSave(
        Object.keys(requested).filter((key) => !(key in secrets)),
        secretsUpdated,
      ),
    }),
  );

  await db.batch(statements);

  return {
    ...(await loadSettings(db, accountId, companyId)),
    secretsUpdated,
  };
}

/** Removes one stored credential. Clearing is explicit, never a side effect of a save. */
export async function clearSecret(
  db: D1Database,
  accountId: string,
  companyId: string,
  name: string,
): Promise<void> {
  if (!SECRET_KEYS.includes(name as (typeof SECRET_KEYS)[number])) {
    throw new ApiError(400, 'That is not a credential field.');
  }
  const access = (
    await requirePermission(
      db,
      accountId,
      companyId,
      'integrations.manage',
    )
  ).access;

  await db.batch([
    db
      .prepare(
        'DELETE FROM core_company_secrets WHERE company_id = ?1 AND name = ?2',
      )
      .bind(access.id, name),
    auditStatement(db, {
      companyId: access.id,
      accountId,
      action: 'settings.secret.cleared',
      detail: `Removed the stored ${name} credential`,
    }),
  ]);
}

async function requireCompanyAccessForSettings(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<CompanyAccess> {
  return (
    await requirePermission(db, accountId, companyId, 'settings.view')
  ).access;
}

function describeSave(fields: string[], secretsUpdated: string[]): string {
  const parts: string[] = [];
  if (fields.length)
    parts.push(
      `${fields.length} setting(s): ${fields.slice(0, 12).join(', ')}`,
    );
  if (secretsUpdated.length)
    parts.push(`credentials replaced: ${secretsUpdated.join(', ')}`);
  return parts.join(' · ') || 'No change';
}

export type UserDashboardPreferences = {
  widgets?: Array<{
    id: string;
    visible?: boolean;
    order?: number;
    size?: 'kpi' | 'small' | 'medium' | 'large' | 'full';
    collapsed?: boolean;
  }>;
};

export type CompanyDashboardDefault = {
  widgets?: Array<{
    id: string;
    visible?: boolean;
    order?: number;
    size?: 'kpi' | 'small' | 'medium' | 'large' | 'full';
    collapsed?: boolean;
  }>;
};

export async function loadUserDashboardPreferences(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<UserDashboardPreferences | null> {
  const accountRow = await db
    .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
    .bind(accountId)
    .first<{ data: string }>();

  if (!accountRow?.data) return null;
  const doc = parseDocument(accountRow.data);
  const companyDashboardPrefs = doc.companyDashboardPreferences as Record<string, UserDashboardPreferences> | undefined;
  if (!companyDashboardPrefs || typeof companyDashboardPrefs !== 'object') return null;
  return companyDashboardPrefs[companyId] || null;
}

export async function saveUserDashboardPreferences(
  db: D1Database,
  accountId: string,
  companyId: string,
  preferences: UserDashboardPreferences,
): Promise<UserDashboardPreferences> {
  const accountRow = await db
    .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
    .bind(accountId)
    .first<{ data: string }>();

  const doc = parseDocument(accountRow?.data);
  const companyDashboardPrefs = (doc.companyDashboardPreferences as Record<string, UserDashboardPreferences>) || {};
  companyDashboardPrefs[companyId] = preferences;
  doc.companyDashboardPreferences = companyDashboardPrefs;

  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO core_account_settings (account_id, data, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT (account_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at`,
    )
    .bind(accountId, JSON.stringify(doc), now)
    .run();

  return preferences;
}

export async function resetUserDashboardPreferences(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<void> {
  const accountRow = await db
    .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
    .bind(accountId)
    .first<{ data: string }>();

  if (!accountRow?.data) return;
  const doc = parseDocument(accountRow.data);
  const companyDashboardPrefs = (doc.companyDashboardPreferences as Record<string, UserDashboardPreferences>) || {};
  delete companyDashboardPrefs[companyId];
  doc.companyDashboardPreferences = companyDashboardPrefs;

  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO core_account_settings (account_id, data, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT (account_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at`,
    )
    .bind(accountId, JSON.stringify(doc), now)
    .run();
}

export async function loadCompanyDashboardDefault(
  db: D1Database,
  companyId: string,
): Promise<CompanyDashboardDefault | null> {
  const companyRow = await db
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
    .bind(companyId)
    .first<{ data: string }>();

  if (!companyRow?.data) return null;
  const doc = parseDocument(companyRow.data);
  const widgets = doc.dashboardDefaultWidgets as CompanyDashboardDefault['widgets'] | undefined;
  if (!widgets || !Array.isArray(widgets)) return null;
  return { widgets };
}

export async function saveCompanyDashboardDefault(
  db: D1Database,
  companyId: string,
  defaults: CompanyDashboardDefault,
  updatedByAccountId: string,
): Promise<CompanyDashboardDefault> {
  const companyRow = await db
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
    .bind(companyId)
    .first<{ data: string }>();

  const doc = parseDocument(companyRow?.data);
  doc.dashboardDefaultWidgets = defaults.widgets || [];
  if (defaults.widgets) {
    doc.dashboardWidgetOrder = defaults.widgets.map((w) => w.id);
  }

  const now = Date.now();
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
      .bind(companyId, JSON.stringify(doc), now, updatedByAccountId),
    auditStatement(db, {
      companyId,
      accountId: updatedByAccountId,
      action: 'dashboard.default.updated',
      detail: `Updated company default dashboard layout (${defaults.widgets?.length || 0} widgets)`,
    }),
  ]);

  return defaults;
}

export async function resetCompanyDashboardDefault(
  db: D1Database,
  companyId: string,
  updatedByAccountId: string,
): Promise<void> {
  const companyRow = await db
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
    .bind(companyId)
    .first<{ data: string }>();

  if (!companyRow?.data) return;
  const doc = parseDocument(companyRow.data);
  delete doc.dashboardDefaultWidgets;
  delete doc.dashboardWidgetOrder;

  const now = Date.now();
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
      .bind(companyId, JSON.stringify(doc), now, updatedByAccountId),
    auditStatement(db, {
      companyId,
      accountId: updatedByAccountId,
      action: 'dashboard.default.reset',
      detail: 'Reset company default dashboard layout to platform defaults',
    }),
  ]);
}

