import { hashPassword, passwordProblem, verifyPassword } from '@/lib/core/crypto';
import {
  ApiError,
  body,
  database,
  failure,
  json,
} from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);

    const currentPassword = data.currentPassword;
    const newPassword = data.newPassword;
    if (
      typeof currentPassword !== 'string' ||
      !currentPassword ||
      currentPassword.length > 200
    ) {
      throw new ApiError(400, 'Please enter a valid current password.');
    }
    if (typeof newPassword !== 'string') {
      throw new ApiError(400, 'Please enter a valid new password.');
    }
    const problem = passwordProblem(newPassword);
    if (problem) throw new ApiError(400, problem);

    const creds = await db
      .prepare(
        'SELECT password_hash FROM core_credentials WHERE account_id = ?',
      )
      .bind(viewer.accountId)
      .first<{ password_hash: string }>();

    if (!creds || !creds.password_hash) {
      throw new ApiError(400, 'No existing password found for this account.');
    }

    const check = await verifyPassword(currentPassword, creds.password_hash);
    if (!check.valid) {
      throw new ApiError(400, 'Current password is incorrect.');
    }

    const now = Date.now();
    const newHash = await hashPassword(newPassword);

    const results = await db.batch([
      db
        .prepare(
          `UPDATE core_credentials SET password_hash = ?1, password_updated_at = ?2,
             failed_attempts = 0, locked_until = 0
           WHERE account_id = ?3 AND password_hash = ?4
             AND EXISTS (SELECT 1 FROM core_sessions
                         WHERE id = ?5 AND account_id = ?3 AND revoked_at IS NULL)`,
        )
        .bind(newHash, now, viewer.accountId, creds.password_hash, viewer.session.id),
      db
        .prepare(
          `UPDATE core_sessions SET revoked_at = ?1
           WHERE account_id = ?2 AND id != ?3 AND revoked_at IS NULL
             AND EXISTS (SELECT 1 FROM core_credentials
                         WHERE account_id = ?2 AND password_hash = ?4)`,
        )
        .bind(now, viewer.accountId, viewer.session.id, newHash),
      // Gate the audit on the same credential version as session revocation. A
      // concurrent change must not overwrite a password or record a false success.
      db
        .prepare(
          `INSERT INTO core_activity_events (id, company_id, account_id, action, detail, created_at)
           SELECT ?1, NULL, ?2, 'account.password_changed', ?3, ?4
           WHERE EXISTS (SELECT 1 FROM core_credentials
                         WHERE account_id = ?2 AND password_hash = ?5)`,
        )
        .bind(
          crypto.randomUUID(),
          viewer.accountId,
          JSON.stringify({ otherSessionsRevoked: true }),
          now,
          newHash,
        ),
    ]);

    if (!results[0].meta.changes) {
      throw new ApiError(409, 'Account security changed. Sign in again before retrying.');
    }

    return json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    return failure(error);
  }
}
