import {
  ACTIVITIES,
  BUSINESS_MODELS,
  COUNT_LIMITS,
  activityLabel,
  businessModelLabel,
  employeeBandLabel,
  findEmployeeBand,
  keepKnown,
  parseIdList,
} from '@/lib/content/profile';

/**
 * Resolving and checking a company's business profile.
 * Authority: ERPFY-MASTER-PLAN.md sections 34, 35, 89 (Phase 8).
 *
 * Same split as the taxonomy in ./industry: a write refuses an id the catalogue does not
 * know, so a typo surfaces; a read keeps only known ids, so retiring one from the
 * catalogue cannot make an existing company unreadable.
 *
 * Counts use 0 for "not answered". Zero branches or zero users is not a real answer, so
 * there is no ambiguity in that choice.
 */

export type StoredProfile = {
  businessModels: string;
  employeeBand: string;
  expectedUsers: number;
  branchCount: number;
  operatingCountries: number;
  activities: string;
};

export type BusinessProfile = {
  /** Catalogue ids, in catalogue order. */
  businessModels: string[];
  employeeBand: string;
  /** 0 when never answered. */
  expectedUsers: number;
  branchCount: number;
  operatingCountries: number;
  activities: string[];
  /** True when nothing at all was answered, so screens can say so once. */
  empty: boolean;
};

export function resolveProfile(stored: StoredProfile): BusinessProfile {
  const businessModels = keepKnown(parseIdList(stored.businessModels), BUSINESS_MODELS);
  const activities = keepKnown(parseIdList(stored.activities), ACTIVITIES);
  const employeeBand = findEmployeeBand(stored.employeeBand)?.id ?? '';

  const count = (value: number, max: number) =>
    Number.isInteger(value) && value > 0 && value <= max ? value : 0;

  const expectedUsers = count(stored.expectedUsers, COUNT_LIMITS.expectedUsers);
  const branchCount = count(stored.branchCount, COUNT_LIMITS.branches);
  const operatingCountries = count(stored.operatingCountries, COUNT_LIMITS.operatingCountries);

  return {
    businessModels,
    employeeBand,
    expectedUsers,
    branchCount,
    operatingCountries,
    activities,
    empty:
      businessModels.length === 0 &&
      activities.length === 0 &&
      employeeBand === '' &&
      expectedUsers === 0 &&
      branchCount === 0 &&
      operatingCountries === 0,
  };
}

/** Why these values are not acceptable, or null. Every field is optional to answer. */
export function profileProblem(stored: StoredProfile): string | null {
  const models = parseIdList(stored.businessModels);
  const unknownModel = models.find((id) => !BUSINESS_MODELS.some((model) => model.id === id));
  if (unknownModel) return 'Choose business models from the list.';

  const activities = parseIdList(stored.activities);
  const unknownActivity = activities.find((id) => !ACTIVITIES.some((entry) => entry.id === id));
  if (unknownActivity) return 'Choose activities from the list.';

  if (stored.employeeBand && !findEmployeeBand(stored.employeeBand)) {
    return 'Choose a company size from the list.';
  }

  const countProblem = (value: number, max: number, label: string) => {
    if (value === 0) return null;
    if (!Number.isInteger(value) || value < 1) return `Enter a whole number of ${label}.`;
    if (value > max) {
      return `Enter ${max.toLocaleString('en')} or fewer ${label}, or contact us — we will size it with you.`;
    }
    return null;
  };

  return (
    countProblem(stored.expectedUsers, COUNT_LIMITS.expectedUsers, 'people') ??
    countProblem(stored.branchCount, COUNT_LIMITS.branches, 'locations') ??
    countProblem(stored.operatingCountries, COUNT_LIMITS.operatingCountries, 'countries')
  );
}

/** "B2B, Wholesale, Distribution", or an empty string. */
export function businessModelSummary(profile: BusinessProfile): string {
  return profile.businessModels.map(businessModelLabel).join(', ');
}

export function activitySummary(profile: BusinessProfile): string {
  return profile.activities.map(activityLabel).join(', ');
}

/** "6 to 20 people · 4 locations · 2 countries", as far as it was answered. */
export function sizeSummary(profile: BusinessProfile): string {
  const parts: string[] = [];
  if (profile.employeeBand) parts.push(employeeBandLabel(profile.employeeBand));
  if (profile.expectedUsers > 0) {
    parts.push(`${profile.expectedUsers} expected ${profile.expectedUsers === 1 ? 'user' : 'users'}`);
  }
  if (profile.branchCount > 0) {
    parts.push(`${profile.branchCount} ${profile.branchCount === 1 ? 'location' : 'locations'}`);
  }
  if (profile.operatingCountries > 0) {
    parts.push(`${profile.operatingCountries} ${profile.operatingCountries === 1 ? 'country' : 'countries'}`);
  }
  return parts.join(' · ');
}
