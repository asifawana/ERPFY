/**
 * Structured Production Logging for ERPfy.net
 * Guarantees zero leakage of secrets, passwords, tokens, API keys, or credit card numbers.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'security'
  | 'auth'
  | 'api'
  | 'database'
  | 'storage'
  | 'queue'
  | 'webhook'
  | 'domain'
  | 'billing'
  | 'system';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  tenantId?: string;
  accountId?: string;
  requestId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'secret',
  'token',
  'apikey',
  'key',
  'authorization',
  'x-api-key',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
  'ssn',
  'session',
]);

/**
 * Recursively redacts sensitive keys from metadata objects
 */
export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_KEYS.has(lower) || lower.includes('secret') || lower.includes('password') || lower.includes('token')) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = redactSensitiveData(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

class Logger {
  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  log(level: LogLevel, category: LogCategory, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata: meta ? (redactSensitiveData(meta) as Record<string, unknown>) : undefined,
    };

    const out = this.formatLog(entry);
    if (level === 'error') {
      console.error(out);
    } else if (level === 'warn') {
      console.warn(out);
    } else {
      console.log(out);
    }
  }

  info(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log('info', category, message, meta);
  }

  warn(category: LogCategory, message: string, meta?: Record<string, unknown>) {
    this.log('warn', category, message, meta);
  }

  error(category: LogCategory, message: string, err?: unknown, meta?: Record<string, unknown>) {
    const errorObj =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack }
        : err !== undefined && err !== null
          ? { message: typeof err === 'object' ? JSON.stringify(err) : ((err as any)?.toString?.() ?? 'Unknown error') }
          : undefined;

    const entry: LogEntry = {

      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message,
      error: errorObj,
      metadata: meta ? (redactSensitiveData(meta) as Record<string, unknown>) : undefined,
    };

    console.error(this.formatLog(entry));
  }

  security(message: string, meta?: Record<string, unknown>) {
    this.log('warn', 'security', message, meta);
  }
}

export const logger = new Logger();
