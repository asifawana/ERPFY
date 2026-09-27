import type { MemberRole, MemberStatus, CompanyState, OnboardingState } from '@/db/schema';
import { ApiError, auditStatement } from './server';

/** The signed-in person, as far as these queries are concerned. */
type Who = { id: string; email: string };

/**
 * Personal-account queries — master-plan section 31.
 *
 * A person is an account. A business is a company. Nothing in this module reads company
 * business data; it only answers "which companies does this person belong to, and how".
 */

export const INVITATION_TTL_DAYS = 14;
export const TRIAL_DAYS = 14;

export type CompanyCard = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  role: MemberRole;
  status: MemberStatus;
  state: CompanyState;
  plan: string;
  trialEndsAt: number;
  /** Whole days left, computed on the server so the card needs no client clock. */
  trialDaysLeft: number;
  onboardingState: OnboardingState;
  lastOpenedAt: number | null;
  isFavorite: boolean;
};

export type InvitationCard = {
  id: string;
  companyId: string;
  companyName: string;
  companyCountry: string;
  role: MemberRole;
  invitedByName: string;
  invitedByEmail: string;
  message: string;
  createdAt: number;
  expiresAt: number;
  /** Whole days left, computed on the server. */
  expiresInDays: number;
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  role: MemberRole;
  status: MemberStatus;
  state: CompanyState;
  plan: string;
  trial_ends_at: number;
  onboarding_state: OnboardingState;
  last_opened_at: number | null;
  favorite_at: number | null;
};

type InvitationRow = {
  id: string;
  company_id: string;
  company_name: string;
  company_country: string;
  role: MemberRole;
  inviter_name: string;
  inviter_email: string;
  message: string;
  created_at: number;
  expires_at: number;
};

/** My ERPs (section 31). Favourites first, then most recently opened, then newest. */
export async function listCompanies(db: D1Database, accountId: string): Promise<CompanyCard[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.country_code, c.state, c.plan, c.trial_ends_at,
              c.onboarding_state, m.role, m.status,
              v.last_opened_at AS last_opened_at,
              f.created_at AS favorite_at
         FROM core_companies c
         JOIN core_memberships m ON m.company_id = c.id AND m.account_id = ?1
         LEFT JOIN core_company_visits v ON v.company_id = c.id AND v.account_id = ?1
         LEFT JOIN core_favorites f ON f.company_id = c.id AND f.account_id = ?1
        WHERE c.state != 'closed'
        ORDER BY (f.created_at IS NULL), v.last_opened_at DESC, c.created_at DESC`,
    )
    .bind(accountId)
    .all<CompanyRow>();

  return (results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    countryCode: row.country_code,
    role: row.role,
    status: row.status,
    state: row.state,
    plan: row.plan,
    trialEndsAt: row.trial_ends_at,
    trialDaysLeft: Math.ceil((row.trial_ends_at - Date.now()) / 86_400_000),
    onboardingState: row.onboarding_state,
    lastOpenedAt: row.last_opened_at,
    isFavorite: row.favorite_at !== null,
  }));
}

/**
 * Invitations addressed to this person's email (section 46). Expired ones are filtered
 * out rather than shown as actionable.
 */
export async function listInvitations(
  db: D1Database,
  email: string,
): Promise<InvitationCard[]> {
  if (!email) return [];
  const { results } = await db
    .prepare(
      `SELECT i.id, i.company_id, i.role, i.message, i.created_at, i.expires_at,
              c.name AS company_name, c.country_code AS company_country,
              a.display_name AS inviter_name, a.email AS inviter_email
         FROM core_invitations i
         JOIN core_companies c ON c.id = i.company_id
         JOIN core_accounts a ON a.id = i.invited_by
        WHERE i.email = ?1 AND i.status = 'pending' AND i.expires_at > ?2
        ORDER BY i.created_at DESC`,
    )
    .bind(email.toLowerCase(), Date.now())
    .all<InvitationRow>();

  return (results ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    companyCountry: row.company_country,
    role: row.role,
    invitedByName: row.inviter_name || row.inviter_email,
    invitedByEmail: row.inviter_email,
    message: row.message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    expiresInDays: Math.ceil((row.expires_at - Date.now()) / 86_400_000),
  }));
}

export type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  createdAt: number;
};

export async function readProfile(db: D1Database, accountId: string): Promise<AccountProfile> {
  const row = await db
    .prepare('SELECT id, email, display_name, timezone, created_at FROM core_accounts WHERE id = ?')
    .bind(accountId)
    .first<{
      id: string;
      email: string;
      display_name: string;
      timezone: string;
      created_at: number;
    }>();
  if (!row) throw new ApiError(404, 'Account not found.');
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

export type Preferences = {
  emailAccountActivity: boolean;
  emailSecurityAlerts: boolean;
  emailBillingNotices: boolean;
  emailProductUpdates: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  emailAccountActivity: true,
  emailSecurityAlerts: true,
  emailBillingNotices: true,
  emailProductUpdates: false,
};

export async function readPreferences(db: D1Database, accountId: string): Promise<Preferences> {
  const row = await db
    .prepare(
      `SELECT email_account_activity, email_security_alerts, email_billing_notices, email_product_updates
         FROM core_account_preferences WHERE account_id = ?`,
    )
    .bind(accountId)
    .first<{
      email_account_activity: number;
      email_security_alerts: number;
      email_billing_notices: number;
      email_product_updates: number;
    }>();
  if (!row) return DEFAULT_PREFERENCES;
  return {
    emailAccountActivity: row.email_account_activity === 1,
    emailSecurityAlerts: row.email_security_alerts === 1,
    emailBillingNotices: row.email_billing_notices === 1,
    emailProductUpdates: row.email_product_updates === 1,
  };
}

export async function writePreferences(
  db: D1Database,
  accountId: string,
  next: Preferences,
): Promise<void> {
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO core_account_preferences
           (account_id, email_account_activity, email_security_alerts, email_billing_notices, email_product_updates, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(account_id) DO UPDATE SET
           email_account_activity = ?2, email_security_alerts = ?3,
           email_billing_notices = ?4, email_product_updates = ?5, updated_at = ?6`,
      )
      .bind(
        accountId,
        next.emailAccountActivity ? 1 : 0,
        next.emailSecurityAlerts ? 1 : 0,
        next.emailBillingNotices ? 1 : 0,
        next.emailProductUpdates ? 1 : 0,
        now,
      ),
    auditStatement(db, {
      companyId: null,
      accountId,
      action: 'account.preferences.updated',
      detail: 'Notification preferences changed',
    }),
  ]);
}

export async function updateProfile(
  db: D1Database,
  accountId: string,
  input: { displayName: string; timezone: string },
): Promise<void> {
  await db.batch([
    db
      .prepare('UPDATE core_accounts SET display_name = ?2, timezone = ?3 WHERE id = ?1')
      .bind(accountId, input.displayName, input.timezone),
    auditStatement(db, {
      companyId: null,
      accountId,
      action: 'account.profile.updated',
      detail: 'Profile details changed',
    }),
  ]);
}

/** Toggles a favourite (section 31). Returns the state after the change. */
export async function toggleFavorite(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<boolean> {
  await assertMembership(db, accountId, companyId);
  const existing = await db
    .prepare('SELECT 1 AS found FROM core_favorites WHERE account_id = ? AND company_id = ?')
    .bind(accountId, companyId)
    .first<{ found: number }>();

  if (existing) {
    await db
      .prepare('DELETE FROM core_favorites WHERE account_id = ? AND company_id = ?')
      .bind(accountId, companyId)
      .run();
    return false;
  }
  await db
    .prepare('INSERT INTO core_favorites (account_id, company_id, created_at) VALUES (?,?,?)')
    .bind(accountId, companyId, Date.now())
    .run();
  return true;
}

/** Records an open for Recently Opened (section 31). */
export async function recordVisit(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<void> {
  await assertMembership(db, accountId, companyId);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO core_company_visits (account_id, company_id, last_opened_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(account_id, company_id) DO UPDATE SET last_opened_at = ?3`,
    )
    .bind(accountId, companyId, now)
    .run();
}

/**
 * Cross-company access check (section 8). Every account-scoped mutation goes through this
 * so a company id from the client can never reach a workspace the person is not in.
 */
export async function assertMembership(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<void> {
  const row = await db
    .prepare('SELECT 1 AS found FROM core_memberships WHERE account_id = ? AND company_id = ?')
    .bind(accountId, companyId)
    .first<{ found: number }>();
  if (!row) throw new ApiError(404, 'Company not found or access is unavailable.');
}

/** Accepts an invitation, creating the membership. Idempotent under a double click. */
export async function acceptInvitation(
  db: D1Database,
  who: Who,
  invitationId: string,
): Promise<{ companyId: string }> {
  const invitation = await db
    .prepare(
      `SELECT id, company_id, role, email, status, expires_at FROM core_invitations WHERE id = ?`,
    )
    .bind(invitationId)
    .first<{
      id: string;
      company_id: string;
      role: MemberRole;
      email: string;
      status: string;
      expires_at: number;
    }>();

  if (!invitation) throw new ApiError(404, 'This invitation is no longer available.');
  if (invitation.email.toLowerCase() !== who.email.toLowerCase()) {
    throw new ApiError(403, 'This invitation was sent to a different email address.');
  }
  if (invitation.status !== 'pending') {
    throw new ApiError(409, 'This invitation has already been answered.');
  }
  if (invitation.expires_at <= Date.now()) {
    throw new ApiError(410, 'This invitation has expired. Ask for a new one.');
  }

  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
         VALUES (?1, ?2, ?3, 'active', '', ?4)
         ON CONFLICT(company_id, account_id) DO NOTHING`,
      )
      .bind(invitation.company_id, who.id, invitation.role, now),
    db
      .prepare("UPDATE core_invitations SET status = 'accepted', responded_at = ?2 WHERE id = ?1")
      .bind(invitation.id, now),
    auditStatement(db, {
      companyId: invitation.company_id,
      accountId: who.id,
      action: 'membership.invitation.accepted',
      detail: `Joined as ${invitation.role}`,
    }),
  ]);

  return { companyId: invitation.company_id };
}

export async function declineInvitation(
  db: D1Database,
  who: Who,
  invitationId: string,
): Promise<void> {
  const invitation = await db
    .prepare('SELECT id, company_id, email, status FROM core_invitations WHERE id = ?')
    .bind(invitationId)
    .first<{ id: string; company_id: string; email: string; status: string }>();

  if (!invitation) throw new ApiError(404, 'This invitation is no longer available.');
  if (invitation.email.toLowerCase() !== who.email.toLowerCase()) {
    throw new ApiError(403, 'This invitation was sent to a different email address.');
  }
  if (invitation.status !== 'pending') {
    throw new ApiError(409, 'This invitation has already been answered.');
  }

  await db.batch([
    db
      .prepare("UPDATE core_invitations SET status = 'declined', responded_at = ?2 WHERE id = ?1")
      .bind(invitation.id, Date.now()),
    auditStatement(db, {
      companyId: invitation.company_id,
      accountId: who.id,
      action: 'membership.invitation.declined',
      detail: 'Invitation declined',
    }),
  ]);
}
