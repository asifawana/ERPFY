import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function POST(
  request: Request,
  props: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);

    const versionId = field(data, 'versionId', { label: 'Version ID' });

    // Verify ownership, org verification, and fetch scan status
    const version = await db
      .prepare(
        `SELECT v.id, v.version, v.review_status, r.automated_scan_result, o.status as org_status
           FROM eap_app_versions v
           JOIN eap_apps a ON a.id = v.app_id
           JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
           JOIN eap_dev_organizations o ON o.id = a.organization_id
           LEFT JOIN eap_app_reviews r ON r.version_id = v.id
          WHERE v.id = ?1 AND a.id = ?2 AND p.account_id = ?3`,
      )
      .bind(versionId, appId, viewer.accountId)
      .first<{
        id: string;
        version: string;
        review_status: string;
        automated_scan_result: string | null;
        org_status: string;
      }>();

    if (!version) {
      return failure(new ApiError(400, 'Version not found or unauthorized.'));
    }

    if (version.org_status !== 'verified') {
      return failure(
        new ApiError(403, 'Developer organization must be verified by Platform Admin before submitting applications for review.'),
      );
    }

    if (version.automated_scan_result !== 'PASS' && version.automated_scan_result !== 'WARNING') {
      return failure(
        new ApiError(400, 'Cannot submit for review: Automated security scan failed or has not completed. Resolve all critical security issues before submitting.'),
      );
    }

    if (version.review_status === 'submitted' || version.review_status === 'published') {
      return failure(
        new ApiError(400, `Cannot submit: Version ${version.version} is already ${version.review_status}.`),
      );
    }

    const now = Date.now();

    await db.batch([
      db
        .prepare(
          `UPDATE eap_app_versions
              SET review_status = 'submitted'
            WHERE id = ?1`,
        )
        .bind(versionId),
      db
        .prepare(
          `UPDATE eap_apps
              SET status = 'in_review',
                  submitted_at = ?1,
                  updated_at = ?1
            WHERE id = ?2`,
        )
        .bind(now, appId),
      db
        .prepare(
          `UPDATE eap_app_reviews
              SET status = 'submitted'
            WHERE version_id = ?1`,
        )
        .bind(versionId),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
           VALUES (?1, ?2, 'developer', ?3, ?4, 'version.submitted', ?5, ?6)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          appId,
          versionId,
          JSON.stringify({ version: version.version }),
          now,
        ),
    ]);

    return json({
      ok: true,
      status: 'submitted',
      message: `Version ${version.version} has been submitted for Platform Admin review.`,
    });
  } catch (error) {
    return failure(error);
  }
}
