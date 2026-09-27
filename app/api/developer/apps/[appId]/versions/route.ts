import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { validateEapManifest } from '@/lib/eap/manifest';
import { scanEapPackage } from '@/lib/eap/scanner';
import { computePackageHash } from '@/lib/eap/signing';
import { validatePackageBundle, storeQuarantinedPackage } from '@/lib/eap/quarantine';

export async function GET(
  request: Request,
  props: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    // Verify ownership
    const app = await db
      .prepare(
        `SELECT a.id
           FROM eap_apps a
           JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
          WHERE a.id = ?1 AND p.account_id = ?2`,
      )
      .bind(appId, viewer.accountId)
      .first();

    if (!app) {
      return failure(new ApiError(400, 'Application not found or unauthorized.'));
    }

    const { results } = await db
      .prepare(
        `SELECT v.id, v.version, v.protocol, v.min_platform_version, v.changelog,
                v.package_hash, v.signature, v.release_id, v.review_status,
                v.created_at, v.approved_at, v.published_at,
                r.id as review_id, r.automated_scan_result, r.automated_scan_details
           FROM eap_app_versions v
           LEFT JOIN eap_app_reviews r ON r.version_id = v.id
          WHERE v.app_id = ?1
          ORDER BY v.created_at DESC`,
      )
      .bind(appId)
      .all<{
        id: string;
        version: string;
        protocol: string;
        min_platform_version: string;
        changelog: string;
        package_hash: string;
        signature: string;
        release_id: string;
        review_status: string;
        created_at: number;
        approved_at: number | null;
        published_at: number | null;
        review_id: string | null;
        automated_scan_result: string | null;
        automated_scan_details: string | null;
      }>();

    const reviewIds = (results || []).map((r) => r.review_id).filter(Boolean) as string[];
    interface ReviewMessage {
      id: string;
      senderType: string;
      message: string;
      createdAt: number;
    }
    const messagesByReview: Record<string, ReviewMessage[]> = {};

    if (reviewIds.length > 0) {
      const placeholders = reviewIds.map((_, i) => `?${i + 1}`).join(',');
      const msgQuery = await db
        .prepare(
          `SELECT id, review_id, sender_type, message, created_at
             FROM eap_app_review_messages
            WHERE review_id IN (${placeholders})
            ORDER BY created_at ASC`,
        )
        .bind(...reviewIds)
        .all<{
          id: string;
          review_id: string;
          sender_type: string;
          message: string;
          created_at: number;
        }>();

      for (const m of msgQuery.results || []) {
        if (!messagesByReview[m.review_id]) messagesByReview[m.review_id] = [];
        messagesByReview[m.review_id].push({
          id: m.id,
          senderType: m.sender_type,
          message: m.message,
          createdAt: m.created_at,
        });
      }
    }

    return json({
      versions: (results || []).map((v) => ({
        id: v.id,
        version: v.version,
        protocol: v.protocol,
        minPlatformVersion: v.min_platform_version,
        changelog: v.changelog,
        packageHash: v.package_hash,
        signature: v.signature,
        releaseId: v.release_id,
        status: v.review_status,
        reviewStatus: v.review_status,
        securityScanStatus:
          v.automated_scan_result === 'PASS' || v.automated_scan_result === 'WARNING'
            ? 'passed'
            : 'failed',
        scanResult: v.automated_scan_result || 'PENDING',
        scanDetails: v.automated_scan_details ? JSON.parse(v.automated_scan_details) : null,
        reviewMessages: v.review_id ? messagesByReview[v.review_id] || [] : [],
        createdAt: v.created_at,
        approvedAt: v.approved_at,
        publishedAt: v.published_at,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await props.params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request, 10 * 1024 * 1024);

    // Verify ownership
    const app = await db
      .prepare(
        `SELECT a.id, a.slug
           FROM eap_apps a
           JOIN eap_dev_profiles p ON p.organization_id = a.organization_id
          WHERE a.id = ?1 AND p.account_id = ?2`,
      )
      .bind(appId, viewer.accountId)
      .first<{ id: string; slug: string }>();

    if (!app) {
      return failure(new ApiError(400, 'Application not found or unauthorized.'));
    }

    // Support manifest normalizations
    let rawManifest = data.manifest;
    if (rawManifest && typeof rawManifest === 'object') {
      const m = { ...(rawManifest as Record<string, unknown>) } as Record<string, unknown>;
      if (!m.protocol && m.manifestVersion === 'eap-v1') {
        m.protocol = 'eap-v1';
      }
      if (!m.app_id && m.id) {
        m.app_id = m.id;
      }
      if (!m.slug && m.id) {
        m.slug = m.id;
      }
      if (!m.minimum_platform_version) {
        m.minimum_platform_version = '1.0.0';
      }
      if (m.permissions && !Array.isArray(m.permissions) && typeof m.permissions === 'object') {
        const pObj = m.permissions as Record<string, unknown>;
        m.permissions = Array.isArray(pObj.requiredScopes) ? pObj.requiredScopes : [];
      }
      rawManifest = m;
    }

    const manifest = validateEapManifest(rawManifest);

    // Slug matching verification
    if (manifest.slug !== app.slug) {
      return failure(new ApiError(400, `Manifest slug '${manifest.slug}' does not match registered application slug '${app.slug}'.`));
    }

    // Version uniqueness check
    const existingVer = await db
      .prepare('SELECT id, review_status FROM eap_app_versions WHERE app_id = ?1 AND version = ?2')
      .bind(appId, manifest.version)
      .first<{ id: string; review_status: string }>();

    if (existingVer) {
      return failure(
        new ApiError(400, `Version '${manifest.version}' already exists for this application. Historical versions cannot be overwritten.`),
      );
    }

    const changelog = field(data, 'changelog', { required: false, max: 2000 });

    let rawCodeFiles: Record<string, string> = {};
    if (data.codeFiles && typeof data.codeFiles === 'object') {
      rawCodeFiles = data.codeFiles as Record<string, string>;
    } else if (typeof data.codeBundle === 'string' && data.codeBundle.trim()) {
      rawCodeFiles = { 'index.js': data.codeBundle };
    }

    // Phase 6A: Enforce quarantine upload validation (path traversal, banned extensions, size limits, entrypoint integrity)
    const { sanitizedFiles } = validatePackageBundle(manifest, rawCodeFiles);

    const manifestJson = JSON.stringify(manifest);
    const packageHash = computePackageHash(manifestJson, sanitizedFiles);

    // Run automated scanner (passive static analysis only, zero execution)
    const scan = scanEapPackage(manifest, sanitizedFiles);

    const versionId = `ver_${crypto.randomBytes(10).toString('hex')}`;
    const reviewId = `rev_${crypto.randomBytes(10).toString('hex')}`;
    const now = Date.now();

    // Store quarantined package in isolated non-executable storage with tamper-proof hash
    await storeQuarantinedPackage({
      appId,
      version: manifest.version,
      packageHash,
      manifest,
      files: sanitizedFiles,
      quarantinedAt: now,
      status: 'quarantined',
    });

    await db.batch([
      db
        .prepare(
          `INSERT INTO eap_app_versions
            (id, app_id, version, protocol, min_platform_version, manifest_json, changelog,
             package_hash, review_status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft', ?9)`,
        )
        .bind(
          versionId,
          appId,
          manifest.version,
          manifest.protocol,
          manifest.minimum_platform_version,
          manifestJson,
          changelog,
          packageHash,
          now,
        ),
      db
        .prepare(
          `INSERT INTO eap_app_reviews
            (id, version_id, status, automated_scan_result, automated_scan_details, created_at)
           VALUES (?1, ?2, 'submitted', ?3, ?4, ?5)`,
        )
        .bind(
          reviewId,
          versionId,
          scan.status,
          JSON.stringify(scan),
          now,
        ),
      db
        .prepare(
          `UPDATE eap_apps
              SET first_uploaded_at = COALESCE(first_uploaded_at, ?1),
                  updated_at = ?1
            WHERE id = ?2`,
        )
        .bind(now, appId),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, app_id, version_id, action, details, created_at)
           VALUES (?1, ?2, 'developer', ?3, ?4, 'version.uploaded', ?5, ?6)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          appId,
          versionId,
          JSON.stringify({ version: manifest.version, scanStatus: scan.status }),
          now,
        ),
    ]);

    const isPassed = scan.status === 'PASS' || scan.status === 'WARNING';

    return json({
      ok: true,
      scan: {
        passed: isPassed,
        status: scan.status,
        issues: scan.issues,
        warnings: scan.warnings,
      },
      version: {
        id: versionId,
        version: manifest.version,
        status: 'draft',
        reviewStatus: 'draft',
        securityScanStatus: isPassed ? 'passed' : 'failed',
        scanResult: scan.status,
        packageHash,
        issues: scan.issues,
        warnings: scan.warnings,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
