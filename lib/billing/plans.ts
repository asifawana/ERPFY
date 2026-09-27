export type SubscriptionTier =
  | 'free'
  | 'starter'
  | 'professional'
  | 'business'
  | 'enterprise';

export interface PlanLimits {
  maxUsers: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxBranches: number;
  maxCustomDomains: number;
  maxActiveModules: number;
  ecommerceEnabled: boolean;
  themeCustomizerEnabled: boolean;
  apiAccess: boolean;
  webhooksEnabled: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  description: string;
  badge?: string;
  limits: PlanLimits;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    description: 'Perfect for micro-businesses and testing ERPfy.',
    limits: {
      maxUsers: 2,
      maxProducts: 50,
      maxOrdersPerMonth: 100,
      maxBranches: 1,
      maxCustomDomains: 0,
      maxActiveModules: 4,
      ecommerceEnabled: true,
      themeCustomizerEnabled: false,
      apiAccess: false,
      webhooksEnabled: false,
      prioritySupport: false,
    },
    features: [
      'Up to 2 staff accounts',
      '50 catalog products',
      '100 orders/month',
      '1 branch / warehouse',
      'Subdomain storefront (*.erpfy.net)',
      'Community support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter Growth',
    priceMonthly: 29,
    priceAnnual: 290,
    currency: 'USD',
    description: 'For growing retail shops, cafes, and local service providers.',
    limits: {
      maxUsers: 5,
      maxProducts: 500,
      maxOrdersPerMonth: 1000,
      maxBranches: 2,
      maxCustomDomains: 1,
      maxActiveModules: 8,
      ecommerceEnabled: true,
      themeCustomizerEnabled: true,
      apiAccess: true,
      webhooksEnabled: false,
      prioritySupport: false,
    },
    features: [
      'Up to 5 staff accounts',
      '500 catalog products',
      '1,000 orders/month',
      '2 branches / warehouses',
      '1 Custom Domain with free SSL',
      'Theme customization & colors',
      'Standard email support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 79,
    priceAnnual: 790,
    currency: 'USD',
    badge: 'Most Popular',
    description: 'Complete ERP + Ecommerce powerhouse for established businesses.',
    limits: {
      maxUsers: 15,
      maxProducts: 5000,
      maxOrdersPerMonth: 10000,
      maxBranches: 5,
      maxCustomDomains: 3,
      maxActiveModules: 16,
      ecommerceEnabled: true,
      themeCustomizerEnabled: true,
      apiAccess: true,
      webhooksEnabled: true,
      prioritySupport: true,
    },
    features: [
      'Up to 15 staff accounts',
      '5,000 catalog products',
      '10,000 orders/month',
      '5 branches / warehouses',
      '3 Custom Domains',
      'Full Theme Customizer & Sections',
      'REST API & Webhook dispatch',
      'Priority ticket support',
    ],
  },
  business: {
    id: 'business',
    name: 'Business Scale',
    priceMonthly: 199,
    priceAnnual: 1990,
    currency: 'USD',
    description: 'High-volume multichannel brands and wholesale distributors.',
    limits: {
      maxUsers: 50,
      maxProducts: 50000,
      maxOrdersPerMonth: 100000,
      maxBranches: 15,
      maxCustomDomains: 10,
      maxActiveModules: 99,
      ecommerceEnabled: true,
      themeCustomizerEnabled: true,
      apiAccess: true,
      webhooksEnabled: true,
      prioritySupport: true,
    },
    features: [
      'Up to 50 staff accounts',
      '50,000 catalog products',
      '100,000 orders/month',
      '15 branches / warehouses',
      '10 Custom Domains',
      'Advanced Category Blueprints & POS',
      'Real-time Webhook integrations',
      'Dedicated account manager',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Global',
    priceMonthly: 499,
    priceAnnual: 4990,
    currency: 'USD',
    description: 'Unlimited capabilities with dedicated infrastructure and SLA.',
    limits: {
      maxUsers: 9999,
      maxProducts: 999999,
      maxOrdersPerMonth: 9999999,
      maxBranches: 999,
      maxCustomDomains: 999,
      maxActiveModules: 999,
      ecommerceEnabled: true,
      themeCustomizerEnabled: true,
      apiAccess: true,
      webhooksEnabled: true,
      prioritySupport: true,
    },
    features: [
      'Unlimited staff accounts & roles',
      'Unlimited products & orders',
      'Unlimited branches & warehouses',
      'Unlimited Custom Domains',
      'Custom blueprint engineering',
      '24/7 Phone & Slack SLA support',
      'Single Tenant Isolation option',
    ],
  },
};

export interface CompanySubscription {
  tier: SubscriptionTier;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
}
