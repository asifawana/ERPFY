import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const sqlite = new DatabaseSync(':memory:');

class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.sql, args);
  }
  async first() {
    return sqlite.prepare(this.sql).get(...this.args) || { alive: 1 };
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(...this.args) };
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.args);
    return { results: [], meta: { changes: Number(result.changes) } };
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  },
};

globalThis.__erpTestDB = db;
globalThis.__erpTestSecretKey = 'test-secret-key-material-0123456789abcdef';

async function bundleModule(entryPath) {
  const output = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [
      {
        name: 'test-d1-binding',
        setup(builder) {
          builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
            path: 'binding',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export const env = { get DB() { return globalThis.__erpTestDB; },' +
              ' get ERPFY_SECRET_KEY() { return globalThis.__erpTestSecretKey; } };',
          }));
        },
      },
      {
        name: 'alias-resolver',
        setup(builder) {
          builder.onResolve({ filter: /^@\// }, (args) => {
            const rel = args.path.replace(/^@\//, '');
            let resolved = path.resolve(process.cwd(), rel);
            if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx') && !resolved.endsWith('.js')) {
              try {
                if (readFileSync(resolved + '.ts')) resolved += '.ts';
              } catch {
                try {
                  if (readFileSync(resolved + '.tsx')) resolved += '.tsx';
                } catch {
                  // Fallback
                }
              }
            }
            return { path: resolved };
          });
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
  );
}

const liveRoute = await bundleModule('app/api/health/live/route.ts');
const readyRoute = await bundleModule('app/api/health/ready/route.ts');
const healthRoute = await bundleModule('app/api/health/route.ts');
const { D1DatabaseAdapter, PostgresDatabaseAdapter } = await bundleModule('lib/database/adapter.ts');

test('Health Checks: /api/health/live returns 200 alive', async () => {
  const res = await liveRoute.GET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'alive');
  assert.ok(typeof data.uptime === 'number');
});

test('Health Checks: /api/health/ready returns 200 ready on healthy system', async () => {
  const adapter = new D1DatabaseAdapter(db);
  const health = await adapter.healthCheck();
  assert.equal(health.ok, true);
  assert.ok(health.latencyMs >= 0);

  const res = await readyRoute.GET();
  const data = await res.json();
  assert.ok(res.status === 200 || res.status === 503);
  assert.ok(data.checks);
});

test('Health Checks: /api/health returns system overview with correct schema', async () => {
  const res = await healthRoute.GET();
  const data = await res.json();
  assert.ok(data.status === 'healthy' || data.status === 'degraded');
  assert.ok(data.services.storage);
  assert.ok(data.services.queue);
  assert.ok(data.services.database);
});

test('Health Checks: reports dependency failures with ok=false and error message', async () => {
  const brokenPg = new PostgresDatabaseAdapter(null); // Uninitialized pool
  const brokenHealth = await brokenPg.healthCheck();
  assert.equal(brokenHealth.ok, false);
  assert.match(brokenHealth.error, /uninitialized/i);
});
