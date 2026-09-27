import { database, json, failure, queryParam, ApiError } from '@/lib/core/server';
import { resolveTenantByDomain, normalizeDomain } from '@/lib/domains/resolver';

export const dynamic = 'force-dynamic';

/**
 * Caddy On-Demand TLS Verification Endpoint
 * GET /api/domains/ask?domain=example.com
 *
 * Caddy calls this before issuing or renewing an SSL certificate.
 * Returns HTTP 200 if the domain is allowed (platform domain or verified merchant domain).
 * Returns HTTP 404/403 if the domain is not recognized, preventing certificate issuance DDoS.
 */
export async function GET(request: Request) {
  try {
    const rawDomain = queryParam(request, 'domain');
    if (!rawDomain) {
      throw new ApiError(400, 'Query parameter "domain" is required.');
    }

    const domain = normalizeDomain(rawDomain);
    const baseDomain = (process.env.PLATFORM_DOMAIN || 'erpfy.net').trim().toLowerCase();

    // 1. Allow ERPfy platform core hostnames
    const systemHosts = new Set([
      baseDomain,
      `www.${baseDomain}`,
      `app.${baseDomain}`,
      `api.${baseDomain}`,
    ]);

    if (systemHosts.has(domain)) {
      return json({ allowed: true, domain, type: 'platform' }, 200);
    }

    // 2. Check if this is an authorized tenant subdomain or custom merchant domain
    const db = database();
    const tenant = await resolveTenantByDomain(db, domain);

    if (tenant) {
      return json(
        {
          allowed: true,
          domain,
          type: 'tenant',
          companyId: tenant.companyId,
          slug: tenant.slug,
        },
        200,
      );
    }

    // Not found / unauthorized
    throw new ApiError(404, `Domain "${domain}" is not authorized on ERPfy.net.`);
  } catch (error) {
    return failure(error);
  }
}
