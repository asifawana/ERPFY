import { ApiError, body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { validateEapManifest } from '@/lib/eap/manifest';
import { validatePlatformBinding, verifyPluginEntitlement } from '@/lib/eap/platform-binding';
import { validatePackageBundle, storeQuarantinedPackage } from '@/lib/eap/quarantine';
import { computePackageHash } from '@/lib/eap/signing';
import { scanEapPackage } from '@/lib/eap/scanner';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request, 10 * 1024 * 1024);

    const requestedCompanyId =
      typeof data.companyId === 'string' ? data.companyId.trim() : '';

    if (!requestedCompanyId) {
      return failure(new ApiError(400, 'Company ID is required for private plugin upload.'));
    }

    // Verify company membership and administrative permission
    const membership = await db
      .prepare(
        `SELECT role, status FROM core_memberships
          WHERE account_id = ?1 AND company_id = ?2 AND status = 'active'
          LIMIT 1`,
      )
      .bind(viewer.accountId, requestedCompanyId)
      .first<{ role: string; status: string }>();

    if (!membership) {
      return failure(new ApiError(403, 'Company not found or access denied.'));
    }

    // Role check: Only Owner, Administrator or members with integrations.manage can upload private plugins
    const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'administrator';
    if (!isOwnerOrAdmin) {
      const perm = await db
        .prepare(
          `SELECT 1 FROM core_role_permissions rp
             JOIN core_roles r ON r.id = rp.role_id
            WHERE r.company_id = ?1 AND r.name = ?2
              AND rp.permission_key IN ('integrations.manage', 'apps.manage', 'apps.upload_private')
            LIMIT 1`,
        )
        .bind(requestedCompanyId, membership.role)
        .first();

      if (!perm) {
        return failure(
          new ApiError(403, 'Permission denied: private plugin upload requires administrative privileges.'),
        );
      }
    }

    // Extract manifest and codeFiles from payload
    let rawManifest: unknown = data.manifest;
    let rawCodeFiles: Record<string, string> = {};

    // Support bundle package uploaded as JSON string
    if (typeof data.packageContent === 'string') {
      try {
        const parsed = JSON.parse(data.packageContent);
        if (parsed && typeof parsed === 'object') {
          if (parsed.manifest) rawManifest = parsed.manifest;
          else rawManifest = parsed; // Declarative manifest-only package
          if (parsed.codeFiles && typeof parsed.codeFiles === 'object') {
            rawCodeFiles = parsed.codeFiles as Record<string, string>;
          } else if (parsed.files && typeof parsed.files === 'object') {
            rawCodeFiles = parsed.files as Record<string, string>;
          }
        }
      } catch {
        return failure(new ApiError(400, 'Invalid package format: failed to parse package bundle JSON.'));
      }
    } else if (data.codeFiles && typeof data.codeFiles === 'object') {
      rawCodeFiles = data.codeFiles as Record<string, string>;
    } else if (typeof data.codeBundle === 'string' && data.codeBundle.trim()) {
      rawCodeFiles = { 'index.js': data.codeBundle };
    }

    if (!rawManifest) {
      return failure(new ApiError(400, 'Invalid package: missing manifest.json declaration.'));
    }

    // Support manifest normalizations
    if (rawManifest && typeof rawManifest === 'object') {
      const m = { ...(rawManifest as Record<string, unknown>) };
      if (!m.protocol) {
        if (m.manifestVersion === 'eap-v1' || m.manifest_version === 'eap-v1' || m.protocol === 'eap-v1') {
          m.protocol = 'eap-v1';
        }
      }
      if (typeof m.platform === 'string') {
        if (m.platform.toLowerCase() !== 'erpfy') {
          return failure(new ApiError(400, "Invalid platform binding: platform must be 'ERPFY'. Non-ERPFY plugins are strictly forbidden."));
        }
        m.platform = { id: 'erpfy', protocol: 'eap-v1' };
      }
      if (!m.app_id && m.id) {
        m.app_id = m.id;
      }
      if (!m.slug) {
        const rawSource =
          typeof m.app_id === 'string'
            ? m.app_id
            : typeof m.id === 'string'
              ? m.id
              : typeof m.name === 'string'
                ? m.name
                : 'plugin';
        const slugSource = rawSource
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        m.slug = slugSource || 'custom-plugin';
      }
      if (!m.minimum_platform_version) {
        m.minimum_platform_version = '1.0.0';
      }
      if (m.entrypoint && typeof m.entrypoint === 'string' && !m.entrypoints) {
        m.entrypoints = { client: m.entrypoint };
      }
      if (!m.permissions || !Array.isArray(m.permissions)) {
        m.permissions = [];
      }
      rawManifest = m;
    }

    // 1. Manifest validation
    const manifest = validateEapManifest(rawManifest);

    // 2. Platform binding validation (ensures platform: 'erpfy', protocol: 'eap-v1')
    validatePlatformBinding(manifest);

    // 3. Entitlement verification
    verifyPluginEntitlement(manifest, requestedCompanyId);

    // 4. Quarantine bundle validation (path traversal, file sizes, banned extensions, entrypoint check)
    const { sanitizedFiles } = validatePackageBundle(manifest, rawCodeFiles);

    const rawMeta = (rawManifest && typeof rawManifest === 'object' ? rawManifest : {}) as Record<string, unknown>;
    const description = typeof rawMeta.description === 'string' ? rawMeta.description : '';
    const category = typeof rawMeta.category === 'string' ? rawMeta.category : 'General';
    const publisher =
      typeof rawMeta.publisher === 'string'
        ? rawMeta.publisher
        : typeof (rawMeta.developer as { name?: string })?.name === 'string'
          ? (rawMeta.developer as { name?: string }).name!
          : manifest.developer_id || 'Private Developer';

    (manifest as unknown as Record<string, unknown>).description = description;
    (manifest as unknown as Record<string, unknown>).category = category;
    (manifest as unknown as Record<string, unknown>).publisher = publisher;

    // 5. Package hash computation
    const manifestJson = JSON.stringify(manifest);
    const packageHash = computePackageHash(manifestJson, sanitizedFiles);

    // 6. Passive static security scan (zero runtime execution)
    const scan = scanEapPackage(manifest, sanitizedFiles);

    // Store in quarantine storage with status 'quarantined'
    const now = Date.now();
    await storeQuarantinedPackage({
      appId: manifest.app_id,
      version: manifest.version,
      packageHash,
      manifest,
      files: sanitizedFiles,
      quarantinedAt: now,
      status: 'quarantined',
    });

    const isPassed = scan.status === 'PASS' || scan.status === 'WARNING';

    return json({
      ok: true,
      validation: {
        valid: isPassed,
        appId: manifest.app_id,
        slug: manifest.slug,
        name: manifest.name,
        version: manifest.version,
        description,
        category,
        publisher,
        platform: 'ERPFY',
        visibility: 'Private',
        targetCompanyId: requestedCompanyId,
        packageHash,
        permissions: manifest.permissions || [],
        dependencies: manifest.dependencies || [],
        navigation: manifest.navigation || [],
        settings: manifest.settings ? Object.keys(manifest.settings) : [],
        securityStatus: scan.status,
        issues: scan.issues || [],
        warnings: scan.warnings || [],
      },
    });
  } catch (error) {
    return failure(error);
  }
}
