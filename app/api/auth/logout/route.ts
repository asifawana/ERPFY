import { body, database, failure, json } from '@/lib/core/server';
import { clearedSessionCookie, revokeSession } from '@/lib/core/session';
import { currentViewer } from '@/lib/core/viewer';

export async function POST(request: Request) {
  try {
    const db = database();
    await body(request);

    const viewer = await currentViewer(db, request.headers);
    // Signing out is idempotent: no session simply means already signed out.
    if (viewer) {
      await revokeSession(db, viewer.accountId, viewer.session.id);
    }

    const response = json({ signedOut: true });
    response.headers.append('Set-Cookie', clearedSessionCookie(request));
    return response;
  } catch (error) {
    return failure(error);
  }
}
