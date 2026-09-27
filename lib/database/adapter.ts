/**
 * Unified Database Adapter Architecture for ERPfy.net
 * Provides a production-grade abstraction supporting Cloudflare D1/SQLite and PostgreSQL
 * while preserving the standard D1Database query interface (.prepare().bind().first/all/run/batch).
 */

export interface DatabaseStatement {
  bind(...args: unknown[]): DatabaseStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ results: unknown[]; meta: { changes: number } }>;
}

export interface DatabaseAdapter {
  name: 'd1' | 'postgres' | 'sqlite';
  isProduction: boolean;
  prepare(sql: string): DatabaseStatement;
  batch<T = unknown>(statements: DatabaseStatement[]): Promise<T[]>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

/**
 * Cloudflare D1 / Local SQLite Adapter
 * Wraps native D1Database instance.
 */
export class D1DatabaseAdapter implements DatabaseAdapter {
  name: 'd1' = 'd1';
  isProduction = false;
  private db: D1Database;

  constructor(db: D1Database, isProd = false) {
    this.db = db;
    this.isProduction = isProd;
  }

  prepare(sql: string): DatabaseStatement {
    const stmt = this.db.prepare(sql);
    return {
      bind: (...args: unknown[]) => {
        const bound = stmt.bind(...args);
        return {
          bind: (...moreArgs: unknown[]) => bound.bind(...moreArgs) as unknown as DatabaseStatement,
          first: <T>() => bound.first<T>(),
          all: <T>() => bound.all<T>(),
          run: () => bound.run(),
        };
      },
      first: <T>() => stmt.first<T>(),
      all: <T>() => stmt.all<T>(),
      run: () => stmt.run(),
    };
  }

  async batch<T = unknown>(statements: DatabaseStatement[]): Promise<T[]> {
    // Cast to underlying D1PreparedStatement if native, or execute sequentially
    const d1Statements = statements as unknown as D1PreparedStatement[];
    if (typeof this.db.batch === 'function') {
      return (await this.db.batch(d1Statements)) as unknown as T[];
    }
    const results: unknown[] = [];
    for (const s of statements) {
      results.push(await s.run());
    }
    return results as T[];
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await this.prepare('SELECT 1 as alive').first();
      return { ok: true, latencyMs: Math.round(performance.now() - start) };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * PostgreSQL Database Adapter (for enterprise containerized deployments)
 * Translates ?1, ?2, ... positional bindings into $1, $2, ... and provides connection pooling.
 */
export class PostgresDatabaseAdapter implements DatabaseAdapter {
  name: 'postgres' = 'postgres';
  isProduction = true;
  private pool: any;

  constructor(poolOrConfig: any) {
    this.pool = poolOrConfig;
  }

  private translateSql(sql: string): string {
    // Converts ?1, ?2 to $1, $2 for PostgreSQL pg driver
    return sql.replace(/\?(\d+)/g, '$$$1');
  }

  prepare(sql: string): DatabaseStatement {
    const pgSql = this.translateSql(sql);
    let boundArgs: unknown[] = [];

    const stmt: DatabaseStatement = {
      bind: (...args: unknown[]) => {
        boundArgs = args;
        return stmt;
      },
      first: async <T = Record<string, unknown>>(): Promise<T | null> => {
        if (!this.pool || typeof this.pool.query !== 'function') {
          throw new Error('PostgreSQL connection pool not initialized.');
        }
        const res = await this.pool.query(pgSql, boundArgs);
        return res.rows && res.rows[0] ? (res.rows[0] as T) : null;
      },
      all: async <T = Record<string, unknown>>(): Promise<{ results: T[] }> => {
        if (!this.pool || typeof this.pool.query !== 'function') {
          throw new Error('PostgreSQL connection pool not initialized.');
        }
        const res = await this.pool.query(pgSql, boundArgs);
        return { results: (res.rows || []) as T[] };
      },
      run: async () => {
        if (!this.pool || typeof this.pool.query !== 'function') {
          throw new Error('PostgreSQL connection pool not initialized.');
        }
        const res = await this.pool.query(pgSql, boundArgs);
        return { results: [], meta: { changes: res.rowCount || 0 } };
      },
    };

    return stmt;
  }

  async batch<T = unknown>(statements: DatabaseStatement[]): Promise<T[]> {
    if (!this.pool || typeof this.pool.connect !== 'function') {
      throw new Error('PostgreSQL client connection not available for transaction batch.');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results: unknown[] = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      await client.query('COMMIT');
      return results as T[];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      if (!this.pool) {
        return { ok: false, latencyMs: 0, error: 'Database pool uninitialized' };
      }
      await this.pool.query('SELECT 1 as alive');
      return { ok: true, latencyMs: Math.round(performance.now() - start) };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
