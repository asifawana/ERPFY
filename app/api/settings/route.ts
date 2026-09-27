import { body, database, failure, json } from '@/lib/core/server';
import { clearSecret, loadSettings, saveSettings } from '@/lib/core/settings';
import { listSessions } from '@/lib/core/session';
import { requireViewer } from '@/lib/core/viewer';

/**
 * Settings for the signed-in person, optionally in the context of one company.
 *
 * `companyId` is always explicit. There is no server-side "current company", so a second
 * browser tab open on a different ERP cannot make this route write into the wrong one.
 */

function companyParam(request: Request): string | null {
  const value = new URL(request.url).searchParams.get('companyId');
  return value && value.length <= 64 ? value : null;
}

/** Real sign-in devices, from the session table rather than a stored list. */
async function loginDevices(db: D1Database, accountId: string, sessionId: string) {
  const sessions = await listSessions(db, accountId, sessionId);
  return sessions.map((session) => ({
    id: session.id,
    device: session.deviceLabel,
    // `describeDevice` already folds the browser into the label, and ERPFY does not do
    // geo-IP, so these two stay empty rather than carrying a guess.
    browser: '',
    ip: session.ipAddress,
    location: '',
    lastActive: new Date(session.lastSeenAt).toISOString(),
    current: session.current,
  }));
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const result = await loadSettings(db, viewer.accountId, companyParam(request));

    return json({
      ...result,
      settings: {
        ...result.settings,
        loginDevices: await loginDevices(db, viewer.accountId, viewer.session.id),
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);
    const viewer = await requireViewer(db, request.headers);

    const companyId = typeof data.companyId === 'string' ? data.companyId : companyParam(request);
    const result = await saveSettings(db, viewer.accountId, companyId, data.settings);

    return json({
      ...result,
      settings: {
        ...result.settings,
        loginDevices: await loginDevices(db, viewer.accountId, viewer.session.id),
      },
    });
  } catch (error) {
    return failure(error);
  }
}

/** Removes one stored credential. Requires a company and a role that may change it. */
export async function DELETE(request: Request) {
  try {
    const db = database();
    const data = await body(request);
    const viewer = await requireViewer(db, request.headers);

    const companyId = typeof data.companyId === 'string' ? data.companyId : companyParam(request);
    const name = typeof data.secret === 'string' ? data.secret : '';
    if (!companyId) {
      return json({ error: 'Open an ERP before changing its credentials.' }, 400);
    }

    await clearSecret(db, viewer.accountId, companyId, name);
    return json(await loadSettings(db, viewer.accountId, companyId));
  } catch (error) {
    return failure(error);
  }
}
