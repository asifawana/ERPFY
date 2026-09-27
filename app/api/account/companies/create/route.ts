import { createCompany } from '@/lib/core/company';
import { body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : typeof val === 'number' ? String(val) : fallback;
}

export async function POST(request: Request) {
  try {
    const db = database();
    const payload = await body(request);
    const viewer = await requireViewer(db, request.headers);

    const company = await createCompany(db, {
      accountId: viewer.accountId,
      name: asString(payload.name),
      slug: asString(payload.slug),
      countryCode: asString(payload.countryCode, 'US'),
      currency: asString(payload.currency, 'USD'),
      timezone: asString(payload.timezone, 'UTC'),
      language: asString(payload.language, 'en'),
      plan: asString(payload.plan, 'starter'),
      sectorSlug: asString(payload.sectorSlug),
      industrySlug: asString(payload.industrySlug),
      subIndustrySlug: asString(payload.subIndustrySlug),
      businessType: asString(payload.businessType),
      customIndustry: asString(payload.customIndustry),
      businessModels: Array.isArray(payload.businessModels)
        ? payload.businessModels.map((m) => asString(m)).filter(Boolean)
        : [],
      employeeBand: asString(payload.employeeBand),
      expectedUsers: Number(payload.expectedUsers) || 0,
      branchCount: Number(payload.branchCount) || 0,
      operatingCountries: Number(payload.operatingCountries) || 0,
      activities: Array.isArray(payload.activities)
        ? payload.activities.map((a) => asString(a)).filter(Boolean)
        : [],
      requestKey: asString(payload.requestKey, crypto.randomUUID()),
    });

    return json({ company });
  } catch (error) {
    return failure(error);
  }
}
