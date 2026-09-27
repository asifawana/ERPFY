import { headers } from 'next/headers';

import { listCompaniesForAccount, type CompanyAccess } from './company';
import { database } from './server';
import { currentViewer, type Viewer } from './viewer';

export type PendingInvitation = {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  createdAt: number;
  expiresAt: number;
};

/**
 * Server-side loader shared by every admin screen.
 *
 * Returns a discriminated result rather than throwing, so a screen can render an honest
 * signed-out or storage-unavailable state instead of an error page.
 *
 * It loads only what the shell and the dashboard greeting actually use — who is signed in,
 * and their name and time zone. Nothing else is read, so no screen pays for data it does
 * not show.
 */

export type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  /** IANA zone for the person, used for the greeting. Empty when never set. */
  timezone: string;
};

export type AccountPreferences = {
  emailAccountActivity: boolean;
  emailSecurityAlerts: boolean;
  emailBillingNotices: boolean;
  emailProductUpdates: boolean;
};

/**
 * The company a settings or business screen is acting on.
 *
 * Resolved server-side from the account's own memberships — most recently opened, else the
 * one joined first — so a screen never has to trust a company id from the browser. Null
 * when the person is a member of none, which is a state the screens must state plainly
 * rather than paper over.
 */
export type CompanyContext = {
  id: string;
  name: string;
  slug: string;
  role: string;
  /** Initials for the settings header chip. */
  initials: string;
};

export type AccountData =
  | {
      status: 'ready';
      viewer: Viewer;
      profile: AccountProfile;
      preferences: AccountPreferences;
      company: CompanyContext | null;
      companies: CompanyAccess[];
      invitations: PendingInvitation[];
    }
  | { status: 'signed-out' }
  | { status: 'unavailable'; message: string };

const UNAVAILABLE =
  'Account storage could not be reached. Nothing has been changed.';

export async function loadAccount(): Promise<AccountData> {
  const requestHeaders = await headers();

  let db: D1Database;
  try {
    db = database();
  } catch {
    return { status: 'unavailable', message: UNAVAILABLE };
  }

  try {
    const viewer = await currentViewer(db, requestHeaders);
    if (!viewer) return { status: 'signed-out' };

    const row = await db
      .prepare(
        `SELECT
           a.id,
           a.email,
           a.display_name,
           a.timezone,
           COALESCE(p.email_account_activity, 1) AS email_account_activity,
           COALESCE(p.email_security_alerts, 1) AS email_security_alerts,
           COALESCE(p.email_billing_notices, 1) AS email_billing_notices,
           COALESCE(p.email_product_updates, 0) AS email_product_updates
         FROM core_accounts a
         LEFT JOIN core_account_preferences p ON p.account_id = a.id
         WHERE a.id = ?`,
      )
      .bind(viewer.accountId)
      .first<{
        id: string;
        email: string;
        display_name: string;
        timezone: string;
        email_account_activity: number;
        email_security_alerts: number;
        email_billing_notices: number;
        email_product_updates: number;
      }>();

    // A session whose account has gone is not a session.
    if (!row) return { status: 'signed-out' };

    const [companyRow, companies, invitationsResult] = await Promise.all([
      db
        .prepare(
          `SELECT c.id, c.name, c.slug, m.role
             FROM core_memberships m
             JOIN core_companies c ON c.id = m.company_id
             LEFT JOIN core_company_visits v
               ON v.company_id = c.id AND v.account_id = m.account_id
            WHERE m.account_id = ?1 AND m.status = 'active'
            ORDER BY COALESCE(v.last_opened_at, 0) DESC, m.joined_at ASC
            LIMIT 1`,
        )
        .bind(viewer.accountId)
        .first<{ id: string; name: string; slug: string; role: string }>(),
      listCompaniesForAccount(db, viewer.accountId),
      db
        .prepare(
          `SELECT i.id, i.company_id, i.role, i.created_at, i.expires_at, c.name AS company_name
             FROM core_invitations i
             JOIN core_companies c ON c.id = i.company_id
            WHERE i.email = ?1 AND i.status = 'pending' AND i.expires_at > ?2
            ORDER BY i.created_at DESC`,
        )
        .bind(viewer.email, Date.now())
        .all<{
          id: string;
          company_id: string;
          role: string;
          created_at: number;
          expires_at: number;
          company_name: string;
        }>(),
    ]);

    const invitations: PendingInvitation[] = (invitationsResult.results ?? []).map(
      (inv) => ({
        id: inv.id,
        companyId: inv.company_id,
        companyName: inv.company_name,
        role: inv.role,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
      }),
    );

    return {
      status: 'ready',
      viewer,
      company: companyRow
        ? {
            id: companyRow.id,
            name: companyRow.name,
            slug: companyRow.slug,
            role: companyRow.role,
            initials: initialsFor(companyRow.name),
          }
        : null,
      companies,
      invitations,
      profile: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        timezone: row.timezone,
      },
      preferences: {
        emailAccountActivity: row.email_account_activity === 1,
        emailSecurityAlerts: row.email_security_alerts === 1,
        emailBillingNotices: row.email_billing_notices === 1,
        emailProductUpdates: row.email_product_updates === 1,
      },
    };
  } catch (error) {
    console.error(
      'Account load failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return { status: 'unavailable', message: UNAVAILABLE };
  }
}

/** Two letters at most, from the first words of the company name. */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
