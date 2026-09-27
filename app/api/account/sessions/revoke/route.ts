import {
  ApiError,
  body,
  database,
  failure,
  field,
  json,
} from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);
    const sessionId = field(data, 'sessionId', {
      max: 100,
      label: 'session id',
    });

    if (sessionId === viewer.session.id) {
      throw new ApiError(
        400,
        'Cannot revoke current session. Please use Sign Out to terminate current session.',
      );
    }

    const now = Date.now();
    const results = await db.batch([
      db
        .prepare(
          'UPDATE core_sessions SET revoked_at = ?1 WHERE id = ?2 AND account_id = ?3 AND revoked_at IS NULL',
        )
        .bind(now, sessionId, viewer.accountId),
      db
        .prepare(
          `INSERT INTO core_activity_events (id, company_id, account_id, action, detail, created_at)
           SELECT ?1, NULL, ?2, 'account.session_revoked', ?3, ?4 WHERE changes() > 0`,
        )
        .bind(crypto.randomUUID(), viewer.accountId, JSON.stringify({ sessionId }), now),
    ]);
    if (!results[0].meta.changes) {
      throw new ApiError(404, 'That session is no longer active.');
    }
    return json({ ok: true, message: 'Session revoked successfully.' });
  } catch (error) {
    return failure(error);
  }
}
