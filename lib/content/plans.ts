/**
 * Public pricing — authority: ERPFY-MASTER-PLAN.md sections 52-58.
 *
 * These are published commercial requirements for the planned release. Nothing here
 * implies a working payment path exists today; the pricing surface is informational
 * until billing is released (master-plan section 99).
 */

export const ANNUAL_DISCOUNT = 0.15;

/** Master-plan section 58. */
export const TRIAL = {
  days: 14,
  cardRequired: false,
  maxActiveUsers: 5,
  scope: 'Core only',
} as const;

export type PlanId = 'starter' | 'growth' | 'business' | 'enterprise';

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly price per active internal user, in USD. `null` = custom / contact sales. */
  monthlyPerUser: number | null;
  tagline: string;
  audience: string;
  /** Section 57 entitlement direction. Roadmap items are marked, never claimed as live. */
  includes: string[];
  /** Shown under a "Planned, not yet released" heading on the plan card. */
  roadmap: string[];
  featured?: boolean;
  cta: string;
};

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPerUser: 8,
    tagline: 'For small businesses.',
    audience: 'Micro and small business',
    includes: [
      'Company profile and dashboard',
      'Simple branch allowance',
      'Team management',
      'Standard permissions',
      'Two-factor authentication',
      'Files and notifications',
      'Activity and audit trail',
      'Subscription and billing',
      'Data export and basic recovery',
      'Standard support',
    ],
    roadmap: ['Apps Marketplace access once released'],
    cta: 'Start 14-day free trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPerUser: 12,
    tagline: 'For growing teams.',
    audience: 'Growing business',
    includes: [
      'Everything in Starter',
      'More branches',
      'Departments and teams',
      'Custom roles and scopes',
      'Enhanced audit and security',
      'Higher operational service limits',
      'Priority support',
    ],
    roadmap: ['Apps Marketplace access once released'],
    featured: true,
    cta: 'Start 14-day free trial',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPerUser: 18,
    tagline: 'For established organizations.',
    audience: 'Established organization',
    includes: [
      'Everything in Growth',
      'Advanced organization and regional governance',
      'Stronger security policy controls',
      'Advanced audit, recovery and administration',
    ],
    roadmap: ['Public API entitlement once released'],
    cta: 'Start 14-day free trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPerUser: null,
    tagline: 'For large or complex organizations.',
    audience: 'Large or complex organization',
    includes: [
      'Negotiated pricing and volume terms',
      'Onboarding, security and support commitments',
      'Custom retention where contracted',
      'Region and residency only where actually available',
    ],
    roadmap: ['Single sign-on and company groups once released'],
    cta: 'Contact sales',
  },
];

/** Annual effective monthly price per user, rounded to cents. */
export function annualEffectiveMonthly(monthly: number): number {
  return round2(monthly * (1 - ANNUAL_DISCOUNT));
}

/** Annual upfront commitment per user. */
export function annualUpfrontPerUser(monthly: number): number {
  return round2(annualEffectiveMonthly(monthly) * 12);
}

export type Estimate = {
  perUser: number;
  monthlyTotal: number;
  annualEffectiveMonthly: number;
  annualUpfront: number;
};

/**
 * Master-plan section 56. The annual figure is an effective monthly rate — it is never
 * presented as the amount charged.
 */
export function estimate(monthlyPerUser: number, users: number): Estimate {
  const seats = Math.max(1, Math.floor(users));
  const effective = annualEffectiveMonthly(monthlyPerUser);
  return {
    perUser: monthlyPerUser,
    monthlyTotal: round2(monthlyPerUser * seats),
    annualEffectiveMonthly: round2(effective * seats),
    annualUpfront: round2(effective * seats * 12),
  };
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Master-plan section 54. Published verbatim on the pricing page. */
export const SEAT_RULES: string[] = [
  'One active person in one company is one paid seat.',
  'One person holding several roles in the same company is still one seat.',
  'The same person active in two independent ERPs is one seat in each ERP.',
  'A pending invitation is not billed.',
  'A removed member carries no future seat charge.',
  'A suspended membership carries no future seat charge; past invoices do not change.',
  'Temporary authorised ERPFY support access is never a customer seat.',
  'Role seniority does not multiply the seat price.',
];

/** Master-plan section 53. */
export const STORAGE_COPY = 'Secure cloud storage included. Fair-use and service limits apply.';
