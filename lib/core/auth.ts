import {
  hashPassword,
  importSecretKey,
  normaliseRecoveryCode,
  randomToken,
  sha256Hex,
  unseal,
  verifyPassword,
  verifyTotp,
} from './crypto';
import { ApiError, auditStatement } from './server';
import { createSession, secretKeyMaterial } from './session';

/**
 * Signing in.
 * Authority: ERPFY-MASTER-PLAN.md sections 50, 51, 81, 99.
 *
 * All that remains of the authentication layer, because signing in is all the admin
 * screens need: they render behind a session, and this is what issues one. Sign-up,
 * email verification, password reset, TOTP enrolment, step-up and the security centre
 * went with the screens that offered them.
 *
 * One rule still shapes the error handling: sign-in never reveals whether an address has
 * an account, and an unknown address still pays the cost of a hash comparison.
 */

/** Failed sign-ins before the account is locked, and for how long. */
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

/** A half-finished sign-in cannot linger. */
const CHALLENGE_MS = 5 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;

type AccountRow = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: number | null;
};

type CredentialRow = {
  account_id: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: number;
};

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

export type SignInResult =
  | {
      outcome: 'signed-in';
      accountId: string;
      token: string;
      expiresAt: number;
    }
  | { outcome: 'second-factor'; challengeToken: string; expiresAt: number };

export async function signIn(
  db: D1Database,
  request: Request,
  input: { email: string; password: string },
): Promise<SignInResult> {
  const email = input.email.toLowerCase();
  const account = await db
    .prepare(
      'SELECT id, email, display_name, email_verified_at FROM core_accounts WHERE email = ?',
    )
    .bind(email)
    .first<AccountRow>();

  const credential = account
    ? await db
        .prepare(
          'SELECT account_id, password_hash, failed_attempts, locked_until FROM core_credentials WHERE account_id = ?',
        )
        .bind(account.id)
        .first<CredentialRow>()
    : null;

  if (!account || !credential) {
    // Spend comparable time on an unknown address so the response does not disclose
    // whether the account exists.
    await verifyPassword(
      input.password,
      'pbkdf2-sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAA',
    );
    throw new ApiError(401, 'Those sign-in details are not right.');
  }

  const now = Date.now();
  if (credential.locked_until > now) {
    const minutes = Math.ceil((credential.locked_until - now) / 60_000);
    throw new ApiError(
      429,
      `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    );
  }

  const check = await verifyPassword(input.password, credential.password_hash);
  if (!check.valid) {
    const attempts = credential.failed_attempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0;
    await db.batch([
      db
        .prepare(
          'UPDATE core_credentials SET failed_attempts = ?2, locked_until = ?3 WHERE account_id = ?1',
        )
        .bind(account.id, lockedUntil ? 0 : attempts, lockedUntil),
      auditStatement(db, {
        companyId: null,
        accountId: account.id,
        action: 'auth.signin.failed',
        detail: lockedUntil
          ? 'Failed sign-in; account temporarily locked'
          : 'Failed sign-in',
      }),
    ]);
    throw new ApiError(401, 'Those sign-in details are not right.');
  }

  const statements = [
    db
      .prepare(
        'UPDATE core_credentials SET failed_attempts = 0, locked_until = 0 WHERE account_id = ?1',
      )
      .bind(account.id),
  ];

  // Transparently upgrade a hash produced with fewer iterations than we now require.
  if (check.needsRehash) {
    statements.push(
      db
        .prepare(
          'UPDATE core_credentials SET password_hash = ?2, password_updated_at = ?3 WHERE account_id = ?1',
        )
        .bind(account.id, await hashPassword(input.password), now),
    );
  }
  await db.batch(statements);

  const totp = await db
    .prepare('SELECT confirmed_at FROM core_totp WHERE account_id = ?')
    .bind(account.id)
    .first<{ confirmed_at: number | null }>();

  if (totp?.confirmed_at) {
    const challengeToken = randomToken(32);
    await db
      .prepare(
        `INSERT INTO core_login_challenges (id, account_id, token_hash, attempts, created_at, expires_at, consumed_at)
         VALUES (?1, ?2, ?3, 0, ?4, ?5, NULL)`,
      )
      .bind(
        crypto.randomUUID(),
        account.id,
        await sha256Hex(challengeToken),
        now,
        now + CHALLENGE_MS,
      )
      .run();

    return {
      outcome: 'second-factor',
      challengeToken,
      expiresAt: now + CHALLENGE_MS,
    };
  }

  const session = await createSession(db, request, account.id);
  await db.batch([
    auditStatement(db, {
      companyId: null,
      accountId: account.id,
      action: 'auth.signin.succeeded',
      detail: 'Signed in with password',
    }),
  ]);

  return {
    outcome: 'signed-in',
    accountId: account.id,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

/* ------------------------------------------------------------------ *
 * Second factor
 * ------------------------------------------------------------------ */

async function loadTotpSecret(
  db: D1Database,
  accountId: string,
): Promise<string> {
  const keyMaterial = secretKeyMaterial();
  if (!keyMaterial) {
    throw new ApiError(
      503,
      'Two-factor authentication is unavailable because this deployment has no secret key configured.',
    );
  }
  const row = await db
    .prepare(
      'SELECT secret_cipher, secret_iv FROM core_totp WHERE account_id = ?',
    )
    .bind(accountId)
    .first<{ secret_cipher: string; secret_iv: string }>();
  if (!row)
    throw new ApiError(
      404,
      'Two-factor authentication is not set up for this account.',
    );

  const key = await importSecretKey(keyMaterial);
  return unseal(key, { cipher: row.secret_cipher, iv: row.secret_iv });
}

/** Verifies a TOTP code and rejects replay of a counter already accepted. */
async function checkTotpCode(
  db: D1Database,
  accountId: string,
  code: string,
): Promise<boolean> {
  const row = await db
    .prepare('SELECT last_counter FROM core_totp WHERE account_id = ?')
    .bind(accountId)
    .first<{ last_counter: number }>();
  if (!row) return false;

  const secret = await loadTotpSecret(db, accountId);
  const result = await verifyTotp(secret, code);
  if (!result.valid) return false;
  if (result.counter <= row.last_counter) return false;

  await db
    .prepare('UPDATE core_totp SET last_counter = ?2 WHERE account_id = ?1')
    .bind(accountId, result.counter)
    .run();
  return true;
}

/** Consumes a recovery code. Single use, and the hash is cleared by marking it used. */
async function checkRecoveryCode(
  db: D1Database,
  accountId: string,
  code: string,
): Promise<boolean> {
  const hash = await sha256Hex(normaliseRecoveryCode(code));
  const result = await db
    .prepare(
      'UPDATE core_recovery_codes SET used_at = ?3 WHERE account_id = ?1 AND code_hash = ?2 AND used_at IS NULL',
    )
    .bind(accountId, hash, Date.now())
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function completeSecondFactor(
  db: D1Database,
  request: Request,
  input: {
    challengeToken: string;
    code: string;
    useRecoveryCode: boolean;
    trustDevice: boolean;
  },
): Promise<{ accountId: string; token: string; expiresAt: number }> {
  const tokenHash = await sha256Hex(input.challengeToken);
  const challenge = await db
    .prepare(
      'SELECT id, account_id, attempts, expires_at, consumed_at FROM core_login_challenges WHERE token_hash = ?',
    )
    .bind(tokenHash)
    .first<{
      id: string;
      account_id: string;
      attempts: number;
      expires_at: number;
      consumed_at: number | null;
    }>();

  if (!challenge || challenge.consumed_at !== null) {
    throw new ApiError(401, 'Start signing in again.');
  }
  if (challenge.expires_at <= Date.now()) {
    throw new ApiError(410, 'That sign-in took too long. Start again.');
  }
  if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
    await db
      .prepare(
        'UPDATE core_login_challenges SET consumed_at = ?2 WHERE id = ?1',
      )
      .bind(challenge.id, Date.now())
      .run();
    throw new ApiError(
      429,
      'Too many incorrect codes. Start signing in again.',
    );
  }

  const accepted = input.useRecoveryCode
    ? await checkRecoveryCode(db, challenge.account_id, input.code)
    : await checkTotpCode(db, challenge.account_id, input.code);

  if (!accepted) {
    await db
      .prepare(
        'UPDATE core_login_challenges SET attempts = attempts + 1 WHERE id = ?1',
      )
      .bind(challenge.id)
      .run();
    throw new ApiError(
      401,
      input.useRecoveryCode
        ? 'That recovery code is not valid.'
        : 'That code is not valid.',
    );
  }

  const now = Date.now();
  const session = await createSession(db, request, challenge.account_id, {
    trustDevice: input.trustDevice,
  });

  await db.batch([
    db
      .prepare(
        'UPDATE core_login_challenges SET consumed_at = ?2 WHERE id = ?1',
      )
      .bind(challenge.id, now),
    auditStatement(db, {
      companyId: null,
      accountId: challenge.account_id,
      action: 'auth.signin.succeeded',
      detail: input.useRecoveryCode
        ? 'Signed in with a recovery code'
        : 'Signed in with an authenticator code',
    }),
  ]);

  return {
    accountId: challenge.account_id,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
