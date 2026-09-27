import crypto from 'node:crypto';
import { ApiError } from '../core/server';
import { getDerivedPlatformSecretHex } from './crypto-keys';

export type PluginRuntimeTokenPayload = {
  iss: 'erpfy';
  aud: 'erpfy-plugin-runtime';
  platform: 'erpfy';
  pluginId: string;
  pluginVersion: string;
  installationId: string;
  companyId: string;
  allowedCapabilities: string[];
  issuedAt: number;
  expiresAt: number;
  jti: string;
  nonce: string;
  purpose?: string;
};

export type IssuedRuntimeToken = {
  token: string;
  payload: PluginRuntimeTokenPayload;
};

/** Default short-lived token lifespan: 10 minutes */
export const DEFAULT_RUNTIME_TOKEN_TTL_MS = 10 * 60 * 1000;

/** Allowed clock skew in milliseconds (60 seconds) */
export const ALLOWED_CLOCK_SKEW_MS = 60 * 1000;

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function getPlatformSecret(overrideSecret?: string): string {
  if (overrideSecret) return overrideSecret;
  const globalSecret = (globalThis as unknown as { __erpTestSecretKey?: string }).__erpTestSecretKey;
  if (globalSecret) return globalSecret;
  return process.env.ERPFY_SECRET_KEY || 'erpfy-platform-master-signing-key';
}

/**
 * Derives the effective capabilities by computing the strict intersection of:
 * 1. Approved manifest permissions
 * 2. Active installation granted permissions
 * 3. Authenticated user RBAC permissions (if provided)
 * 4. Client-requested capabilities (if specified)
 * Client-provided input can only narrow/request a subset; it can NEVER expand authority.
 */
export function deriveEffectiveCapabilities(params: {
  manifestPermissions: string[];
  installedPermissions: string[];
  userPermissions?: string[];
  requestedCapabilities?: string[];
  companyEntitlementValid?: boolean;
}): string[] {
  if (params.companyEntitlementValid === false) {
    return [];
  }

  // Baseline: intersection of manifest & installed granted permissions
  const manifestSet = new Set(params.manifestPermissions);
  let effective = params.installedPermissions.filter((p) => manifestSet.has(p));

  // Intersect with authenticated user's RBAC permissions
  if (params.userPermissions) {
    const userSet = new Set(params.userPermissions);
    effective = effective.filter((p) => userSet.has(p));
  }

  // Intersect with client requested capabilities (client cannot expand authority)
  if (params.requestedCapabilities && params.requestedCapabilities.length > 0) {
    const reqSet = new Set(params.requestedCapabilities);
    effective = effective.filter((p) => reqSet.has(p));
  }

  return Array.from(new Set(effective));
}

// In-memory single-use tracking cache for high-risk one-shot operations (Replay Prevention)
const consumedJtis = new Set<string>();

export type ConsumeOneShotTokenParams = {
  jti: string;
  companyId: string;
  appId: string;
  installationId: string;
  purpose: string;
  expiresAt: number;
  runtimeToken?: string;
  secret?: string;
};

/**
 * Marks a token's unique jti as consumed for one-shot replay-sensitive operations.
 * When provided with a database handle, executes a single atomic INSERT protected by
 * the primary key on `eap_consumed_tokens`.
 * 
 * Replay protection guarantee:
 * - Exactly one concurrent request succeeds.
 * - All other duplicate attempts fail closed as TOKEN_REPLAY_DETECTED.
 * - Expired tokens are pruned opportunistically without blocking concurrency.
 */
export async function consumeOneShotToken(
  dbOrJti: D1Database | string,
  paramsOrLegacy?: ConsumeOneShotTokenParams | string,
): Promise<boolean> {
  // Support legacy single-argument call consumeOneShotToken(jti) for backwards-compatibility
  if (typeof dbOrJti === 'string') {
    const jti = dbOrJti;
    if (consumedJtis.has(jti)) {
      return false;
    }
    consumedJtis.add(jti);
    if (consumedJtis.size > 10000) {
      const oldest = consumedJtis.values().next().value;
      if (oldest) consumedJtis.delete(oldest);
    }
    return true;
  }

  const db = dbOrJti;
  const params = paramsOrLegacy as ConsumeOneShotTokenParams;
  if (!params || !params.jti) {
    throw new ApiError(400, 'Invalid token consumption parameters: jti required');
  }

  const {
    jti,
    companyId,
    appId,
    installationId,
    purpose,
    expiresAt,
    runtimeToken,
    secret,
  } = params;

  // 1. Verify runtimeToken signature and claims if supplied
  if (runtimeToken) {
    const verified = verifyPluginRuntimeToken(
      runtimeToken,
      {
        companyId,
        pluginId: appId,
        installationId,
        expectedPurpose: purpose,
      },
      secret,
    );
    if (!verified) {
      throw new ApiError(401, 'Invalid runtime token for consumption');
    }
  }

  // 2. Verify token expiry
  if (Date.now() > expiresAt) {
    throw new ApiError(401, 'Token expired');
  }

  const now = Date.now();

  // 3. Single atomic INSERT protected by primary key (jti)
  try {
    await db
      .prepare(
        `INSERT INTO eap_consumed_tokens
          (jti, company_id, app_id, installation_id, purpose, expires_at, consumed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(jti, companyId, appId, installationId, purpose, expiresAt, now)
      .run();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.includes('UNIQUE') ||
      errMsg.includes('constraint') ||
      errMsg.includes('already exists') ||
      errMsg.includes('PRIMARY KEY')
    ) {
      throw new ApiError(403, 'TOKEN_REPLAY_DETECTED: Token has already been consumed.');
    }
    throw err;
  }

  // 4. Bounded, opportunistic cleanup of expired records (probabilistic: 1 in 20 requests)
  if (Math.random() < 0.05) {
    try {
      await db
        .prepare(`DELETE FROM eap_consumed_tokens WHERE expires_at < ?1`)
        .bind(now)
        .run();
    } catch {
      // Replay correctness does not depend on cleanup
    }
  }

  return true;
}

/**
 * Issues a short-lived, server-signed ERPFY runtime token.
 * Uses a cryptographically derived purpose-specific key (domain separation) and
 * binds iss, aud, platform, pluginId, version, installationId, companyId, capabilities, and purpose.
 */
export function issuePluginRuntimeToken(
  params: {
    pluginId: string;
    pluginVersion: string;
    installationId: string;
    companyId: string;
    allowedCapabilities: string[];
    purpose?: string;
    ttlMs?: number;
    issuedAtOffsetMs?: number;
    customJti?: string;
    customNonce?: string;
  },
  customSecret?: string,
): IssuedRuntimeToken {
  const masterSecret = getPlatformSecret(customSecret);
  const signingKey = getDerivedPlatformSecretHex(masterSecret, 'runtime-token');

  const now = Date.now() + (params.issuedAtOffsetMs ?? 0);
  const expiresAt = now + (params.ttlMs ?? DEFAULT_RUNTIME_TOKEN_TTL_MS);
  const jti = params.customJti ?? `jti_${crypto.randomBytes(12).toString('hex')}`;
  const nonce = params.customNonce ?? crypto.randomBytes(8).toString('hex');
  const purpose = params.purpose ?? 'plugin.invoke';

  const payload: PluginRuntimeTokenPayload = {
    iss: 'erpfy',
    aud: 'erpfy-plugin-runtime',
    platform: 'erpfy',
    pluginId: params.pluginId,
    pluginVersion: params.pluginVersion,
    installationId: params.installationId,
    companyId: params.companyId,
    allowedCapabilities: params.allowedCapabilities,
    purpose,
    issuedAt: now,
    expiresAt,
    jti,
    nonce,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(`erpfy_rt_v2:${encodedPayload}`);
  const signature = hmac.digest('hex');

  const token = `erpfy_rt.${encodedPayload}.${signature}`;

  return { token, payload };
}

/**
 * Validates a server-issued ERPFY runtime token.
 * Enforces cryptographic authenticity, domain key separation, non-expiry,
 * allowable clock skew, platform identity, issuer, audience, and parameter matching.
 */
export function verifyPluginRuntimeToken(
  token: string,
  expected?: {
    companyId?: string;
    pluginId?: string;
    installationId?: string;
    pluginVersion?: string;
    capability?: string;
    expectedIssuer?: string;
    expectedAudience?: string;
    expectedPurpose?: string;
  },
  customSecret?: string,
): PluginRuntimeTokenPayload {
  if (!token || typeof token !== 'string' || !token.startsWith('erpfy_rt.')) {
    throw new ApiError(401, 'Invalid runtime token format: missing or unrecognized ERPFY platform token.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ApiError(401, 'Malformed ERPFY runtime token structure.');
  }

  const [, encodedPayload, signature] = parts;
  const masterSecret = getPlatformSecret(customSecret);
  const signingKey = getDerivedPlatformSecretHex(masterSecret, 'runtime-token');

  // 1. Cryptographic HMAC verification with timing safety using derived runtime-token key
  let verified = false;

  // v2 payload candidate (with domain-separated key)
  const hmacV2 = crypto.createHmac('sha256', signingKey);
  hmacV2.update(`erpfy_rt_v2:${encodedPayload}`);
  const expectedSigV2 = hmacV2.digest('hex');

  if (
    signature.length === expectedSigV2.length &&
    crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSigV2, 'hex'))
  ) {
    verified = true;
  }

  // v1 candidate fallback (for backwards-compatibility during migration)
  if (!verified) {
    const hmacV1 = crypto.createHmac('sha256', masterSecret);
    hmacV1.update(`erpfy_rt_v1:${encodedPayload}`);
    const expectedSigV1 = hmacV1.digest('hex');
    if (
      signature.length === expectedSigV1.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSigV1, 'hex'))
    ) {
      verified = true;
    }
  }

  if (!verified) {
    throw new ApiError(401, 'Cryptographic token verification failed: invalid signature or tampered token.');
  }

  // 2. Parse payload
  let payload: PluginRuntimeTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new ApiError(401, 'Failed to deserialize ERPFY runtime token payload.');
  }

  // 3. Platform identity, Issuer, and Audience checks
  if (payload.platform !== 'erpfy') {
    throw new ApiError(403, "Token platform mismatch: token does not originate from official 'erpfy' runtime.");
  }

  const expectedIssuer = expected?.expectedIssuer ?? 'erpfy';
  if (!payload.iss || payload.iss !== expectedIssuer) {
    throw new ApiError(403, `Token issuer mismatch: expected '${expectedIssuer}', got '${payload.iss}'.`);
  }

  const expectedAudience = expected?.expectedAudience ?? 'erpfy-plugin-runtime';
  if (!payload.aud || payload.aud !== expectedAudience) {
    throw new ApiError(403, `Token audience mismatch: expected '${expectedAudience}', got '${payload.aud}'.`);
  }

  // 4. Clock Skew and Expiry checks
  const now = Date.now();
  if (payload.issuedAt > now + ALLOWED_CLOCK_SKEW_MS) {
    throw new ApiError(401, `Token issued in the future beyond allowable clock skew (issuedAt: ${new Date(payload.issuedAt).toISOString()}).`);
  }

  if (now > payload.expiresAt) {
    throw new ApiError(401, `ERPFY runtime token has expired (expired at ${new Date(payload.expiresAt).toISOString()}).`);
  }

  // 5. Context binding checks
  if (expected?.companyId && payload.companyId !== expected.companyId) {
    throw new ApiError(
      403,
      `Tenant Isolation Violation: Token company '${payload.companyId}' does not match target company '${expected.companyId}'.`,
    );
  }

  if (expected?.pluginId && payload.pluginId !== expected.pluginId) {
    throw new ApiError(
      403,
      `Plugin Identity Violation: Token plugin '${payload.pluginId}' does not match execution plugin '${expected.pluginId}'.`,
    );
  }

  if (expected?.installationId && payload.installationId !== expected.installationId) {
    throw new ApiError(
      403,
      `Installation Mismatch: Token installation '${payload.installationId}' does not match active record '${expected.installationId}'.`,
    );
  }

  if (expected?.pluginVersion && payload.pluginVersion !== expected.pluginVersion) {
    throw new ApiError(
      403,
      `Version Mismatch: Token version '${payload.pluginVersion}' does not match installed version '${expected.pluginVersion}'.`,
    );
  }

  if (expected?.capability && !payload.allowedCapabilities.includes(expected.capability)) {
    throw new ApiError(
      403,
      `Capability Denied: Token does not grant capability '${expected.capability}'. Granted: [${payload.allowedCapabilities.join(', ')}].`,
    );
  }

  if (expected?.expectedPurpose && payload.purpose && payload.purpose !== expected.expectedPurpose) {
    throw new ApiError(
      403,
      `Token Purpose Mismatch: Token is issued for purpose '${payload.purpose}', cannot be used for '${expected.expectedPurpose}'.`,
    );
  }

  return payload;
}
