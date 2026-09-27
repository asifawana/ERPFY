/**
 * Production Environment Configuration Validator for ERPfy.net
 * Analyzes environment variables and outputs a structured validation report.
 * Strictly guarantees that secret values are NEVER printed or logged.
 */

export type ConfigStatus = 'READY' | 'MISSING' | 'OPTIONAL' | 'PRODUCTION REQUIRED' | 'CONFIGURED' | 'REQUIRED';

export type DeploymentState = 'DEVELOPMENT' | 'STAGING' | 'READY FOR PRODUCTION' | 'LIVE';

export type LiveStatus = 'READY FOR LIVE ACTIVATION' | 'NOT LIVE — PRODUCTION CONFIGURATION REQUIRED' | 'LIVE';

export interface ConfigVariableReport {
  name: string;
  category: 'core' | 'database' | 'storage' | 'queue' | 'domains' | 'billing' | 'email' | 'monitoring';
  status: ConfigStatus;
  isSecret: boolean;
  description: string;
  recommendation?: string;
}

export interface EnvironmentValidationReport {
  environment: string;
  deploymentState: DeploymentState;
  liveStatus: LiveStatus;
  isProductionReady: boolean;
  summary: {
    total: number;
    ready: number;
    configured: number;
    missing: number;
    optional: number;
    productionRequired: number;
    missingRequired: number;
    missingOptional: number;
  };
  variables: ConfigVariableReport[];
}

export function validateEnvironmentConfig(env: Record<string, string | undefined> = process.env): EnvironmentValidationReport {
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';

  // Detect configured providers (support both aliases)
  const storageDriver = (env.STORAGE_PROVIDER || env.STORAGE_DRIVER || 'local').toLowerCase();
  const queueDriver = (env.QUEUE_PROVIDER || env.JOB_QUEUE_DRIVER || 'memory').toLowerCase();
  const paymentDriver = (env.PAYMENT_PROVIDER || env.BILLING_PROVIDER || 'local').toLowerCase();
  const emailDriver = (env.EMAIL_PROVIDER || 'console').toLowerCase();
  const dbDriver = (env.DATABASE_PROVIDER || env.DATABASE_DRIVER || 'd1').toLowerCase();
  const domainDriver = (env.DOMAIN_PROVIDER || 'caddy').toLowerCase();

  const specs: Array<{
    name: string;
    category: ConfigVariableReport['category'];
    isRequired: boolean;
    isSecret: boolean;
    description: string;
    recommendation?: string;
  }> = [
    // Core Platform & Security
    {
      name: 'ERPFY_SECRET_KEY',
      category: 'core',
      isRequired: isProd,
      isSecret: true,
      description: 'Master 32+ character cryptographic secret for session signing and PBKDF2 salt derivation',
      recommendation: 'Generate a secure 64-char hex string: openssl rand -hex 32',
    },
    {
      name: 'PLATFORM_DOMAIN',
      category: 'core',
      isRequired: false,
      isSecret: false,
      description: 'Primary platform base domain (e.g. erpfy.net)',
      recommendation: 'Defaults to erpfy.net',
    },
    {
      name: 'PLATFORM_ADMIN_EMAILS',
      category: 'core',
      isRequired: false,
      isSecret: false,
      description: 'Comma-separated allowlist of superadmin emails',
    },

    // Database
    {
      name: 'DATABASE_URL',
      category: 'database',
      isRequired: dbDriver === 'postgres',
      isSecret: true,
      description: 'PostgreSQL connection string (when running standalone containerized Node)',
      recommendation: 'Required when DATABASE_DRIVER=postgres; otherwise Cloudflare D1 binding is used',
    },

    // Storage
    {
      name: 'STORAGE_DRIVER',
      category: 'storage',
      isRequired: false,
      isSecret: false,
      description: 'Object storage provider (local, s3, r2)',
      recommendation: 'Use r2 or s3 in multi-instance production',
    },
    {
      name: 'R2_BUCKET',
      category: 'storage',
      isRequired: storageDriver === 'r2',
      isSecret: false,
      description: 'Cloudflare R2 bucket name for tenant media and documents',
      recommendation: 'Required when STORAGE_PROVIDER=r2',
    },
    {
      name: 'S3_BUCKET',
      category: 'storage',
      isRequired: storageDriver === 's3',
      isSecret: false,
      description: 'AWS S3 bucket name for tenant media and documents',
      recommendation: 'Required when STORAGE_PROVIDER=s3',
    },

    // Distributed Queue & Redis
    {
      name: 'REDIS_URL',
      category: 'queue',
      isRequired: queueDriver === 'redis',
      isSecret: true,
      description: 'Redis connection URI for BullMQ worker queue and distributed rate limiting',
      recommendation: 'Required when QUEUE_PROVIDER=redis (redis://:password@host:port)',
    },

    // Custom Domains (Cloudflare for SaaS / Caddy)
    {
      name: 'CLOUDFLARE_API_TOKEN',
      category: 'domains',
      isRequired: domainDriver === 'cloudflare',
      isSecret: true,
      description: 'Cloudflare API Token with Custom Hostnames Edit permission',
      recommendation: 'Required when DOMAIN_PROVIDER=cloudflare',
    },
    {
      name: 'CLOUDFLARE_ZONE_ID',
      category: 'domains',
      isRequired: domainDriver === 'cloudflare',
      isSecret: false,
      description: 'Cloudflare primary zone ID for erpfy.net',
      recommendation: 'Required when DOMAIN_PROVIDER=cloudflare',
    },

    // Billing & Payments
    {
      name: 'STRIPE_SECRET_KEY',
      category: 'billing',
      isRequired: paymentDriver === 'stripe',
      isSecret: true,
      description: 'Stripe secret key (sk_live_... or sk_test_...)',
      recommendation: 'Required when PAYMENT_PROVIDER=stripe',
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      category: 'billing',
      isRequired: paymentDriver === 'stripe',
      isSecret: true,
      description: 'Stripe webhook signing secret (whsec_...)',
      recommendation: 'Required when PAYMENT_PROVIDER=stripe',
    },
    {
      name: 'PADDLE_API_KEY',
      category: 'billing',
      isRequired: paymentDriver === 'paddle',
      isSecret: true,
      description: 'Paddle vendor API key',
      recommendation: 'Required when PAYMENT_PROVIDER=paddle',
    },

    // Transactional Email
    {
      name: 'RESEND_API_KEY',
      category: 'email',
      isRequired: emailDriver === 'resend',
      isSecret: true,
      description: 'Resend API key (re_...) for transactional emails',
      recommendation: 'Required when EMAIL_PROVIDER=resend',
    },
    {
      name: 'SMTP_HOST',
      category: 'email',
      isRequired: emailDriver === 'smtp',
      isSecret: false,
      description: 'Standard SMTP outbound server hostname',
      recommendation: 'Required when EMAIL_PROVIDER=smtp',
    },

    // Monitoring & Observability
    {
      name: 'SENTRY_DSN',
      category: 'monitoring',
      isRequired: false,
      isSecret: true,
      description: 'Sentry error and performance telemetry DSN',
      recommendation: 'Recommended for live production crash tracking',
    },
  ];

  const results: ConfigVariableReport[] = [];
  let ready = 0;
  let missing = 0;
  let optional = 0;
  let productionRequired = 0;

  for (const s of specs) {
    const val = env[s.name];
    const isSet = Boolean(val && val.trim().length > 0);

    let status: ConfigStatus = 'OPTIONAL';
    if (isSet) {
      status = 'READY';
      ready++;
    } else if (s.isRequired) {
      if (isProd) {
        status = 'PRODUCTION REQUIRED';
        productionRequired++;
      } else {
        status = 'MISSING';
        missing++;
      }
    } else {
      status = 'OPTIONAL';
      optional++;
    }

    results.push({
      name: s.name,
      category: s.category,
      status,
      isSecret: s.isSecret,
      description: s.description,
      recommendation: s.recommendation,
    });
  }

  const isProductionReady = productionRequired === 0 && (isProd ? missing === 0 : true);

  let deploymentState: DeploymentState = 'DEVELOPMENT';
  let liveStatus: LiveStatus = 'NOT LIVE — PRODUCTION CONFIGURATION REQUIRED';

  const rawEnv = (env.NODE_ENV || '').toLowerCase();
  const rawState = (env.DEPLOYMENT_STATE || '').toUpperCase();
  const liveConfirmed = env.ERPFY_LIVE_ACTIVATION === 'true' || env.LIVE_VERIFIED === 'true' || rawState === 'LIVE';

  // Strict Security Rule: ERPFY_LIVE_ACTIVATION cannot bypass missing infrastructure
  const hasBlockers = !isProductionReady || productionRequired > 0;

  if (isProd) {
    if (hasBlockers) {
      deploymentState = 'DEVELOPMENT';
      liveStatus = 'NOT LIVE — PRODUCTION CONFIGURATION REQUIRED';
    } else if (liveConfirmed) {
      deploymentState = 'LIVE';
      liveStatus = 'LIVE';
    } else {
      deploymentState = 'READY FOR PRODUCTION';
      liveStatus = 'READY FOR LIVE ACTIVATION';
    }
  } else if (rawEnv === 'staging' || rawState === 'STAGING') {
    deploymentState = 'STAGING';
    liveStatus = 'NOT LIVE — PRODUCTION CONFIGURATION REQUIRED';
  } else {
    deploymentState = 'DEVELOPMENT';
    liveStatus = 'NOT LIVE — PRODUCTION CONFIGURATION REQUIRED';
  }

  return {
    environment: isProd ? 'production' : env.NODE_ENV || 'development',
    deploymentState,
    liveStatus,
    isProductionReady,
    summary: {
      total: specs.length,
      ready,
      configured: ready, // backward-compatible alias
      missing,
      optional,
      productionRequired,
      missingRequired: productionRequired, // backward-compatible alias for tests
      missingOptional: optional, // backward-compatible alias
    },
    variables: results,
  };
}
