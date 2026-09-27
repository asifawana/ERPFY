import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * ERPFY Core schema.
 * Authority: ERPFY-MASTER-PLAN.md sections 14, 25, 31, 36, 46, 54, 58, 65, 88.
 *
 * Core-first: there are no business-App tables here (no products, orders, stock,
 * journals). Those arrive with their App after Core Freeze, each owning its own tables.
 *
 * Identity model: a person is an `account`. A business is a `company`. Membership joins
 * them. A branch is a location inside a company, never a second company.
 */

/* ------------------------------------------------------------------ *
 * Personal account
 * ------------------------------------------------------------------ */

export const accounts = sqliteTable(
  'core_accounts',
  {
    /** Stable identifier from the trusted identity provider. */
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default(''),
    /** IANA timezone for the person, independent of any company. */
    timezone: text('timezone').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    /** Null until the address is proven. Gates actions that create obligations. */
    emailVerifiedAt: integer('email_verified_at'),
  },
  (t) => [uniqueIndex('core_accounts_email').on(t.email)],
);

/** Master-plan section 64. Per-person, not per-company. */
export const accountPreferences = sqliteTable('core_account_preferences', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => accounts.id),
  /** Invitations, ownership transfers, membership changes. */
  emailAccountActivity: integer('email_account_activity').notNull().default(1),
  /** Sign-ins from new devices, 2FA changes, recovery-code use. */
  emailSecurityAlerts: integer('email_security_alerts').notNull().default(1),
  /** Trial expiry, plan changes, invoices. */
  emailBillingNotices: integer('email_billing_notices').notNull().default(1),
  /** Release notes and platform announcements. Off by default — opt in. */
  emailProductUpdates: integer('email_product_updates').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

/* ------------------------------------------------------------------ *
 * Company (one independent ERP)
 * ------------------------------------------------------------------ */

/** Master-plan section 59 subscription lifecycle states. */
export type CompanyState =
  | 'trial'
  | 'payment_pending'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'read_only'
  | 'cancelled'
  | 'closed';

/** Master-plan section 36 onboarding states. */
export type OnboardingState =
  | 'not_started'
  | 'in_progress'
  | 'skipped'
  | 'completed';

export const companies = sqliteTable(
  'core_companies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Registered name, when it differs from the display name (section 42, General). */
    legalName: text('legal_name').notNull().default(''),
    /** Workspace address. Unique across the platform. */
    slug: text('slug').notNull(),

    /** Section 71 — these four are configured independently and need not match. */
    countryCode: text('country_code').notNull(),
    currency: text('currency').notNull(),
    timezone: text('timezone').notNull(),
    language: text('language').notNull().default('en'),

    /**
     * Section 42 (Regional) display and reporting conventions. The country pack supplies
     * the starting values; the company owns them. Empty or 0 means "never chosen", so an
     * older company falls back to its country pack rather than to a wrong guess.
     */
    dateFormat: text('date_format').notNull().default(''),
    numberFormat: text('number_format').notNull().default(''),
    /** Month the financial year starts in, 1 to 12. 0 until it is set. */
    fiscalYearStart: integer('fiscal_year_start').notNull().default(0),
    weekStart: text('week_start').notNull().default(''),

    /**
     * Section 33 taxonomy, stored as the full chain: sector -> industry -> sub-industry ->
     * business type. Configures and recommends; never a permanent lock. Any level may be
     * empty, because every level is optional to answer.
     */
    sectorSlug: text('sector_slug').notNull().default(''),
    industrySlug: text('industry_slug').notNull().default(''),
    subIndustrySlug: text('sub_industry_slug').notNull().default(''),
    /** A business type is a display string from the sub-industry's list, not a slug. */
    businessType: text('business_type').notNull().default(''),
    /**
     * What the customer typed when they chose Other / Custom (section 33). This is the
     * only place a business description is free text, and it is never matched against the
     * taxonomy — it is there so a real person can read it.
     */
    customIndustry: text('custom_industry').notNull().default(''),
    /**
     * Section 34/35 profile. Collected for future App recommendations only: during the
     * Core phase it activates nothing, and nothing in ERPFY may read these values to
     * withhold a capability from a small company (section 35, final line).
     *
     * Both multi-selects are JSON arrays of catalogue ids. The three counts use 0 for
     * "not answered", because 0 branches or 0 users is not a real answer either.
     */
    businessModels: text('business_models').notNull().default('[]'),
    employeeBand: text('employee_band').notNull().default(''),
    expectedUsers: integer('expected_users').notNull().default(0),
    branchCount: integer('branch_count').notNull().default(0),
    operatingCountries: integer('operating_countries').notNull().default(0),
    activities: text('activities').notNull().default('[]'),

    /** Section 57 plan intent. Not a claim that billing is live. */
    plan: text('plan').notNull().default('starter'),
    /** Section 59. */
    state: text('state').$type<CompanyState>().notNull().default('trial'),
    trialEndsAt: integer('trial_ends_at').notNull(),

    /** Section 36. */
    onboardingState: text('onboarding_state')
      .$type<OnboardingState>()
      .notNull()
      .default('not_started'),
    /** JSON map of step id to 'completed' | 'skipped', so Back and refresh lose nothing. */
    onboardingSteps: text('onboarding_steps').notNull().default('{}'),

    createdAt: integer('created_at').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => accounts.id),
    /** Idempotency key so a double submit cannot create two companies. */
    requestKey: text('request_key').notNull(),
  },
  (t) => [
    uniqueIndex('core_companies_slug').on(t.slug),
    uniqueIndex('core_companies_request').on(t.createdBy, t.requestKey),
    index('core_companies_creator').on(t.createdBy),
  ],
);

/* ------------------------------------------------------------------ *
 * Onboarding draft — master-plan sections 32, 36, 37
 * ------------------------------------------------------------------ */

/** Section 36. A draft is abandoned only by an explicit discard, never by walking away. */
export type DraftState = 'in_progress' | 'completed' | 'discarded';

/**
 * One in-progress `Create ERP` run. The draft — not the browser — is where onboarding
 * answers live, which is what makes Back, refresh, a closed tab and a second device all
 * resume the same setup instead of losing it (section 36).
 *
 * The draft also owns the creation idempotency key, so every retry of the final step
 * resolves to the one company this draft made (section 36 rule 5, section 37).
 */
export const companyDrafts = sqliteTable(
  'core_company_drafts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    /** JSON object of answers so far, keyed by field. Partial by design. */
    answers: text('answers').notNull().default('{}'),
    /** JSON map of step id to 'completed' | 'skipped'. Absent means not visited. */
    steps: text('steps').notNull().default('{}'),
    state: text('state').$type<DraftState>().notNull().default('in_progress'),
    /** Creation idempotency key, fixed when the draft starts. */
    requestKey: text('request_key').notNull(),
    /** Set once the draft has created its company. A draft creates at most one. */
    companyId: text('company_id').references(() => companies.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('core_drafts_account').on(t.accountId, t.state)],
);

/* ------------------------------------------------------------------ *
 * Membership — master-plan sections 47, 54
 * ------------------------------------------------------------------ */

/** Section 47 user types. */
export type MemberRole =
  | 'owner'
  | 'administrator'
  | 'billing_manager'
  | 'member'
  | 'auditor';

/** Only `active` consumes a paid seat (section 54). */
export type MemberStatus = 'active' | 'suspended';

export const memberships = sqliteTable(
  'core_memberships',
  {
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    role: text('role').$type<MemberRole>().notNull(),
    status: text('status').$type<MemberStatus>().notNull().default('active'),
    /** Empty means company-wide. Otherwise a JSON array of branch ids. */
    branchScope: text('branch_scope').notNull().default(''),
    joinedAt: integer('joined_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.accountId] }),
    index('core_memberships_account').on(t.accountId),
  ],
);

/* ------------------------------------------------------------------ *
 * Branches and granular authority — database/RBAC master contract
 * ------------------------------------------------------------------ */

export type BranchStatus = 'active' | 'archived';

/** A branch is a location inside one company; it is never a tenant boundary. */
export const branches = sqliteTable(
  'core_branches',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').$type<BranchStatus>().notNull().default('active'),
    isMain: integer('is_main').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    archivedAt: integer('archived_at'),
  },
  (t) => [
    uniqueIndex('core_branches_company_code').on(t.companyId, t.code),
    index('core_branches_company_status').on(t.companyId, t.status),
  ],
);

export type PermissionEffect = 'allow' | 'deny';
export type DataScope = 'OWN' | 'BRANCH' | 'COMPANY' | 'TENANT';

/** Capability catalogue. Keys follow the permanent `module.action` convention. */
export const permissions = sqliteTable('core_permissions', {
  key: text('key').primaryKey(),
  description: text('description').notNull().default(''),
  createdAt: integer('created_at').notNull(),
});

/** Company-owned roles. System roles are protected from casual deletion/renaming. */
export const roles = sqliteTable(
  'core_roles',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    key: text('key').notNull(),
    name: text('name').notNull(),
    isSystem: integer('is_system').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('core_roles_company_key').on(t.companyId, t.key),
    index('core_roles_company').on(t.companyId),
  ],
);

export const membershipRoles = sqliteTable(
  'core_membership_roles',
  {
    companyId: text('company_id').notNull(),
    accountId: text('account_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id),
    assignedAt: integer('assigned_at').notNull(),
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => accounts.id),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.accountId, t.roleId] }),
    index('core_membership_roles_role').on(t.roleId),
  ],
);

export const rolePermissions = sqliteTable(
  'core_role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key),
    effect: text('effect').$type<PermissionEffect>().notNull(),
    scope: text('scope').$type<DataScope>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

/** Per-person overrides take precedence over every role grant. */
export const permissionOverrides = sqliteTable(
  'core_permission_overrides',
  {
    companyId: text('company_id').notNull(),
    accountId: text('account_id').notNull(),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key),
    effect: text('effect').$type<PermissionEffect>().notNull(),
    scope: text('scope').$type<DataScope>().notNull(),
    updatedAt: integer('updated_at').notNull(),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => accounts.id),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.accountId, t.permissionKey] }),
    index('core_permission_overrides_account').on(t.accountId, t.companyId),
  ],
);

/** Explicit branch assignment; no branch name or JSON list is authorization authority. */
export const membershipBranches = sqliteTable(
  'core_membership_branches',
  {
    companyId: text('company_id').notNull(),
    accountId: text('account_id').notNull(),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id),
    assignedAt: integer('assigned_at').notNull(),
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => accounts.id),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.accountId, t.branchId] }),
    index('core_membership_branches_branch').on(t.branchId),
  ],
);

/* ------------------------------------------------------------------ *
 * Invitations — master-plan section 46
 * ------------------------------------------------------------------ */

/** A pending invitation is never billed (section 54). */
export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired';

export const invitations = sqliteTable(
  'core_invitations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    email: text('email').notNull(),
    role: text('role').$type<MemberRole>().notNull(),
    status: text('status')
      .$type<InvitationStatus>()
      .notNull()
      .default('pending'),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => accounts.id),
    message: text('message').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    respondedAt: integer('responded_at'),
  },
  (t) => [
    uniqueIndex('core_invitations_pending').on(t.companyId, t.email),
    index('core_invitations_email').on(t.email),
  ],
);

/* ------------------------------------------------------------------ *
 * Personal account lists — master-plan section 31
 * ------------------------------------------------------------------ */

/** Recently Opened. One row per account/company pair, overwritten on each open. */
export const companyVisits = sqliteTable(
  'core_company_visits',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    lastOpenedAt: integer('last_opened_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.companyId] }),
    index('core_visits_recent').on(t.accountId, t.lastOpenedAt),
  ],
);

export const favorites = sqliteTable(
  'core_favorites',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.companyId] })],
);

/* ------------------------------------------------------------------ *
 * Activity — master-plan section 65. Append-only.
 * ------------------------------------------------------------------ */

export const activityEvents = sqliteTable(
  'core_activity_events',
  {
    id: text('id').primaryKey(),
    /** Null for account-level events that belong to no single company. */
    companyId: text('company_id').references(() => companies.id),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    action: text('action').notNull(),
    detail: text('detail').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('core_activity_company_time').on(t.companyId, t.createdAt),
    index('core_activity_account_time').on(t.accountId, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ *
 * Authentication — master-plan sections 50, 51, 88 (items 2-4)
 * ------------------------------------------------------------------ */

/** Password credentials. Separate from `accounts` so an account can exist without one. */
export const credentials = sqliteTable('core_credentials', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => accounts.id),
  /** `pbkdf2-sha256$iterations$salt$hash`. Never a raw password. */
  passwordHash: text('password_hash').notNull(),
  passwordUpdatedAt: integer('password_updated_at').notNull(),
  /** Throttling. Reset on a successful sign-in. */
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: integer('locked_until').notNull().default(0),
});

/** Federated sign-in links, one row per provider identity (Google today). */
export const identityLinks = sqliteTable(
  'core_identity_links',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerEmail: text('provider_email').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('core_identity_provider_user').on(t.provider, t.providerUserId),
    index('core_identity_account').on(t.accountId),
  ],
);

/** One-time links: email verification, password reset, email change. */
export type OneTimePurpose = 'verify_email' | 'reset_password' | 'change_email';

export const oneTimeTokens = sqliteTable(
  'core_one_time_tokens',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    purpose: text('purpose').$type<OneTimePurpose>().notNull(),
    /** SHA-256 of the token. The token itself is only ever in the email link. */
    tokenHash: text('token_hash').notNull(),
    /** Target address for a change-email request; otherwise the account address. */
    email: text('email').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [
    uniqueIndex('core_one_time_hash').on(t.tokenHash),
    index('core_one_time_account').on(t.accountId, t.purpose),
  ],
);

/** Sessions. The cookie carries an opaque token; only its hash is stored. */
export const sessions = sqliteTable(
  'core_sessions',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    /** Absolute expiry. A session is never extended past this. */
    expiresAt: integer('expires_at').notNull(),
    /** Last successful password or second-factor check, for step-up windows. */
    verifiedAt: integer('verified_at').notNull(),
    ipAddress: text('ip_address').notNull().default(''),
    userAgent: text('user_agent').notNull().default(''),
    deviceLabel: text('device_label').notNull().default(''),
    /** Set when this device may skip the second factor, until this time. */
    trustedUntil: integer('trusted_until').notNull().default(0),
    revokedAt: integer('revoked_at'),
  },
  (t) => [
    uniqueIndex('core_sessions_token').on(t.tokenHash),
    index('core_sessions_account').on(t.accountId, t.lastSeenAt),
  ],
);

/**
 * A sign-in that has passed the password but still owes a second factor. Short-lived and
 * single-use, so a partially authenticated state can never linger.
 */
export const loginChallenges = sqliteTable(
  'core_login_challenges',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    tokenHash: text('token_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    consumedAt: integer('consumed_at'),
  },
  (t) => [uniqueIndex('core_login_challenge_token').on(t.tokenHash)],
);

/** TOTP enrolment. The secret is encrypted at rest; see lib/core/crypto.ts. */
export const totpEnrolments = sqliteTable('core_totp', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => accounts.id),
  secretCipher: text('secret_cipher').notNull(),
  secretIv: text('secret_iv').notNull(),
  createdAt: integer('created_at').notNull(),
  /** Null until the first correct code proves the authenticator is set up. */
  confirmedAt: integer('confirmed_at'),
  /** Last accepted TOTP counter, so one code cannot be replayed. */
  lastCounter: integer('last_counter').notNull().default(0),
});

/** Single-use recovery codes, stored as hashes only (master-plan section 50). */
export const recoveryCodes = sqliteTable(
  'core_recovery_codes',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    codeHash: text('code_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [
    uniqueIndex('core_recovery_hash').on(t.codeHash),
    index('core_recovery_account').on(t.accountId),
  ],
);

/* ------------------------------------------------------------------ *
 * Settings — see lib/settings/schema.ts for the field set and scope map
 * ------------------------------------------------------------------ */

/**
 * Personal portal preferences: how one person wants the portal to look. Stored as one JSON
 * document because these are display choices read together on every page, never queried
 * individually, and a settings screen that gained a column per switch would need a
 * migration for every new toggle.
 */
export const accountSettings = sqliteTable('core_account_settings', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => accounts.id),
  data: text('data').notNull().default('{}'),
  updatedAt: integer('updated_at').notNull(),
});

/** Company-wide configuration. Everything a second member of the company would also see. */
export const companySettings = sqliteTable('core_company_settings', {
  companyId: text('company_id')
    .primaryKey()
    .references(() => companies.id),
  data: text('data').notNull().default('{}'),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => accounts.id),
});

/**
 * Integration credentials, encrypted at rest with `ERPFY_SECRET_KEY` exactly as TOTP
 * secrets are. One row per secret so a single credential can be replaced or removed
 * without rewriting the others, and so the plaintext never sits in the settings document
 * that the browser reads.
 *
 * Nothing ever returns a value from this table to a client. A settings screen is told
 * whether a secret is configured, and when it was last changed.
 */
export const companySecrets = sqliteTable(
  'core_company_secrets',
  {
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    /** Settings field name, e.g. `stripeSecretKey`. */
    name: text('name').notNull(),
    cipher: text('cipher').notNull(),
    iv: text('iv').notNull(),
    updatedAt: integer('updated_at').notNull(),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => accounts.id),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.name] })],
);

/* ------------------------------------------------------------------ *
 * ERP App Protocol (EAP v1) Developer Platform & Marketplace
 * ------------------------------------------------------------------ */

export const eapDevOrganizations = sqliteTable(
  'eap_dev_organizations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('unverified'),
    website: text('website').notNull().default(''),
    supportEmail: text('support_email').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('eap_dev_organizations_slug').on(t.slug)],
);

export const eapDevProfiles = sqliteTable(
  'eap_dev_profiles',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    organizationId: text('organization_id')
      .notNull()
      .references(() => eapDevOrganizations.id),
    displayName: text('display_name').notNull(),
    bio: text('bio').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('eap_dev_profiles_account').on(t.accountId),
    index('eap_dev_profiles_org').on(t.organizationId),
  ],
);

export const eapDevMembers = sqliteTable(
  'eap_dev_members',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => eapDevOrganizations.id),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    role: text('role').notNull().default('developer'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.accountId] })],
);

export const eapApps = sqliteTable(
  'eap_apps',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => eapDevOrganizations.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    shortDescription: text('short_description').notNull(),
    fullDescription: text('full_description').notNull().default(''),
    category: text('category').notNull(),
    appType: text('app_type').notNull().default('public'),
    officialApp: integer('official_app').notNull().default(0),
    pricingType: text('pricing_type').notNull().default('free'),
    priceAmount: real('price_amount').notNull().default(0),
    iconUrl: text('icon_url').notNull().default(''),
    bannerUrl: text('banner_url').notNull().default(''),
    supportEmail: text('support_email').notNull().default(''),
    docsUrl: text('docs_url').notNull().default(''),
    privacyUrl: text('privacy_url').notNull().default(''),
    status: text('status').notNull().default('draft'),
    isKilled: integer('is_killed').notNull().default(0),
    killReason: text('kill_reason').notNull().default(''),
    createdByAccountId: text('created_by_account_id')
      .notNull()
      .references(() => accounts.id),
    firstUploadedAt: integer('first_uploaded_at'),
    submittedAt: integer('submitted_at'),
    approvedAt: integer('approved_at'),
    approvedBy: text('approved_by'),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('eap_apps_slug').on(t.slug),
    index('eap_apps_org').on(t.organizationId),
    index('eap_apps_status').on(t.status),
  ],
);

export const eapAppVersions = sqliteTable(
  'eap_app_versions',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => eapApps.id),
    version: text('version').notNull(),
    protocol: text('protocol').notNull().default('eap-v1'),
    minPlatformVersion: text('min_platform_version').notNull().default('1.0.0'),
    manifestJson: text('manifest_json').notNull(),
    changelog: text('changelog').notNull().default(''),
    packageHash: text('package_hash').notNull().default(''),
    signature: text('signature').notNull().default(''),
    releaseId: text('release_id').notNull().default(''),
    reviewStatus: text('review_status').notNull().default('draft'),
    createdAt: integer('created_at').notNull(),
    approvedAt: integer('approved_at'),
    publishedAt: integer('published_at'),
  },
  (t) => [
    uniqueIndex('eap_app_versions_app_ver').on(t.appId, t.version),
    index('eap_app_versions_app').on(t.appId),
  ],
);

export const eapAppReviews = sqliteTable(
  'eap_app_reviews',
  {
    id: text('id').primaryKey(),
    versionId: text('version_id')
      .notNull()
      .references(() => eapAppVersions.id),
    reviewerAccountId: text('reviewer_account_id').references(() => accounts.id),
    status: text('status').notNull().default('submitted'),
    automatedScanResult: text('automated_scan_result').notNull().default('PASS'),
    automatedScanDetails: text('automated_scan_details').notNull().default('{}'),
    reviewerNotes: text('reviewer_notes').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    completedAt: integer('completed_at'),
  },
  (t) => [index('eap_app_reviews_version').on(t.versionId)],
);

export const eapAppReviewMessages = sqliteTable(
  'eap_app_review_messages',
  {
    id: text('id').primaryKey(),
    reviewId: text('review_id')
      .notNull()
      .references(() => eapAppReviews.id),
    senderAccountId: text('sender_account_id')
      .notNull()
      .references(() => accounts.id),
    senderType: text('sender_type').notNull(),
    message: text('message').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('eap_app_review_messages_review').on(t.reviewId)],
);

export const eapDevCredentials = sqliteTable(
  'eap_dev_credentials',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => eapApps.id),
    clientId: text('client_id').notNull(),
    clientSecretHash: text('client_secret_hash').notNull(),
    environment: text('environment').notNull().default('development'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at'),
  },
  (t) => [
    uniqueIndex('eap_dev_credentials_client_id').on(t.clientId),
    index('eap_dev_credentials_app').on(t.appId),
  ],
);

export const eapAppInstallations = sqliteTable(
  'eap_app_installations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    appId: text('app_id')
      .notNull()
      .references(() => eapApps.id),
    versionId: text('version_id')
      .notNull()
      .references(() => eapAppVersions.id),
    installedByAccountId: text('installed_by_account_id')
      .notNull()
      .references(() => accounts.id),
    status: text('status').notNull().default('installed'),
    grantedPermissions: text('granted_permissions').notNull().default('[]'),
    configuration: text('configuration').notNull().default('{}'),
    installedAt: integer('installed_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    uninstalledAt: integer('uninstalled_at'),
  },
  (t) => [
    uniqueIndex('eap_app_installations_company_app').on(t.companyId, t.appId),
    index('eap_app_installations_company').on(t.companyId),
  ],
);

export const eapAppWebhooks = sqliteTable(
  'eap_app_webhooks',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => eapApps.id),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    eventType: text('event_type').notNull(),
    endpointUrl: text('endpoint_url').notNull(),
    secret: text('secret').notNull(),
    status: text('status').notNull().default('active'),
    failureCount: integer('failure_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    lastTriggeredAt: integer('last_triggered_at'),
  },
  (t) => [index('eap_app_webhooks_company').on(t.companyId)],
);

export const eapAppAuditLogs = sqliteTable(
  'eap_app_audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    actorType: text('actor_type').notNull(),
    appId: text('app_id'),
    versionId: text('version_id'),
    companyId: text('company_id'),
    action: text('action').notNull(),
    details: text('details').notNull().default('{}'),
    ipAddress: text('ip_address').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('eap_app_audit_logs_app').on(t.appId),
    index('eap_app_audit_logs_company').on(t.companyId),
  ],
);

export const eapConsumedTokens = sqliteTable(
  'eap_consumed_tokens',
  {
    jti: text('jti').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    appId: text('app_id')
      .notNull()
      .references(() => eapApps.id, { onDelete: 'cascade' }),
    installationId: text('installation_id')
      .notNull()
      .references(() => eapAppInstallations.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    expiresAt: integer('expires_at').notNull(),
    consumedAt: integer('consumed_at').notNull(),
  },
  (t) => [
    index('idx_eap_consumed_tokens_expires').on(t.expiresAt),
    index('idx_eap_consumed_tokens_company').on(t.companyId),
    index('idx_eap_consumed_tokens_installation').on(t.installationId),
  ],
);


