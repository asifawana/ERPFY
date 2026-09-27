import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    const dev = await db
      .prepare('SELECT organization_id FROM eap_dev_profiles WHERE account_id = ?1')
      .bind(viewer.accountId)
      .first<{ organization_id: string }>();

    if (!dev) {
      return json({ credentials: [] });
    }

    const { results } = await db
      .prepare(
        `SELECT c.id, c.app_id, c.client_id, c.environment, c.status,
                c.created_at, c.last_used_at, a.name as app_name, a.slug as app_slug
           FROM eap_dev_credentials c
           JOIN eap_apps a ON a.id = c.app_id
          WHERE a.organization_id = ?1
          ORDER BY c.created_at DESC`,
      )
      .bind(dev.organization_id)
      .all<{
        id: string;
        app_id: string;
        client_id: string;
        environment: string;
        status: string;
        created_at: number;
        last_used_at: number | null;
        app_name: string;
        app_slug: string;
      }>();

    return json({
      credentials: (results || []).map((c) => ({
        id: c.id,
        appId: c.app_id,
        appName: c.app_name,
        appSlug: c.app_slug,
        label: c.app_name ? `${c.app_name} Key` : 'API Client',
        clientId: c.client_id,
        environment: c.environment,
        status: c.status,
        createdAt: c.created_at,
        lastUsedAt: c.last_used_at,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);

    let targetAppId = data.appId;
    let appName = '';

    if (targetAppId) {
      // Verify ownership of explicitly requested app
      const app = await db
        .prepare(
          `SELECT a.id, a.name
             FROM eap_apps a
             JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
            WHERE a.id = ?1 AND p.account_id = ?2`,
        )
        .bind(targetAppId, viewer.accountId)
        .first<{ id: string; name: string }>();

      if (!app) {
        return failure(new ApiError(400, 'Application not found or unauthorized.'));
      }
      appName = app.name;
    } else {
      // Find developer's first registered app
      const app = await db
        .prepare(
          `SELECT a.id, a.name
             FROM eap_apps a
             JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
            WHERE p.account_id = ?1
            ORDER BY a.created_at ASC
            LIMIT 1`,
        )
        .bind(viewer.accountId)
        .first<{ id: string; name: string }>();

      if (!app) {
        return failure(new ApiError(400, 'You must create an application before generating API credentials.'));
      }
      targetAppId = app.id;
      appName = app.name;
    }

    const environment = field(data, 'environment', { required: false }) === 'production'
      ? 'production'
      : 'development';

    if (environment === 'production') {
      const org = await db
        .prepare(
          `SELECT o.status as org_status
             FROM eap_apps a
             JOIN eap_dev_organizations o ON o.id = a.organization_id
            WHERE a.id = ?1`,
        )
        .bind(targetAppId)
        .first<{ org_status: string }>();

      if (org?.org_status !== 'verified') {
        return failure(
          new ApiError(403, 'Developer organization must be verified by Platform Admin before generating production API credentials.'),
        );
      }
    }

    const clientId = `erp_client_${crypto.randomBytes(12).toString('hex')}`;
    const rawSecret = `erp_secret_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const credId = `cred_${crypto.randomBytes(10).toString('hex')}`;
    const now = Date.now();

    await db.batch([
      db
        .prepare(
          `INSERT INTO eap_dev_credentials
            (id, app_id, client_id, client_secret_hash, environment, status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)`,
        )
        .bind(credId, targetAppId, clientId, secretHash, environment, now),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, app_id, action, details, created_at)
           VALUES (?1, ?2, 'developer', ?3, 'credentials.created', ?4, ?5)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          targetAppId,
          JSON.stringify({ clientId, environment }),
          now,
        ),
    ]);

    return json({
      ok: true,
      clientSecret: rawSecret, // Direct key for UI consumption
      credential: {
        id: credId,
        appId: targetAppId,
        label: appName ? `${appName} Key` : 'API Client',
        clientId,
        clientSecret: rawSecret, // Displayed once!
        environment,
        createdAt: now,
      },
      warning: 'Store your Client Secret securely. It will not be shown again.',
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);
    const credentialId = field(data, 'credentialId', { label: 'Credential ID' });

    // Verify ownership
    const cred = await db
      .prepare(
        `SELECT c.id, c.app_id, c.client_id
           FROM eap_dev_credentials c
           JOIN eap_apps a ON a.id = c.app_id
           JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
          WHERE c.id = ?1 AND p.account_id = ?2`,
      )
      .bind(credentialId, viewer.accountId)
      .first<{ id: string; app_id: string; client_id: string }>();

    if (!cred) {
      return failure(new ApiError(400, 'Credential not found or unauthorized.'));
    }

    const now = Date.now();
    await db.batch([
      db
        .prepare(`UPDATE eap_dev_credentials SET status = 'revoked' WHERE id = ?1`)
        .bind(credentialId),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, app_id, action, details, created_at)
           VALUES (?1, ?2, 'developer', ?3, 'credentials.revoked', ?4, ?5)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          cred.app_id,
          JSON.stringify({ credentialId, clientId: cred.client_id }),
          now,
        ),
    ]);

    return json({ ok: true, message: 'Credential revoked.' });
  } catch (error) {
    return failure(error);
  }
}
