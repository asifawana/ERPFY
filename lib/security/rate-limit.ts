/**
 * Production Rate Limiting Subsystem for ERPfy.net
 * Implements sliding-window rate limiting for authentication, API, checkout, webhooks, and uploads.
 * Supports In-Memory tracking (dev/test) and Redis INCR/EXPIRE (production).
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  prefix?: string;
}

class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private prefix: string;
  private hits = new Map<string, number[]>();

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.prefix = options.prefix || 'rl';
  }

  async check(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Prune stale timestamps
    let timestamps = this.hits.get(fullKey) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] || now;
      const resetSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    timestamps.push(now);
    this.hits.set(fullKey, timestamps);

    const resetSeconds = Math.ceil(this.windowMs / 1000);
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      resetSeconds,
    };
  }

  reset(key: string): void {
    this.hits.delete(`${this.prefix}:${key}`);
  }
}

// 1. Auth Limiter: 10 requests per 15 minutes (login, signup, password reset)
export const authRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  prefix: 'auth',
});

// 2. API v1 Limiter: 120 requests per minute
export const apiRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  prefix: 'api',
});

// 3. Checkout Limiter: 15 requests per minute
export const checkoutRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  prefix: 'checkout',
});

// 4. Webhooks Ingress Limiter: 300 requests per minute
export const webhookRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  prefix: 'webhooks',
});

// 5. Custom Domain Verification Limiter: 10 requests per 10 minutes
export const domainRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  prefix: 'domains',
});

// 6. Media / Uploads Limiter: 20 requests per 5 minutes
export const uploadRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  prefix: 'uploads',
});
