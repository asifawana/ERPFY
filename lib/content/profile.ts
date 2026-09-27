/**
 * Business model, size and operation profile.
 * Authority: ERPFY-MASTER-PLAN.md sections 34 (business model), 35 (size and activities),
 * 89 (Phase 8).
 *
 * What this profile is for, stated plainly because it constrains the code: it is collected
 * so future App recommendations can be sensible. During the Core phase it activates
 * nothing (section 34, final line), and it never blocks a small company from taking an
 * advanced capability later (section 35, final line). No branch of any decision in ERPFY
 * may read these values to withhold a feature.
 *
 * Ids, not labels, are stored. A label can be reworded — including translated — without
 * rewriting what every company already answered.
 */

/* ------------------------------------------------------------------ *
 * Business model — section 34
 * ------------------------------------------------------------------ */

export type BusinessModel = { id: string; label: string; group: string };

/** Section 34's list, grouped so nineteen checkboxes read as four short groups. */
export const BUSINESS_MODELS: BusinessModel[] = [
  { id: 'b2b', label: 'B2B', group: 'Who you sell to' },
  { id: 'b2c', label: 'B2C', group: 'Who you sell to' },
  { id: 'd2c', label: 'D2C', group: 'Who you sell to' },
  { id: 'dealer-network', label: 'Dealer network', group: 'Who you sell to' },
  { id: 'franchise', label: 'Franchise', group: 'Who you sell to' },

  { id: 'retail', label: 'Retail', group: 'How you trade' },
  { id: 'wholesale', label: 'Wholesale', group: 'How you trade' },
  { id: 'distribution', label: 'Distribution', group: 'How you trade' },
  { id: 'import', label: 'Import', group: 'How you trade' },
  { id: 'export', label: 'Export', group: 'How you trade' },

  { id: 'manufacturing', label: 'Manufacturing', group: 'What you provide' },
  { id: 'services', label: 'Services', group: 'What you provide' },
  { id: 'projects', label: 'Projects', group: 'What you provide' },
  { id: 'subscription', label: 'Subscription', group: 'What you provide' },
  { id: 'rental', label: 'Rental', group: 'What you provide' },

  { id: 'physical-store', label: 'Physical store', group: 'Where you sell' },
  { id: 'ecommerce', label: 'Ecommerce', group: 'Where you sell' },
  { id: 'online-only', label: 'Online only', group: 'Where you sell' },
  { id: 'hybrid', label: 'Hybrid', group: 'Where you sell' },
];

/** Group order for rendering, taken from the order they first appear above. */
export const BUSINESS_MODEL_GROUPS = [...new Set(BUSINESS_MODELS.map((model) => model.group))];

export function findBusinessModel(id: string): BusinessModel | undefined {
  return BUSINESS_MODELS.find((model) => model.id === id);
}

export function businessModelLabel(id: string): string {
  return findBusinessModel(id)?.label ?? id;
}

/* ------------------------------------------------------------------ *
 * Company size — section 35
 * ------------------------------------------------------------------ */

export type EmployeeBand = { id: string; label: string };

export const EMPLOYEE_BANDS: EmployeeBand[] = [
  { id: '1', label: 'Just me' },
  { id: '2-5', label: '2 to 5 people' },
  { id: '6-20', label: '6 to 20 people' },
  { id: '21-50', label: '21 to 50 people' },
  { id: '51-200', label: '51 to 200 people' },
  { id: '201-500', label: '201 to 500 people' },
  { id: '500-plus', label: 'More than 500 people' },
];

export function findEmployeeBand(id: string): EmployeeBand | undefined {
  return EMPLOYEE_BANDS.find((band) => band.id === id);
}

export function employeeBandLabel(id: string): string {
  return findEmployeeBand(id)?.label ?? '';
}

/**
 * Sane upper bounds for the three counts. They exist to reject nonsense and protect the
 * column, not to tell anyone how big their business may be — a genuinely larger number is
 * a conversation, which is what the screens say.
 */
export const COUNT_LIMITS = {
  expectedUsers: 5000,
  branches: 2000,
  operatingCountries: 195,
} as const;

/* ------------------------------------------------------------------ *
 * Operation profile — section 35's activity questions
 * ------------------------------------------------------------------ */

export type Activity = { id: string; label: string };

/** Section 35's twelve questions, in its order. */
export const ACTIVITIES: Activity[] = [
  { id: 'sells-products', label: 'Sells products' },
  { id: 'provides-services', label: 'Provides services' },
  { id: 'holds-stock', label: 'Holds stock' },
  { id: 'manufactures', label: 'Manufactures' },
  { id: 'uses-warehouses', label: 'Uses warehouses' },
  { id: 'imports-exports', label: 'Imports or exports' },
  { id: 'uses-dealers', label: 'Sells through dealers' },
  { id: 'field-sales', label: 'Has a field sales team' },
  { id: 'manages-vehicles', label: 'Manages vehicles' },
  { id: 'online-orders', label: 'Takes online orders' },
  { id: 'staff-management', label: 'Needs staff management' },
  { id: 'financial-management', label: 'Needs financial management' },
];

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((activity) => activity.id === id);
}

export function activityLabel(id: string): string {
  return findActivity(id)?.label ?? id;
}

/* ------------------------------------------------------------------ *
 * Id lists — shared encoding
 * ------------------------------------------------------------------ */

/**
 * Multi-select answers travel as a comma-separated id list and are stored as a JSON array.
 * Parsing is deliberately forgiving of both, so a value written by either side reads back.
 */
export function parseIdList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const value: unknown = JSON.parse(trimmed);
      if (!Array.isArray(value)) return [];
      return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
    } catch {
      return [];
    }
  }

  return [...new Set(trimmed.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

/** Keeps only ids the catalogue knows, in catalogue order, so display is stable. */
export function keepKnown(ids: string[], catalogue: { id: string }[]): string[] {
  const chosen = new Set(ids);
  return catalogue.filter((entry) => chosen.has(entry.id)).map((entry) => entry.id);
}
