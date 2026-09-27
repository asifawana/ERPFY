import { env } from 'cloudflare:workers';

import { randomToken, sha256Hex } from './crypto';
import { ApiError } from './server';

/**
 * Session lifecycle and cookie handling.
 * Authority: ERPFY-MASTER-PLAN.md sections 50, 51, 81.
 *
 * The cookie holds an opaque random token. Only its SHA-256 is stored, so a copy of the
 * database cannot be replayed as a signed-in session.
 */

export const SESSION_COOKIE = 'erpfy_session';

/** Absolute lifetime. A session is never extended past this, however active it is. */
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
/** Idle lifetime. Refreshed on use, but always clamped to the absolute expiry. */
export const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000;
/** How long a password or second-factor check counts as "recent" for step-up. */
export const STEP_UP_WINDOW_MS = 10 * 60 * 1000;
/** How long a trusted device may skip the second factor. */
export const TRUSTED_DEVICE_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionRow = {
  id: string;
  account_id: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  verified_at: number;
  ip_address: string;
  user_agent: string;
  device_label: string;
  trusted_until: number;
  revoked_at: number | null;
};

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/**
 * `Secure` is omitted on plain-http localhost only, because a browser will otherwise
 * discard the cookie during local development. Every deployed origin is https.
 */
export function sessionCookie(
  request: Request,
  token: string,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isSecureRequest(request)) parts.push('Secure');
  return parts.join('; ');
}

export function clearedSessionCookie(request: Request): string {
  return sessionCookie(request, '', 0);
}

export function readSessionToken(headers: Headers): string | null {
  const cookie = headers.get('cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      return value || null;
    }
  }
  return null;
}

/** A short, honest device description. Never a fingerprint, never stored beyond this. */
export function describeDevice(userAgent: string): string {
  const ua = userAgent.slice(0, 300);
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const platform = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown device';
  return `${browser} on ${platform}`;
}

function clientIp(headers: Headers): string {
  // Cloudflare sets CF-Connecting-IP. Anything else is caller-controlled and not trusted.
  return (headers.get('cf-connecting-ip') || '').slice(0, 45);
}

export type CreatedSession = { id: string; token: string; expiresAt: number };

export async function createSession(
  db: D1Database,
  request: Request,
  accountId: string,
  options: { trustDevice?: boolean; verified?: boolean } = {},
): Promise<CreatedSession> {
  const now = Date.now();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const id = crypto.randomUUID();
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300);
  const expiresAt = now + SESSION_ABSOLUTE_MS;

  await db
    .prepare(
      `INSERT INTO core_sessions
         (id, account_id, token_hash, created_at, last_seen_at, expires_at, verified_at,
          ip_address, user_agent, device_label, trusted_until, revoked_at)
       VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?10, ?6, ?7, ?8, ?9, NULL)`,
    )
    .bind(
      id,
      accountId,
      tokenHash,
      now,
      expiresAt,
      clientIp(request.headers),
      userAgent,
      describeDevice(userAgent),
      options.trustDevice ? now + TRUSTED_DEVICE_MS : 0,
      // A sign-in that proved a factor counts as a fresh verification for the step-up
      // window. A session minted from someone else's identity assertion does not.
      options.verified === false ? 0 : now,
    )
    .run();

  return { id, token, expiresAt };
}

/**
 * Resolves the session behind a request and refreshes its idle window.
 * Returns null for a missing, revoked, idle-expired or absolutely expired session.
 */
export async function resolveSession(
  db: D1Database,
  headers: Headers,
): Promise<SessionRow | null> {
  const token = readSessionToken(headers);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare('SELECT * FROM core_sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .first<SessionRow>();

  if (!row) return null;

  const now = Date.now();
  if (row.revoked_at !== null) return null;
  if (row.expires_at <= now) return null;
  if (now - row.last_seen_at > SESSION_IDLE_MS) return null;

  // Refresh at most once a minute, so an active session does not write on every request.
  if (now - row.last_seen_at > 60_000) {
    await db
      .prepare('UPDATE core_sessions SET last_seen_at = ?2 WHERE id = ?1')
      .bind(row.id, now)
      .run();
    row.last_seen_at = now;
  }

  return row;
}

export async function revokeSession(
  db: D1Database,
  accountId: string,
  sessionId: string,
): Promise<void> {
  const result = await db
    .prepare(
      'UPDATE core_sessions SET revoked_at = ?3 WHERE id = ?1 AND account_id = ?2 AND revoked_at IS NULL',
    )
    .bind(sessionId, accountId, Date.now())
    .run();
  if (!result.meta.changes) {
    throw new ApiError(404, 'That session is no longer active.');
  }
}

export async function revokeOtherSessions(
  db: D1Database,
  accountId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await db
    .prepare(
      'UPDATE core_sessions SET revoked_at = ?3 WHERE account_id = ?1 AND id != ?2 AND revoked_at IS NULL',
    )
    .bind(accountId, keepSessionId, Date.now())
    .run();
  return result.meta.changes ?? 0;
}

/** Used after a password change or 2FA disable, where every other session must end. */
export async function revokeAllSessions(
  db: D1Database,
  accountId: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE core_sessions SET revoked_at = ?2 WHERE account_id = ?1 AND revoked_at IS NULL',
    )
    .bind(accountId, Date.now())
    .run();
}

export async function markVerified(
  db: D1Database,
  sessionId: string,
): Promise<void> {
  await db
    .prepare('UPDATE core_sessions SET verified_at = ?2 WHERE id = ?1')
    .bind(sessionId, Date.now())
    .run();
}

/** Master-plan section 50: high-risk actions require a fresh check, not just a session. */
export function hasRecentVerification(session: SessionRow): boolean {
  return Date.now() - session.verified_at <= STEP_UP_WINDOW_MS;
}

export function requireRecentVerification(session: SessionRow): void {
  if (!hasRecentVerification(session)) {
    throw new ApiError(403, 'Confirm it is you before making this change.');
  }
}

export type ActiveSession = {
  id: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  trusted: boolean;
  current: boolean;
};

export async function listSessions(
  db: D1Database,
  accountId: string,
  currentSessionId: string,
): Promise<ActiveSession[]> {
  const now = Date.now();
  const { results } = await db
    .prepare(
      `SELECT id, device_label, ip_address, created_at, last_seen_at, expires_at, trusted_until
         FROM core_sessions
        WHERE account_id = ?1 AND revoked_at IS NULL AND expires_at > ?2 AND last_seen_at > ?3
        ORDER BY last_seen_at DESC`,
    )
    .bind(accountId, now, now - SESSION_IDLE_MS)
    .all<{
      id: string;
      device_label: string;
      ip_address: string;
      created_at: number;
      last_seen_at: number;
      expires_at: number;
      trusted_until: number;
    }>();

  return (results ?? []).map((row) => ({
    id: row.id,
    deviceLabel: row.device_label || 'Unknown device',
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    trusted: row.trusted_until > now,
    current: row.id === currentSessionId,
  }));
}

/** Secret used to encrypt TOTP secrets at rest. Absent means 2FA enrolment is refused. */
export function secretKeyMaterial(): string | null {
  const value = (env as unknown as { ERPFY_SECRET_KEY?: string })
    .ERPFY_SECRET_KEY;
  return value && value.length >= 32 ? value : null;
}
