import { hashPassword, passwordProblem, randomToken } from '@/lib/core/crypto';
import {
  ApiError,
  auditStatement,
  body,
  database,
  emailField,
  failure,
  field,
  json,
} from '@/lib/core/server';
import {
  createSession,
  sessionCookie,
  SESSION_ABSOLUTE_MS,
} from '@/lib/core/session';

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);

    const email = emailField(data, 'email').toLowerCase();
    // A password is an exact secret: leading/trailing whitespace is significant.
    const password = data.password;
    if (typeof password !== 'string') {
      throw new ApiError(400, 'Please enter a valid password.');
    }
    const problem = passwordProblem(password);
    if (problem) throw new ApiError(400, problem);
    const displayName =
      field(data, 'displayName', { max: 100, label: 'name' }) ||
      email.split('@')[0];

    // Check if account already exists
    const existing = await db
      .prepare('SELECT id FROM core_accounts WHERE email = ?')
      .bind(email)
      .first<{ id: string }>();

    if (existing) {
      throw new ApiError(
        409,
        'An account with this email already exists. Please sign in instead.',
      );
    }

    const now = Date.now();
    const accountId = `acc_${randomToken(16)}`;
    const passHash = await hashPassword(password);

    // Atomic creation of account, credentials, and preferences
    await db.batch([
      db
        .prepare(
          'INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          accountId,
          email,
          displayName,
          'UTC',
          now,
          now,
          null,
        ),
      db
        .prepare(
          'INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until) VALUES (?, ?, ?, 0, 0)',
        )
        .bind(accountId, passHash, now),
      db
        .prepare(
          'INSERT INTO core_account_preferences (account_id, updated_at) VALUES (?, ?)',
        )
        .bind(accountId, now),
      auditStatement(db, {
        companyId: null,
        accountId,
        action: 'account.created',
        detail: JSON.stringify({ email, source: 'signup' }),
      }),
    ]);

    const session = await createSession(db, request, accountId, {
      verified: false,
    });
    const response = json({ signedIn: true, accountId, emailVerified: false });
    response.headers.append(
      'Set-Cookie',
      sessionCookie(
        request,
        session.token,
        Math.floor(SESSION_ABSOLUTE_MS / 1000),
      ),
    );
    return response;
  } catch (error) {
    return failure(error);
  }
}
