import { env } from 'cloudflare:workers';

/**
 * Core request plumbing: storage handle, input validation, audit and responses.
 * Authority: ERPFY-MASTER-PLAN.md sections 8, 25, 47, 65, 81, 99.
 *
 * ERPFY's own opaque session cookie is the sole authentication authority. Request headers
 * supplied by a hosting layer never create an account or session.
 */

export class ApiError extends Error {
  status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

export function database(): D1Database {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) {
    throw new ApiError(
      503,
      'Account storage is not configured yet. Please try again later.',
    );
  }
  return db;
}

/**
 * Reads and validates a JSON body. Same-origin is enforced here because a cross-origin
 * form post must never be able to change company state.
 */
export async function body(
  request: Request,
  maxBytes = 16_384,
): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ApiError(
      403,
      'Request origin could not be verified. Refresh this page and try again.',
    );
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new ApiError(415, 'Expected JSON.');
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ApiError(413, 'This request is too large.');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'Invalid request.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Invalid request.');
  }
  return value as Record<string, unknown>;
}

export function field(
  data: Record<string, unknown>,
  key: string,
  {
    max = 100,
    required = true,
    label = key,
  }: { max?: number; required?: boolean; label?: string } = {},
): string {
  const value = data[key];
  if (value === undefined && !required) return '';
  if (typeof value !== 'string')
    throw new ApiError(400, `Please enter a valid ${label}.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ApiError(400, `Please enter a ${label}.`);
  if (trimmed.length > max)
    throw new ApiError(400, `${label} must be ${max} characters or fewer.`);
  // Reject control characters so stored values cannot break rendering or logs.
  for (let index = 0; index < trimmed.length; index += 1) {
    const code = trimmed.charCodeAt(index);
    if (code < 32 || code === 127) {
      throw new ApiError(400, `Please enter a valid ${label}.`);
    }
  }
  return trimmed;
}

export function emailField(data: Record<string, unknown>, key: string): string {
  const value = field(data, key, {
    max: 254,
    label: 'email address',
  }).toLowerCase();
  // Deliberately permissive: an address is confirmed by delivery, not by a regex.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
  return value;
}

export function queryParam(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);
  return value && value.length <= 256 ? value : null;
}


export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function failure(error: unknown): Response {
  if (
    error instanceof ApiError ||
    (error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string')
  ) {
    return json({ error: (error as { message: string }).message }, (error as { status: number }).status);
  }
  if (
    error instanceof Error &&
    /UNIQUE constraint failed/.test(error.message)
  ) {
    return json(
      { error: 'That value is already in use. Choose another.' },
      409,
    );
  }
  console.error(
    'Core request failed',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return json(
    {
      error:
        'The request could not be completed. Nothing was changed. Please retry.',
    },
    500,
  );
}

/** Append-only activity record (section 65). Returned as a statement so it can be batched. */
export function auditStatement(
  db: D1Database,
  input: {
    companyId: string | null;
    accountId: string;
    action: string;
    detail?: string;
  },
): D1PreparedStatement {
  return db
    .prepare(
      'INSERT INTO core_activity_events (id, company_id, account_id, action, detail, created_at) VALUES (?,?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      input.companyId,
      input.accountId,
      input.action,
      input.detail ?? '',
      Date.now(),
    );
}
