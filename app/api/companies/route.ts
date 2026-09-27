import { createCompany, listCompaniesForAccount } from '@/lib/core/company';
import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : typeof val === 'number' ? String(val) : fallback;
}

function asOptionalString(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim() ? val : undefined;
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    return json({
      companies: await listCompaniesForAccount(db, viewer.accountId),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const company = await createCompany(db, {
      accountId: viewer.accountId,
      name: asString(payload.name),
      slug: asString(payload.slug),
      countryCode: asString(payload.countryCode, 'US'),
      currency: asString(payload.currency, 'USD'),
      timezone: asString(payload.timezone, 'UTC'),
      language: asString(payload.language, 'en'),
      plan: asString(payload.plan, 'starter'),
      sectorSlug: asOptionalString(payload.sectorSlug),
      industrySlug: asOptionalString(payload.industrySlug),
      subIndustrySlug: asOptionalString(payload.subIndustrySlug),
      businessType: asOptionalString(payload.businessType),
      customIndustry: asOptionalString(payload.customIndustry),
      businessModels: Array.isArray(payload.businessModels)
        ? payload.businessModels.map((m) => asString(m)).filter(Boolean)
        : [],
      employeeBand: asOptionalString(payload.employeeBand),
      expectedUsers: typeof payload.expectedUsers === 'number' ? payload.expectedUsers : undefined,
      branchCount: typeof payload.branchCount === 'number' ? payload.branchCount : undefined,
      operatingCountries: typeof payload.operatingCountries === 'number' ? payload.operatingCountries : undefined,
      activities: Array.isArray(payload.activities)
        ? payload.activities.map((a) => asString(a)).filter(Boolean)
        : [],
      requestKey: asString(payload.requestKey, crypto.randomUUID()),
    });

    return json({ ok: true, company }, 201);
  } catch (error) {
    return failure(error);
  }
}
