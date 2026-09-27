import crypto from 'node:crypto';
import { ApiError, body, database, failure, field, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);

    const profile = await db
      .prepare(
        `SELECT p.id, p.display_name, p.bio, p.created_at,
                o.id as org_id, o.name as org_name, o.slug as org_slug,
                o.status as org_status, o.website as org_website, o.support_email
           FROM eap_dev_profiles p
           JOIN eap_dev_organizations o ON o.id = p.organization_id
          WHERE p.account_id = ?1`,
      )
      .bind(viewer.accountId)
      .first<{
        id: string;
        display_name: string;
        bio: string;
        created_at: number;
        org_id: string;
        org_name: string;
        org_slug: string;
        org_status: string;
        org_website: string;
        support_email: string;
      }>();

    if (!profile) {
      return json({ profile: null, registered: false });
    }

    return json({
      registered: true,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        name: profile.org_name || profile.display_name,
        slug: profile.org_slug,
        contactEmail: profile.support_email,
        websiteUrl: profile.org_website,
        verified: profile.org_status === 'verified',
        status: profile.org_status,
        bio: profile.bio,
        createdAt: profile.created_at,
        organization: {
          id: profile.org_id,
          name: profile.org_name,
          slug: profile.org_slug,
          status: profile.org_status,
          website: profile.org_website,
          supportEmail: profile.support_email,
        },
      },
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

    const rawOrgName =
      (typeof data.organizationName === 'string' && data.organizationName) ||
      (typeof data.name === 'string' && data.name) ||
      viewer.displayName ||
      'Developer Org';
    const orgName = field({ organizationName: rawOrgName }, 'organizationName', { label: 'Organization Name', max: 80 });
    
    const candidateSlug =
      (typeof data.organizationSlug === 'string' && data.organizationSlug) ||
      (typeof data.slug === 'string' && data.slug) ||
      rawOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const rawOrgSlug = candidateSlug.replace(/^-+|-+$/g, '');
    const orgSlug = field({ organizationSlug: rawOrgSlug }, 'organizationSlug', { label: 'Organization Slug', max: 50 })
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const rawDisplayName = data.displayName || viewer.displayName || rawOrgName;
    const displayName = field({ displayName: rawDisplayName }, 'displayName', { label: 'Display Name', max: 80 });

    const website = field(data, 'website', { required: false, max: 120 }) || field(data, 'websiteUrl', { required: false, max: 120 });
    const supportEmail = field(data, 'supportEmail', { required: false, max: 100 }) || field(data, 'contactEmail', { required: false, max: 100 }) || viewer.email;
    const bio = field(data, 'bio', { required: false, max: 500 });

    const now = Date.now();

    // Check if already registered
    const existing = await db
      .prepare('SELECT id FROM eap_dev_profiles WHERE account_id = ?1')
      .bind(viewer.accountId)
      .first();

    if (existing) {
      return failure(new ApiError(400, 'You already have a developer account.'));
    }

    const orgId = `org_${crypto.randomBytes(10).toString('hex')}`;
    const profileId = `dev_${crypto.randomBytes(10).toString('hex')}`;

    // Batch create organization, profile, and member
    // New developer organizations start with status 'unverified' pending Platform Admin verification
    await db.batch([
      db
        .prepare(
          `INSERT INTO eap_dev_organizations
            (id, name, slug, status, website, support_email, created_at)
           VALUES (?1, ?2, ?3, 'unverified', ?4, ?5, ?6)`,
        )
        .bind(orgId, orgName, orgSlug, website, supportEmail, now),
      db
        .prepare(
          `INSERT INTO eap_dev_profiles
            (id, account_id, organization_id, display_name, bio, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(profileId, viewer.accountId, orgId, displayName, bio, now),
      db
        .prepare(
          `INSERT INTO eap_dev_members
            (organization_id, account_id, role, created_at)
           VALUES (?1, ?2, 'owner', ?3)`,
        )
        .bind(orgId, viewer.accountId, now),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, action, details, created_at)
           VALUES (?1, ?2, 'developer', 'developer.registered', ?3, ?4)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          JSON.stringify({ orgId, orgName, orgSlug, status: 'unverified' }),
          now,
        ),
    ]);

    return json({
      ok: true,
      profile: {
        id: profileId,
        displayName,
        name: orgName,
        slug: orgSlug,
        contactEmail: supportEmail,
        websiteUrl: website,
        verified: false,
        status: 'unverified',
        organization: {
          id: orgId,
          name: orgName,
          slug: orgSlug,
          status: 'unverified',
          website,
          supportEmail,
        },
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);

    // Explicit anti-spoof check: developers cannot alter their verification state
    if (
      'status' in data ||
      'verified' in data ||
      'verificationStatus' in data ||
      'verification_status' in data
    ) {
      return failure(
        new ApiError(
          403,
          'Developer organization verification status cannot be changed by developer. Platform Admin authority required.',
        ),
      );
    }

    const dev = await db
      .prepare(
        `SELECT p.id as profile_id, p.organization_id
           FROM eap_dev_profiles p
          WHERE p.account_id = ?1`,
      )
      .bind(viewer.accountId)
      .first<{ profile_id: string; organization_id: string }>();

    if (!dev) {
      return failure(new ApiError(404, 'Developer profile not found.'));
    }

    const displayName = field(data, 'displayName', { required: false, max: 80 });
    const bio = field(data, 'bio', { required: false, max: 500 });
    const website = field(data, 'website', { required: false, max: 120 }) || field(data, 'websiteUrl', { required: false, max: 120 });
    const supportEmail = field(data, 'supportEmail', { required: false, max: 100 }) || field(data, 'contactEmail', { required: false, max: 100 });

    const statements = [];
    if (displayName !== undefined || bio !== undefined) {
      statements.push(
        db.prepare(
          `UPDATE eap_dev_profiles
              SET display_name = COALESCE(?1, display_name),
                  bio = COALESCE(?2, bio)
            WHERE id = ?3`,
        ).bind(displayName ?? null, bio ?? null, dev.profile_id),
      );
    }

    if (website !== undefined || supportEmail !== undefined) {
      statements.push(
        db.prepare(
          `UPDATE eap_dev_organizations
              SET website = COALESCE(?1, website),
                  support_email = COALESCE(?2, support_email)
            WHERE id = ?3`,
        ).bind(website ?? null, supportEmail ?? null, dev.organization_id),
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return GET(request);
  } catch (error) {
    return failure(error);
  }
}
