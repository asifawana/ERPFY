import type { CompanyState, MemberRole, MemberStatus, OnboardingState } from '@/db/schema';
import { ApiError } from './server';

export type CompanyAccess = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  currency: string;
  timezone: string;
  language: string;
  plan: string;
  state: CompanyState;
  status: MemberStatus;
  onboardingState: OnboardingState;
  trialEndsAt: number;
  trialDaysLeft: number;
  role: MemberRole;
  branchRestricted: boolean;
  lastOpenedAt: number | null;
  isFavorite: boolean;
};

type CompanyAccessRow = {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  currency: string;
  timezone: string;
  language: string;
  plan: string;
  state: string;
  status: string;
  onboarding_state: string;
  trial_ends_at: number;
  role: string;
  branch_scope: string;
  last_opened_at: number | null;
  is_favorite: number;
};

const ACCESS_COLUMNS = `
  c.id,
  c.name,
  c.slug,
  c.country_code,
  c.currency,
  c.timezone,
  c.language,
  c.plan,
  c.state,
  m.status,
  c.onboarding_state,
  c.trial_ends_at,
  m.role,
  m.branch_scope,
  v.last_opened_at,
  CASE WHEN f.company_id IS NULL THEN 0 ELSE 1 END AS is_favorite
`;

function companyAccess(row: CompanyAccessRow): CompanyAccess {
  const now = Date.now();
  const trialDaysLeft = Math.max(0, Math.ceil((row.trial_ends_at - now) / 86400000));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    countryCode: row.country_code,
    currency: row.currency,
    timezone: row.timezone,
    language: row.language,
    plan: row.plan,
    state: row.state as CompanyState,
    status: (row.status as MemberStatus) || 'active',
    onboardingState: row.onboarding_state as OnboardingState,
    trialEndsAt: row.trial_ends_at,
    trialDaysLeft,
    role: row.role as MemberRole,
    branchRestricted: row.branch_scope.trim().length > 0,
    lastOpenedAt: row.last_opened_at,
    isFavorite: row.is_favorite === 1,
  };
}

/**
 * Lists only companies reached through the viewer's active membership. A creator field is
 * deliberately irrelevant: ownership and access are represented by memberships.
 */
export async function listCompaniesForAccount(
  db: D1Database,
  accountId: string,
): Promise<CompanyAccess[]> {
  const { results } = await db
    .prepare(
      `SELECT ${ACCESS_COLUMNS}
         FROM core_memberships m
         JOIN core_companies c ON c.id = m.company_id
         LEFT JOIN core_company_visits v
           ON v.company_id = c.id AND v.account_id = m.account_id
         LEFT JOIN core_favorites f
           ON f.company_id = c.id AND f.account_id = m.account_id
        WHERE m.account_id = ?1 AND m.status = 'active'
        ORDER BY COALESCE(v.last_opened_at, 0) DESC, c.name COLLATE NOCASE ASC`,
    )
    .bind(accountId)
    .all<CompanyAccessRow>();

  return (results ?? []).map(companyAccess);
}

/**
 * Resolves company metadata and membership in one scoped query. Missing, suspended and
 * foreign companies all return the same 404 so an identifier cannot disclose a tenant.
 */
export async function requireCompanyAccess(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<CompanyAccess> {
  const row = await db
    .prepare(
      `SELECT ${ACCESS_COLUMNS}
         FROM core_memberships m
         JOIN core_companies c ON c.id = m.company_id
         LEFT JOIN core_company_visits v
           ON v.company_id = c.id AND v.account_id = m.account_id
         LEFT JOIN core_favorites f
           ON f.company_id = c.id AND f.account_id = m.account_id
        WHERE m.account_id = ?1 AND m.company_id = ?2 AND m.status = 'active'
        LIMIT 1`,
    )
    .bind(accountId, companyId)
    .first<CompanyAccessRow>();

  if (!row) throw new ApiError(404, 'That ERP could not be found.');
  return companyAccess(row);
}

/**
 * Resolves company metadata and membership by company slug.
 */
export async function requireCompanyAccessBySlug(
  db: D1Database,
  accountId: string,
  slug: string,
): Promise<CompanyAccess> {
  const normalizedSlug = slug.toLowerCase().trim();
  const row = await db
    .prepare(
      `SELECT ${ACCESS_COLUMNS}
         FROM core_memberships m
         JOIN core_companies c ON c.id = m.company_id
         LEFT JOIN core_company_visits v
           ON v.company_id = c.id AND v.account_id = m.account_id
         LEFT JOIN core_favorites f
           ON f.company_id = c.id AND f.account_id = m.account_id
        WHERE m.account_id = ?1 AND c.slug = ?2 AND m.status = 'active'
        LIMIT 1`,
    )
    .bind(accountId, normalizedSlug)
    .first<CompanyAccessRow>();

  if (!row) throw new ApiError(404, 'That ERP could not be found.');
  return companyAccess(row);
}

/**
 * Company-wide operations must use this stricter guard until real branch scope validation
 * exists. A non-empty legacy scope is never widened silently.
 */
export async function requireCompanyWideAccess(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<CompanyAccess> {
  const access = await requireCompanyAccess(db, accountId, companyId);
  if (access.branchRestricted) {
    throw new ApiError(
      403,
      'Your branch access must be configured before using this area.',
    );
  }
  return access;
}

/**
 * Toggles a company's favorite status in core_favorites for the current viewer.
 */
export async function toggleFavorite(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<{ isFavorite: boolean }> {
  await requireCompanyAccess(db, accountId, companyId);

  const existing = await db
    .prepare(
      `SELECT company_id FROM core_favorites WHERE account_id = ?1 AND company_id = ?2 LIMIT 1`,
    )
    .bind(accountId, companyId)
    .first();

  if (existing) {
    await db
      .prepare(
        `DELETE FROM core_favorites WHERE account_id = ?1 AND company_id = ?2`,
      )
      .bind(accountId, companyId)
      .run();
    return { isFavorite: false };
  } else {
    await db
      .prepare(
        `INSERT INTO core_favorites (account_id, company_id, created_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(accountId, companyId, Date.now())
      .run();
    return { isFavorite: true };
  }
}

/**
 * Records an authorized company visit.
 */
export async function recordCompanyVisit(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<number> {
  await requireCompanyAccess(db, accountId, companyId);
  const openedAt = Date.now();
  await db
    .prepare(
      `INSERT INTO core_company_visits (account_id, company_id, last_opened_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT (account_id, company_id)
       DO UPDATE SET last_opened_at = excluded.last_opened_at`,
    )
    .bind(accountId, companyId, openedAt)
    .run();
  return openedAt;
}

export const RESERVED_SLUGS = new Set([
  'account',
  'admin',
  'analytics',
  'api',
  'app',
  'app-store',
  'auth',
  'billing',
  'c',
  'checkout',
  'companies',
  'company',
  'create',
  'customers',
  'dashboard',
  'demo',
  'docs',
  'download',
  'erpfy',
  'favorites',
  'help',
  'home',
  'inbox',
  'invitations',
  'login',
  'logout',
  'notifications',
  'orders',
  'overview',
  'pricing',
  'privacy',
  'products',
  'profile',
  'public',
  'recent',
  'roles',
  'sales',
  'security',
  'settings',
  'signin',
  'signout',
  'signup',
  'static',
  'status',
  'support',
  'system',
  'team',
  'terms',
  'workspace',
]);

/**
 * Validates a company slug handle format and reserved status.
 */
export function validateSlug(rawSlug: string): string {
  const slug = (rawSlug || '').trim().toLowerCase();
  if (slug.length < 3) {
    throw new ApiError(400, 'Handle must be at least 3 characters long.');
  }
  if (slug.length > 40) {
    throw new ApiError(400, 'Handle cannot exceed 40 characters.');
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new ApiError(
      400,
      'Handle can only contain lowercase letters, numbers, and single hyphens.',
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new ApiError(400, 'That handle is reserved for system use.');
  }
  return slug;
}

/**
 * Checks whether a handle slug is valid and available.
 */
export async function checkSlugAvailability(
  db: D1Database,
  rawSlug: string,
): Promise<{ available: boolean; slug: string; reason?: string }> {
  let slug: string;
  try {
    slug = validateSlug(rawSlug);
  } catch (error) {
    return {
      available: false,
      slug: (rawSlug || '').trim().toLowerCase(),
      reason: error instanceof Error ? error.message : 'Invalid handle format',
    };
  }

  const existing = await db
    .prepare(`SELECT id FROM core_companies WHERE slug = ?1 LIMIT 1`)
    .bind(slug)
    .first<{ id: string }>();

  if (existing) {
    return {
      available: false,
      slug,
      reason: 'That handle is already taken. Please choose another.',
    };
  }

  return { available: true, slug };
}

export type CreateCompanyInput = {
  accountId: string;
  name: string;
  slug: string;
  countryCode: string;
  currency: string;
  timezone: string;
  language?: string;
  plan?: string;
  sectorSlug?: string;
  industrySlug?: string;
  subIndustrySlug?: string;
  businessType?: string;
  customIndustry?: string;
  businessModels?: string[];
  employeeBand?: string;
  expectedUsers?: number;
  branchCount?: number;
  operatingCountries?: number;
  activities?: string[];
  requestKey: string;
};

/**
 * Idempotently provisions a new company, adds the creator as owner,
 * initializes a 14-day trial, and registers the first company visit.
 */
export async function createCompany(
  db: D1Database,
  input: CreateCompanyInput,
): Promise<CompanyAccess> {
  const name = (input.name || '').trim();
  if (name.length < 2 || name.length > 100) {
    throw new ApiError(400, 'Company name must be between 2 and 100 characters.');
  }

  const requestKey = (input.requestKey || '').trim();
  if (!requestKey) {
    throw new ApiError(400, 'Idempotency request key is required.');
  }

  // Idempotency: return existing company if this account already submitted with this requestKey
  const existing = await db
    .prepare(
      `SELECT id FROM core_companies WHERE created_by = ?1 AND request_key = ?2 LIMIT 1`,
    )
    .bind(input.accountId, requestKey)
    .first<{ id: string }>();

  if (existing) {
    return requireCompanyAccess(db, input.accountId, existing.id);
  }

  const slug = validateSlug(input.slug);

  // Check slug uniqueness
  const slugRow = await db
    .prepare(`SELECT id FROM core_companies WHERE slug = ?1 LIMIT 1`)
    .bind(slug)
    .first<{ id: string }>();

  if (slugRow) {
    throw new ApiError(409, 'That handle is already taken. Please choose another.');
  }

  const companyId = crypto.randomUUID();
  const now = Date.now();
  const trialEndsAt = now + 14 * 24 * 60 * 60 * 1000;

  await db.batch([
    db
      .prepare(
        `INSERT INTO core_companies (
           id, name, slug, country_code, currency, timezone, language,
           sector_slug, industry_slug, business_models, employee_band,
           plan, state, trial_ends_at, onboarding_state, onboarding_steps,
           created_at, created_by, request_key
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6, ?7,
           ?8, ?9, ?10, ?11,
           ?12, 'trial', ?13, 'completed', '{}',
           ?14, ?15, ?16
         )`,
      )
      .bind(
        companyId,
        name,
        slug,
        (input.countryCode || 'US').trim().toUpperCase(),
        (input.currency || 'USD').trim().toUpperCase(),
        (input.timezone || 'UTC').trim(),
        input.language || 'en',
        input.sectorSlug || '',
        input.industrySlug || '',
        JSON.stringify(input.businessModels || []),
        input.employeeBand || '',
        input.plan || 'starter',
        trialEndsAt,
        now,
        input.accountId,
        requestKey,
      ),
    db
      .prepare(
        `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
         VALUES (?1, ?2, 'owner', 'active', '', ?3)`,
      )
      .bind(companyId, input.accountId, now),
    db
      .prepare(
        `INSERT INTO core_company_visits (account_id, company_id, last_opened_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(input.accountId, companyId, now),
  ]);

  return requireCompanyAccess(db, input.accountId, companyId);
}
