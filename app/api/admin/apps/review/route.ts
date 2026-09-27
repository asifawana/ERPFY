import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { signReleaseBuild } from '@/lib/eap/signing';

export function isPlatformAdmin(viewer: { accountId: string; email: string; emailVerified?: boolean }): boolean {
  if (!viewer || typeof viewer !== 'object') return false;
  if (typeof viewer.accountId !== 'string' || typeof viewer.email !== 'string') return false;

  // 1. Explicit canonical bootstrap platform administrator identity (proven server-side protected)
  if (viewer.accountId === 'acc_admin') {
    return true;
  }

  // 2. Explicit server-side allowlist via PLATFORM_ADMIN_EMAILS
  // Trust boundary: An account MUST have verified email ownership before claiming
  // platform admin authority through the email allowlist.
  if (viewer.emailVerified !== true) {
    return false;
  }

  const rawEnv = process.env.PLATFORM_ADMIN_EMAILS;
  if (typeof rawEnv === 'string' && rawEnv.trim().length > 0) {
    const normalizedViewerEmail = viewer.email.trim().toLowerCase();
    if (normalizedViewerEmail.length > 0) {
      // Split on comma, semicolon, or whitespace, trim, lowercase, and filter non-empty
      const allowedEmails = rawEnv
        .split(/[,\s;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

      // Exact normalized equality check only
      if (allowedEmails.includes(normalizedViewerEmail)) {
        return true;
      }
    }
  }

  // Fail closed: no heuristics, no name-based matching, no domain matching, no startsWith/endsWith
  return false;
}

export function requirePlatformAdmin(viewer: { accountId: string; email: string; emailVerified?: boolean }): void {
  if (!isPlatformAdmin(viewer)) {
    throw new ApiError(403, 'Unauthorized: Platform Admin authority required.');
  }
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    const { results } = await db
      .prepare(
        `SELECT r.id as review_id, r.status as review_status, r.automated_scan_result,
                r.automated_scan_details, r.reviewer_notes, r.created_at as review_created_at,
                v.id as version_id, v.version, v.protocol, v.manifest_json, v.package_hash,
                v.signature, v.release_id,
                a.id as app_id, a.slug as app_slug, a.name as app_name, a.category,
                a.official_app, a.status as app_status, a.is_killed, a.kill_reason,
                o.name as org_name, o.slug as org_slug, o.status as org_status
           FROM eap_app_reviews r
           JOIN eap_app_versions v ON v.id = r.version_id
           JOIN eap_apps a ON a.id = v.app_id
           JOIN eap_dev_organizations o ON o.id = a.organization_id
          ORDER BY r.created_at DESC`,
      )
      .all<{
        review_id: string;
        review_status: string;
        automated_scan_result: string;
        automated_scan_details: string;
        reviewer_notes: string;
        review_created_at: number;
        version_id: string;
        version: string;
        protocol: string;
        manifest_json: string;
        package_hash: string;
        signature: string;
        release_id: string;
        app_id: string;
        app_slug: string;
        app_name: string;
        category: string;
        official_app: number;
        app_status: string;
        is_killed: number;
        kill_reason: string;
        org_name: string;
        org_slug: string;
        org_status: string;
      }>();

    return json({
      reviews: (results || []).map((row) => ({
        id: row.review_id,
        status: row.review_status,
        automatedScanResult: row.automated_scan_result,
        automatedScanDetails: row.automated_scan_details ? JSON.parse(row.automated_scan_details) : null,
        reviewerNotes: row.reviewer_notes,
        createdAt: row.review_created_at,
        version: {
          id: row.version_id,
          version: row.version,
          protocol: row.protocol,
          manifest: JSON.parse(row.manifest_json || '{}'),
          packageHash: row.package_hash,
          signature: row.signature,
          releaseId: row.release_id,
        },
        app: {
          id: row.app_id,
          slug: row.app_slug,
          name: row.app_name,
          category: row.category,
          officialApp: row.official_app === 1,
          status: row.app_status,
          isKilled: row.is_killed === 1,
          killReason: row.kill_reason,
          organization: {
            name: row.org_name,
            slug: row.org_slug,
            status: row.org_status,
          },
        },
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
    requirePlatformAdmin(viewer);
    const data = await body(request);

    const action = field(data, 'action', { label: 'Action' }); // 'approve' | 'request_changes' | 'reject' | 'kill' | 'unkill'
    const reviewId = field(data, 'reviewId', { required: false });
    const appId = field(data, 'appId', { required: false });
    const message = field(data, 'message', { required: false, max: 2000 });
    const notes = field(data, 'notes', { required: false, max: 1000 });

    const now = Date.now();

    // Handle Emergency Kill Switch
    if (action === 'kill') {
      if (!appId) throw new Error('App ID required for emergency kill.');
      const reason = message || 'Emergency security suspension invoked by Platform Admin.';
      await db.batch([
        db
          .prepare('UPDATE eap_apps SET is_killed = 1, kill_reason = ?1, updated_at = ?2 WHERE id = ?3')
          .bind(reason, now, appId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, app_id, action, details, created_at)
             VALUES (?1, ?2, 'admin', ?3, 'app.killed', ?4, ?5)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            appId,
            JSON.stringify({ reason }),
            now,
          ),
      ]);
      return json({ ok: true, action: 'kill', appId, message: 'Application globally suspended.' });
    }

    if (action === 'unkill') {
      if (!appId) throw new Error('App ID required.');
      await db.batch([
        db
          .prepare("UPDATE eap_apps SET is_killed = 0, kill_reason = '', updated_at = ?1 WHERE id = ?2")
          .bind(now, appId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, app_id, action, details, created_at)
             VALUES (?1, ?2, 'admin', ?3, 'app.reinstated', '{}', ?4)`,
          )
          .bind(`audit_${crypto.randomBytes(12).toString('hex')}`, viewer.accountId, appId, now),
      ]);
      return json({ ok: true, action: 'unkill', appId, message: 'Application reinstated.' });
    }

    // Handle Organization Verification Actions
    if (action === 'verify_org') {
      const orgId = field(data, 'organizationId', { label: 'Organization ID' });
      await db.batch([
        db.prepare("UPDATE eap_dev_organizations SET status = 'verified' WHERE id = ?1").bind(orgId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, action, details, created_at)
             VALUES (?1, ?2, 'admin', 'developer.verified', ?3, ?4)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            JSON.stringify({ orgId }),
            now,
          ),
      ]);
      return json({ ok: true, action: 'verify_org', organizationId: orgId, status: 'verified' });
    }

    if (action === 'reject_org' || action === 'suspend_org') {
      const orgId = field(data, 'organizationId', { label: 'Organization ID' });
      const newStatus = action === 'reject_org' ? 'rejected' : 'suspended';
      await db.batch([
        db.prepare("UPDATE eap_dev_organizations SET status = ?1 WHERE id = ?2").bind(newStatus, orgId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, action, details, created_at)
             VALUES (?1, ?2, 'admin', 'developer.' || ?3, ?4, ?5)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            newStatus,
            JSON.stringify({ orgId }),
            now,
          ),
      ]);
      return json({ ok: true, action, organizationId: orgId, status: newStatus });
    }

    if (!reviewId) {
      throw new Error('Review ID required for review actions.');
    }

    const review = await db
      .prepare(
        `SELECT r.id, r.version_id, v.app_id, v.version, v.package_hash, v.manifest_json
           FROM eap_app_reviews r
           JOIN eap_app_versions v ON v.id = r.version_id
          WHERE r.id = ?1`,
      )
      .bind(reviewId)
      .first<{
        id: string;
        version_id: string;
        app_id: string;
        version: string;
        package_hash: string;
        manifest_json: string;
      }>();

    if (!review) {
      throw new Error('Review record not found.');
    }

    if (action === 'approve') {
      // Ensure publisher developer organization is verified before public approval
      const publisher = await db
        .prepare(
          `SELECT o.id, o.status
             FROM eap_apps a
             JOIN eap_dev_organizations o ON o.id = a.organization_id
            WHERE a.id = ?1`,
        )
        .bind(review.app_id)
        .first<{ id: string; status: string }>();

      if (publisher?.status !== 'verified') {
        throw new ApiError(400, 'Cannot approve application: Publisher organization must be verified by Platform Admin prior to public release.');
      }

      // 1. Platform cryptographic signing
      const secret =
        (globalThis as unknown as { __erpTestSecretKey?: string }).__erpTestSecretKey ||
        process.env.ERPFY_SECRET_KEY ||
        'erpfy-platform-master-signing-key';
      const signedRelease = signReleaseBuild(review.app_id, review.version, review.package_hash, secret);

      await db.batch([
        db
          .prepare(
            `UPDATE eap_app_versions
                SET review_status = 'published',
                    signature = ?1,
                    release_id = ?2,
                    approved_at = ?3,
                    published_at = ?3
              WHERE id = ?4`,
          )
          .bind(signedRelease.signature, signedRelease.releaseId, signedRelease.signedAt, review.version_id),
        db
          .prepare(
            `UPDATE eap_apps
                SET status = 'published',
                    approved_at = ?1,
                    approved_by = ?2,
                    published_at = ?1,
                    updated_at = ?1
              WHERE id = ?3`,
          )
          .bind(now, viewer.displayName || viewer.email, review.app_id),
        db
          .prepare(
            `UPDATE eap_app_reviews
                SET status = 'approved',
                    reviewer_account_id = ?1,
                    reviewer_notes = ?2,
                    completed_at = ?3
              WHERE id = ?4`,
          )
          .bind(viewer.accountId, notes, now, reviewId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
             VALUES (?1, ?2, 'admin', ?3, ?4, 'version.approved_and_signed', ?5, ?6)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            review.app_id,
            review.version_id,
            JSON.stringify({ releaseId: signedRelease.releaseId, version: review.version }),
            now,
          ),
      ]);

      return json({
        ok: true,
        action: 'approve',
        releaseId: signedRelease.releaseId,
        message: `Version ${review.version} approved, signed, and published to the App Store.`,
      });
    }

    if (action === 'request_changes') {
      if (!message) throw new Error('Message is required when requesting changes.');

      await db.batch([
        db
          .prepare("UPDATE eap_app_versions SET review_status = 'changes_requested' WHERE id = ?1")
          .bind(review.version_id),
        db
          .prepare(
            `UPDATE eap_app_reviews
                SET status = 'changes_requested',
                    reviewer_account_id = ?1,
                    reviewer_notes = ?2
              WHERE id = ?3`,
          )
          .bind(viewer.accountId, notes || message, reviewId),
        db
          .prepare(
            `INSERT INTO eap_app_review_messages
              (id, review_id, sender_account_id, sender_type, message, created_at)
             VALUES (?1, ?2, ?3, 'reviewer', ?4, ?5)`,
          )
          .bind(
            `msg_${crypto.randomBytes(10).toString('hex')}`,
            reviewId,
            viewer.accountId,
            message,
            now,
          ),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
             VALUES (?1, ?2, 'admin', ?3, ?4, 'review.changes_requested', ?5, ?6)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            review.app_id,
            review.version_id,
            JSON.stringify({ message }),
            now,
          ),
      ]);

      return json({ ok: true, action: 'request_changes', message: 'Changes requested.' });
    }

    if (action === 'reject') {
      const reason = message || 'Application does not meet platform guidelines.';

      await db.batch([
        db
          .prepare("UPDATE eap_app_versions SET review_status = 'rejected' WHERE id = ?1")
          .bind(review.version_id),
        db
          .prepare("UPDATE eap_apps SET status = 'rejected', updated_at = ?1 WHERE id = ?2")
          .bind(now, review.app_id),
        db
          .prepare(
            `UPDATE eap_app_reviews
                SET status = 'rejected',
                    reviewer_account_id = ?1,
                    reviewer_notes = ?2,
                    completed_at = ?3
              WHERE id = ?4`,
          )
          .bind(viewer.accountId, reason, now, reviewId),
        db
          .prepare(
            `INSERT INTO eap_app_audit_logs
              (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
             VALUES (?1, ?2, 'admin', ?3, ?4, 'version.rejected', ?5, ?6)`,
          )
          .bind(
            `audit_${crypto.randomBytes(12).toString('hex')}`,
            viewer.accountId,
            review.app_id,
            review.version_id,
            JSON.stringify({ reason }),
            now,
          ),
      ]);

      return json({ ok: true, action: 'reject', message: 'Application submission rejected.' });
    }

    throw new Error(`Unsupported action '${action}'.`);
  } catch (error) {
    return failure(error);
  }
}
