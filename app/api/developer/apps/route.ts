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
      return json({ apps: [] });
    }

    const { results } = await db
      .prepare(
        `SELECT a.id, a.slug, a.name, a.category, a.short_description, a.pricing_type,
                a.price_amount, a.icon_url, a.status, a.official_app, a.is_killed,
                a.created_at, a.updated_at, a.published_at,
                (SELECT COUNT(*) FROM eap_app_versions v WHERE v.app_id = a.id) as version_count,
                (SELECT COUNT(*) FROM eap_app_installations i WHERE i.app_id = a.id AND i.status = 'installed') as install_count
           FROM eap_apps a
          WHERE a.organization_id = ?1
          ORDER BY a.created_at DESC`,
      )
      .bind(dev.organization_id)
      .all<{
        id: string;
        slug: string;
        name: string;
        category: string;
        short_description: string;
        pricing_type: string;
        price_amount: number;
        icon_url: string;
        status: string;
        official_app: number;
        is_killed: number;
        created_at: number;
        updated_at: number;
        published_at: number | null;
        version_count: number;
        install_count: number;
      }>();

    return json({
      apps: (results || []).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        shortDescription: row.short_description,
        tagline: row.short_description,
        description: row.short_description,
        pricingType: row.pricing_type,
        priceAmount: row.price_amount,
        iconUrl: row.icon_url,
        appType: 'embedded',
        status: row.status,
        officialApp: row.official_app === 1,
        isKilled: row.is_killed === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
        versionCount: row.version_count,
        installCount: row.install_count,
        installedCount: row.install_count,
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

    const dev = await db
      .prepare('SELECT organization_id FROM eap_dev_profiles WHERE account_id = ?1')
      .bind(viewer.accountId)
      .first<{ organization_id: string }>();

    if (!dev) {
      return failure(new ApiError(400, 'You must register a developer account before creating an app.'));
    }

    const name = field(data, 'name', { label: 'App Name', max: 80 });
    const rawSlug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = field({ slug: rawSlug }, 'slug', { label: 'App Slug', max: 50 })
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');

    // Reserved namespaces & protected prefixes check
    const RESERVED_PREFIXES = ['erpfy.', 'erpfy-', 'core-', 'system-', 'admin-', 'official-'];
    const RESERVED_SLUGS = [
      'erpfy',
      'system',
      'admin',
      'api',
      'auth',
      'account',
      'settings',
      'developer',
      'apps',
      'app-store',
      'finance',
      'audit',
      'core',
    ];

    if (RESERVED_SLUGS.includes(slug) || RESERVED_PREFIXES.some((p) => slug.startsWith(p))) {
      return failure(new ApiError(400, `The slug '${slug}' uses a reserved core platform namespace.`));
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return failure(new ApiError(400, 'Slug must contain only lowercase alphanumeric characters and hyphens.'));
    }

    // Slug collision check
    const existingSlug = await db
      .prepare('SELECT id FROM eap_apps WHERE slug = ?1')
      .bind(slug)
      .first();

    if (existingSlug) {
      return failure(new ApiError(400, `An application with slug '${slug}' already exists.`));
    }

    const category = field(data, 'category', { label: 'Category', max: 50 });
    const rawShortDesc = data.shortDescription || data.tagline;
    const shortDescription = field({ shortDescription: rawShortDesc }, 'shortDescription', {
      label: 'Short Description',
      max: 200,
    });
    const rawFullDesc = data.fullDescription || data.description || shortDescription;
    const fullDescription = field({ fullDescription: rawFullDesc }, 'fullDescription', {
      required: false,
      max: 2000,
    });
    const pricingType = field(data, 'pricingType', { required: false, max: 30 }) || 'free';
    const priceAmount = typeof data.priceAmount === 'number' ? data.priceAmount : 0;
    const supportEmail = field(data, 'supportEmail', { required: false, max: 100 });
    const docsUrl = field(data, 'docsUrl', { required: false, max: 200 });
    const privacyUrl = field(data, 'privacyUrl', { required: false, max: 200 });
    const iconUrl = field(data, 'iconUrl', { required: false, max: 300 });

    const appId = `app_${crypto.randomBytes(10).toString('hex')}`;
    const now = Date.now();

    await db.batch([
      db
        .prepare(
          `INSERT INTO eap_apps
            (id, organization_id, slug, name, short_description, full_description, category,
             pricing_type, price_amount, support_email, docs_url, privacy_url, icon_url,
             status, created_by_account_id, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'draft', ?14, ?15, ?15)`,
        )
        .bind(
          appId,
          dev.organization_id,
          slug,
          name,
          shortDescription,
          fullDescription,
          category,
          pricingType,
          priceAmount,
          supportEmail,
          docsUrl,
          privacyUrl,
          iconUrl,
          viewer.accountId,
          now,
        ),
      db
        .prepare(
          `INSERT INTO eap_app_audit_logs
            (id, actor_id, actor_type, app_id, action, details, created_at)
           VALUES (?1, ?2, 'developer', ?3, 'app.created', ?4, ?5)`,
        )
        .bind(
          `audit_${crypto.randomBytes(12).toString('hex')}`,
          viewer.accountId,
          appId,
          JSON.stringify({ name, slug, category }),
          now,
        ),
    ]);

    return json({
      ok: true,
      app: {
        id: appId,
        name,
        slug,
        category,
        shortDescription,
        tagline: shortDescription,
        status: 'draft',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
