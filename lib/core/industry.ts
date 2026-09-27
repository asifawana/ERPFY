import {
  CUSTOM_SECTOR_SLUG,
  findSector,
  industryInSector,
  subIndustryInIndustry,
  type Industry,
  type Sector,
  type SubIndustry,
} from '@/lib/content/industries';

/**
 * Resolving and checking a company's place in the section 33 taxonomy.
 * Authority: ERPFY-MASTER-PLAN.md sections 25, 33, 34, 89 (Phase 7).
 *
 * Pure and dependency-free, so setup, the company screens and the browser agree.
 *
 * Two functions with deliberately different strictness:
 *
 *  - `industryChainProblem` **refuses** an incoherent chain on the way in. An industry that
 *    does not belong to the chosen sector is a bug or a hand-made request, not a
 *    preference, and quietly dropping it would hide both.
 *  - `resolveIndustryChain` **repairs** on the way out, dropping levels below the first
 *    one that no longer resolves. A taxonomy edit that retires a sub-industry must not
 *    make an existing company unreadable — section 33 requires the tree to keep evolving.
 */

export type StoredIndustry = {
  sectorSlug: string;
  industrySlug: string;
  subIndustrySlug: string;
  businessType: string;
  customIndustry: string;
};

export type IndustryChoice = {
  sector: Sector | null;
  industry: Industry | null;
  subIndustry: SubIndustry | null;
  businessType: string;
  /** Free text, only ever set when the customer chose Other / Custom. */
  customIndustry: string;
  custom: boolean;
};

export const CUSTOM_INDUSTRY_MAX = 160;

/** The deepest coherent chain these stored values describe. */
export function resolveIndustryChain(stored: StoredIndustry): IndustryChoice {
  const sector = findSector(stored.sectorSlug) ?? null;
  const custom = sector?.slug === CUSTOM_SECTOR_SLUG;

  const industry = sector ? industryInSector(sector.slug, stored.industrySlug) ?? null : null;
  const subIndustry = industry ? subIndustryInIndustry(industry, stored.subIndustrySlug) ?? null : null;
  // A business type only means something inside its sub-industry's list.
  const businessType =
    subIndustry && subIndustry.businessTypes.includes(stored.businessType) ? stored.businessType : '';

  return {
    sector,
    industry,
    subIndustry,
    businessType,
    customIndustry: custom ? stored.customIndustry : '',
    custom,
  };
}

/**
 * Why these values are not a valid chain, or null when they are. Every level is optional,
 * but a level that is present must fit the one above it.
 */
export function industryChainProblem(stored: StoredIndustry): string | null {
  const sectorSlug = stored.sectorSlug.trim();
  const industrySlug = stored.industrySlug.trim();
  const subIndustrySlug = stored.subIndustrySlug.trim();
  const businessType = stored.businessType.trim();
  const customIndustry = stored.customIndustry.trim();

  if (!sectorSlug) {
    // Nothing above, so nothing below can be placed.
    if (industrySlug || subIndustrySlug || businessType) {
      return 'Choose a sector before choosing an industry.';
    }
    return customIndustry ? 'Choose Other / Custom to describe your own industry.' : null;
  }

  const sector = findSector(sectorSlug);
  if (!sector) return 'Choose a sector from the list.';

  if (customIndustry) {
    if (sector.slug !== CUSTOM_SECTOR_SLUG) {
      return 'Choose Other / Custom to describe your own industry.';
    }
    if (customIndustry.length < 2 || customIndustry.length > CUSTOM_INDUSTRY_MAX) {
      return `Describe the business in 2 to ${CUSTOM_INDUSTRY_MAX} characters.`;
    }
  }

  if (!industrySlug) {
    if (subIndustrySlug || businessType) return 'Choose an industry before going deeper.';
    return null;
  }

  const industry = industryInSector(sector.slug, industrySlug);
  if (!industry) return 'That industry is not in the sector you chose.';

  if (!subIndustrySlug) {
    return businessType ? 'Choose a sub-industry before choosing a business type.' : null;
  }

  const subIndustry = subIndustryInIndustry(industry, subIndustrySlug);
  if (!subIndustry) return 'That sub-industry is not in the industry you chose.';

  if (businessType && !subIndustry.businessTypes.includes(businessType)) {
    return 'That business type is not in the sub-industry you chose.';
  }

  return null;
}

/** "Retail & Ecommerce · General Retail · Multi-branch Chain · Supermarket". */
export function industrySummary(choice: IndustryChoice): string {
  const parts = [choice.sector?.name, choice.industry?.name, choice.subIndustry?.name, choice.businessType];
  const named = parts.filter((part): part is string => Boolean(part));
  if (choice.custom && choice.customIndustry) return `${choice.sector?.name} — ${choice.customIndustry}`;
  return named.join(' · ');
}
