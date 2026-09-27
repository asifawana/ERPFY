/**
 * Database Entry Point for ERPfy.net
 * Resolves active DatabaseAdapter based on runtime environment.
 */

import { DatabaseAdapter, D1DatabaseAdapter, PostgresDatabaseAdapter } from './adapter.ts';
import { database } from '@/lib/core/server';

let cachedAdapter: DatabaseAdapter | null = null;

export function getDatabaseAdapter(customDb?: D1Database): DatabaseAdapter {
  if (customDb) {
    return new D1DatabaseAdapter(customDb, process.env.NODE_ENV === 'production');
  }

  if (cachedAdapter) {
    return cachedAdapter;
  }

  // Check if PostgreSQL connection URL is explicitly set in Node/container environment
  if (process.env.DATABASE_URL && process.env.DATABASE_DRIVER === 'postgres') {
    // In production Node container with PG driver
    cachedAdapter = new PostgresDatabaseAdapter(null); // Initialized with pool when pg package is bound
    return cachedAdapter;
  }

  // Default to standard D1/SQLite database handle
  try {
    const d1 = database();
    cachedAdapter = new D1DatabaseAdapter(d1, process.env.NODE_ENV === 'production');
    return cachedAdapter;
  } catch {
    // Fallback uninitialized adapter for tests/tools
    return new D1DatabaseAdapter(null as unknown as D1Database, false);
  }
}

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  try {
    const adapter = getDatabaseAdapter();
    return await adapter.healthCheck();
  } catch (err: unknown) {
    return {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
