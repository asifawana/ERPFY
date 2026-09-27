import {
  auditStatement,
  body,
  database,
  failure,
  field,
  json,
} from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

function booleanField(data: Record<string, unknown>, key: string): boolean {
  const value = data[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Expected a boolean for ${key}.`);
  }
  return value;
}

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);
    const viewer = await requireViewer(db, request.headers);
    const displayName = field(data, 'displayName', {
      max: 80,
      label: 'display name',
    });
    const timezone = field(data, 'timezone', { max: 100, label: 'timezone' });
    if (!validTimezone(timezone)) {
      return json({ error: 'Choose a valid IANA timezone.' }, 400);
    }

    const preferences = {
      emailAccountActivity: booleanField(data, 'emailAccountActivity'),
      emailSecurityAlerts: booleanField(data, 'emailSecurityAlerts'),
      emailBillingNotices: booleanField(data, 'emailBillingNotices'),
      emailProductUpdates: booleanField(data, 'emailProductUpdates'),
    };
    const now = Date.now();

    await db.batch([
      db
        .prepare(
          'UPDATE core_accounts SET display_name = ?2, timezone = ?3 WHERE id = ?1',
        )
        .bind(viewer.accountId, displayName, timezone),
      db
        .prepare(
          `INSERT INTO core_account_preferences
             (account_id, email_account_activity, email_security_alerts,
              email_billing_notices, email_product_updates, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT (account_id) DO UPDATE SET
             email_account_activity = excluded.email_account_activity,
             email_security_alerts = excluded.email_security_alerts,
             email_billing_notices = excluded.email_billing_notices,
             email_product_updates = excluded.email_product_updates,
             updated_at = excluded.updated_at`,
        )
        .bind(
          viewer.accountId,
          preferences.emailAccountActivity ? 1 : 0,
          preferences.emailSecurityAlerts ? 1 : 0,
          preferences.emailBillingNotices ? 1 : 0,
          preferences.emailProductUpdates ? 1 : 0,
          now,
        ),
      auditStatement(db, {
        companyId: null,
        accountId: viewer.accountId,
        action: 'account.settings.updated',
        detail:
          'Updated personal profile, regional and notification preferences',
      }),
    ]);

    return json({
      profile: { displayName, email: viewer.email, timezone },
      preferences,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Expected a boolean')
    ) {
      return json({ error: 'Invalid notification preference.' }, 400);
    }
    return failure(error);
  }
}
