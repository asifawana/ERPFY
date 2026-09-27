import { database, failure, json, body, queryParam, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getCompanyDomains,
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
} from '@/lib/domains/resolver';

/**
 * GET /api/domains?companyId=xxx
 * Lists custom domains for the company.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = queryParam(request, 'companyId');

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);
    const domains = await getCompanyDomains(db, companyId);

    return json({ ok: true, domains });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/domains
 * Adds, verifies, or removes a custom domain for the company.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId.trim() : '';
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);

    if (action === 'add') {
      const domain = typeof payload.domain === 'string' ? payload.domain.trim() : '';
      if (!domain) {
        throw new ApiError(400, 'Domain name is required.');
      }
      const result = await addCustomDomain(db, companyId, domain);
      if (!result.success) {
        throw new ApiError(400, result.error || 'Failed to add custom domain.');
      }
      return json({ ok: true, record: result.record }, 201);
    }

    if (action === 'verify') {
      const domainId = typeof payload.domainId === 'string' ? payload.domainId.trim() : '';
      if (!domainId) {
        throw new ApiError(400, 'Domain ID is required.');
      }
      const result = await verifyCustomDomain(db, companyId, domainId);
      return json({ ok: true, ...result });
    }

    if (action === 'remove') {
      const domainId = typeof payload.domainId === 'string' ? payload.domainId.trim() : '';
      if (!domainId) {
        throw new ApiError(400, 'Domain ID is required.');
      }
      const result = await removeCustomDomain(db, companyId, domainId);
      if (!result.success) {
        throw new ApiError(400, result.error || 'Failed to remove custom domain.');
      }
      return json({ ok: true, success: true });
    }

    throw new ApiError(400, `Unknown action: ${action}`);
  } catch (error) {
    return failure(error);
  }
}
