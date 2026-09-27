import { ApiError } from './server';
import { resolveSession, type SessionRow } from './session';

/**
 * Who is making this request.
 * Authority: ERPFY-MASTER-PLAN.md sections 25, 31, 50, 88.
 *
 * An ERPFY session is the only thing that signs a person in. Every request resolves an
 * opaque cookie to a real session row, which makes sessions listable, revocable and
 * eligible for step-up verification.
 */

export type Viewer = {
  accountId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  session: SessionRow;
};

type AccountRow = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: number | null;
};

export async function currentViewer(
  db: D1Database,
  headers: Headers,
): Promise<Viewer | null> {
  const session = await resolveSession(db, headers);
  if (!session) return null;

  const account = await db
    .prepare(
      'SELECT id, email, display_name, email_verified_at FROM core_accounts WHERE id = ?',
    )
    .bind(session.account_id)
    .first<AccountRow>();

  // A session whose account has gone is not a session.
  if (!account) return null;

  await db
    .prepare('UPDATE core_accounts SET last_seen_at = ?2 WHERE id = ?1')
    .bind(account.id, Date.now())
    .run();

  return {
    accountId: account.id,
    email: account.email,
    displayName: account.display_name,
    emailVerified: account.email_verified_at !== null,
    session,
  };
}

export async function requireViewer(
  db: D1Database,
  headers: Headers,
): Promise<Viewer> {
  const viewer = await currentViewer(db, headers);
  if (!viewer) throw new ApiError(401, 'Sign in to continue.');
  return viewer;
}
