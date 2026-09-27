import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let sqlite;

class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }

  bind(...args) {
    return new Statement(this.sql, args);
  }

  async first() {
    return sqlite.prepare(this.sql).get(...this.args) || null;
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
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
};

const TEST_SECRET = 'erpfy-test-platform-master-key-0123456789abcdef';
globalThis.__erpTestDB = db;
globalThis.__erpTestSecretKey = TEST_SECRET;

async function route(path) {
  const output = await build({
    entryPoints: [path],
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
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
  );
}

const eap = await route('lib/eap/index.ts');

const COMPANY_A = 'comp_alpha_111';
const COMPANY_B = 'comp_beta_222';
const ACCOUNT_ID = 'acc_tester_999';

beforeEach(() => {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(
    readFileSync('drizzle/0000_core_baseline.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0001_auth.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0006_settings.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0007_authority_foundation.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0008_developer_platform_eap.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );

  const now = Date.now();

  // Seed user
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(ACCOUNT_ID, 'developer@erpfy.test', 'Dev Tester', 'UTC', now, now);

  // Seed Company A & Company B
  const insertCompany = sqlite.prepare(
    `INSERT INTO core_companies
      (id, name, slug, country_code, currency, timezone, language, sector_slug,
       industry_slug, business_models, employee_band, plan, state, trial_ends_at,
       onboarding_state, onboarding_steps, created_at, created_by, request_key)
     VALUES (?, ?, ?, 'PK', 'PKR', 'UTC', 'en', '', '', '[]', '', 'starter', 'trial', ?,
             'completed', '{}', ?, ?, ?)`,
  );
  insertCompany.run(COMPANY_A, 'Alpha Corp', 'alpha-corp', now + 86400000, now, ACCOUNT_ID, 'req-alpha');
  insertCompany.run(COMPANY_B, 'Beta Corp', 'beta-corp', now + 86400000, now, ACCOUNT_ID, 'req-beta');

  // Memberships
  const insertMember = sqlite.prepare(
    `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
     VALUES (?, ?, ?, 'active', '', ?)`,
  );
  insertMember.run(COMPANY_A, ACCOUNT_ID, 'owner', now);
  insertMember.run(COMPANY_B, ACCOUNT_ID, 'owner', now);

  // Developer Organization
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('dev_org_1', 'Erpfy Verified Devs', 'verified-devs', 'verified', ?)`,
    )
    .run(now);

  // Products table for testing tenant repository isolation
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS products (
       id text PRIMARY KEY NOT NULL,
       company_id text NOT NULL,
       name text NOT NULL,
       sku text NOT NULL,
       price_cents integer NOT NULL,
       status text NOT NULL,
       created_at integer NOT NULL,
       updated_at integer NOT NULL
     );`,
  );
});

/**
 * Helper to register, approve, sign and publish a plugin release.
 */
function seedPublishedPlugin({
  appId = 'app_payroll_pro',
  slug = 'payroll-pro',
  name = 'Payroll Pro ERP',
  version = '1.0.0',
  permissions = ['payroll.read', 'payroll.calculate'],
  platform = { id: 'erpfy', protocol: 'eap-v1' },
  isKilled = 0,
  tamperSignature = false,
  codeFiles = { 'index.js': 'export default function() {}' },
} = {}) {
  const now = Date.now();

  // Create app record
  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, category, icon_url, official_app, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      appId,
      'dev_org_1',
      slug,
      name,
      'Locked Payroll System',
      'Finance',
      '/icons/payroll.png',
      1,
      'published',
      isKilled,
      ACCOUNT_ID,
      now,
      now,
    );

  const manifest = {
    protocol: 'eap-v1',
    app_id: appId,
    name,
    slug,
    version,
    minimum_platform_version: '1.0.0',
    developer_id: 'dev_org_1',
    platform,
    permissions,
  };

  const manifestJson = JSON.stringify(manifest);
  const packageHash = eap.computePackageHash(manifestJson, codeFiles);
  const release = eap.signReleaseBuild(appId, version, packageHash, TEST_SECRET);

  const versionId = `ver_${crypto.randomBytes(8).toString('hex')}`;
  sqlite
    .prepare(
      `INSERT INTO eap_app_versions
        (id, app_id, version, manifest_json, package_hash, signature, release_id, review_status, approved_at, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      versionId,
      appId,
      version,
      manifestJson,
      packageHash,
      tamperSignature ? 'tampered_bad_signature_deadbeef' : release.signature,
      release.releaseId,
      'published',
      release.signedAt,
      release.signedAt,
      release.signedAt,
    );

  return { appId, versionId, version, manifest, release, packageHash };
}

// ============================================================================
// 1. ERPFY PLATFORM BINDING & MANIFEST CHECKS
// ============================================================================

test('1. Valid ERPFY platform manifest validates successfully', () => {
  const manifest = eap.validateEapManifest({
    protocol: 'eap-v1',
    app_id: 'app_test_1',
    name: 'Test Plugin',
    slug: 'test-plugin',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    permissions: ['reports.read'],
    platform: {
      id: 'erpfy',
      protocol: 'eap-v1',
      minimum_platform_version: '1.0.0',
    },
  });

  assert.equal(manifest.platform?.id, 'erpfy');
  assert.equal(manifest.platform?.protocol, 'eap-v1');
});

test('2. Wrong platform ID (e.g. standalone or laravel) is strictly rejected', () => {
  assert.throws(
    () => {
      eap.validateEapManifest({
        protocol: 'eap-v1',
        app_id: 'app_bad_plat',
        name: 'Bad Plugin',
        slug: 'bad-plugin',
        version: '1.0.0',
        minimum_platform_version: '1.0.0',
        permissions: ['reports.read'],
        platform: {
          id: 'laravel-packal',
          protocol: 'eap-v1',
        },
      });
    },
    (err) => {
      assert.match(err.message, /Manifest platform\.id must be 'erpfy'/);
      return true;
    },
  );
});

// ============================================================================
// 2. SIGNED RELEASE REQUIRED
// ============================================================================

test('3. Unsigned or tampered plugin release is rejected at installation', async () => {
  const { appId } = seedPublishedPlugin({
    appId: 'app_tampered',
    tamperSignature: true,
  });

  await assert.rejects(
    async () => {
      await eap.installTenantApp(db, {
        companyId: COMPANY_A,
        appId,
        accountId: ACCOUNT_ID,
        grantedPermissions: ['payroll.read', 'payroll.calculate'],
      });
    },
    (err) => {
      assert.match(err.message, /Cryptographic verification failed: tampered release/);
      return true;
    },
  );
});

// ============================================================================
// 3. PLATFORM RUNTIME TOKEN
// ============================================================================

test('4. Platform issues short-lived, verifiable runtime token binding company, plugin and installation', () => {
  const tokenData = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  assert.ok(tokenData.token.startsWith('erpfy_rt.'));
  assert.equal(tokenData.payload.platform, 'erpfy');
  assert.equal(tokenData.payload.companyId, COMPANY_A);
  assert.equal(tokenData.payload.pluginId, 'app_payroll_pro');

  // Verify valid token
  const verified = eap.verifyPluginRuntimeToken(tokenData.token, {
    companyId: COMPANY_A,
    pluginId: 'app_payroll_pro',
    installationId: 'inst_abc123',
    pluginVersion: '1.0.0',
    capability: 'payroll.calculate',
  });
  assert.equal(verified.companyId, COMPANY_A);
});

test('5. Invalid or forged runtime token is rejected', () => {
  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken('erpfy_rt.invalidPayload.invalidSignature');
    },
    (err) => {
      assert.match(err.message, /Cryptographic token verification failed/);
      return true;
    },
  );
});

test('6. Expired runtime token is rejected', () => {
  const expiredToken = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
    ttlMs: -1000, // already expired
  });

  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(expiredToken.token);
    },
    (err) => {
      assert.match(err.message, /expired/);
      return true;
    },
  );
});

test('7. Token issued for Company A is rejected when used on Company B (Tenant Isolation)', () => {
  const tokenA = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(tokenA.token, {
        companyId: COMPANY_B,
      });
    },
    (err) => {
      assert.match(err.message, /Tenant Isolation Violation/);
      return true;
    },
  );
});

// ============================================================================
// 4. INSTALLATION ID BINDING & EXECUTION PREFLIGHT
// ============================================================================

test('8. Plugin installs successfully inside ERPFY and acquires installation record', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_valid_1' });

  const installation = await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });

  assert.ok(installation.installationId);
  assert.equal(installation.status, 'installed');
  assert.equal(installation.appId, appId);
});

test('9. Copied plugin without installation record CANNOT execute (fails closed)', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_uninstalled_copy' });

  await assert.rejects(
    async () => {
      await eap.verifyPluginExecutionPreflight(db, {
        companyId: COMPANY_A,
        appId,
        capability: 'payroll.calculate',
      });
    },
    (err) => {
      assert.match(err.message, /No installation record found/);
      return true;
    },
  );
});

test('10. Plugin cannot use another company\'s installation ID (Cross-Tenant Theft Prevention)', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_shared' });

  // Install in Company A
  await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });

  // Try to execute inside Company B using installA's record
  await assert.rejects(
    async () => {
      await eap.verifyPluginExecutionPreflight(db, {
        companyId: COMPANY_B,
        appId,
        capability: 'payroll.calculate',
      });
    },
    (err) => {
      assert.match(err.message, /No installation record found/);
      return true;
    },
  );
});

test('11. Disabled plugin is blocked from execution', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_disabled_test' });

  await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });

  // Disable installation
  sqlite
    .prepare(`UPDATE eap_app_installations SET status = 'disabled' WHERE company_id = ? AND app_id = ?`)
    .run(COMPANY_A, appId);

  await assert.rejects(
    async () => {
      await eap.verifyPluginExecutionPreflight(db, {
        companyId: COMPANY_A,
        appId,
        capability: 'payroll.calculate',
      });
    },
    (err) => {
      assert.match(err.message, /Plugin installation is not active/);
      return true;
    },
  );
});

test('12. Globally revoked (killed) plugin is blocked from execution immediately', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_killswitch_test' });

  await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });

  // Trip platform emergency killswitch
  sqlite.prepare(`UPDATE eap_apps SET is_killed = 1 WHERE id = ?`).run(appId);

  await assert.rejects(
    async () => {
      await eap.verifyPluginExecutionPreflight(db, {
        companyId: COMPANY_A,
        appId,
        capability: 'payroll.calculate',
      });
    },
    (err) => {
      assert.match(err.message, /globally revoked by ERPFY platform security/);
      return true;
    },
  );
});

// ============================================================================
// 5. NO STANDALONE BOOTSTRAP & PLATFORM SDK CONTRACT
// ============================================================================

test('13. Plugin fails safely if bootstrapped standalone outside ERPFY runtime', async () => {
  const plugin = eap.defineErpfyPlugin({
    manifest: {
      protocol: 'eap-v1',
      app_id: 'app_standalone_test',
      name: 'Standalone Test',
      slug: 'standalone-test',
      version: '1.0.0',
      minimum_platform_version: '1.0.0',
      developer_id: 'dev_1',
      permissions: ['payroll.read'],
    },
    capabilities: {
      async calculateTax() {
        return { tax: 150 };
      },
    },
  });

  // Attempt standalone call without ERPFY context:
  await assert.rejects(
    async () => {
      // @ts-expect-error simulating standalone call without platform
      await plugin.execute('calculateTax', null, {});
    },
    (err) => {
      assert.match(err.message, /missing official ERPFY runtime context/);
      return true;
    },
  );

  // Attempt standalone call with fake context:
  await assert.rejects(
    async () => {
      // @ts-expect-error simulating non-erpfy platform context
      await plugin.execute('calculateTax', { platform: 'laravel' }, {});
    },
    (err) => {
      assert.match(err.message, /missing official ERPFY runtime context/);
      return true;
    },
  );
});

// ============================================================================
// 6. NO DIRECT DATABASE ACCESS & TENANT SCOPED DATA
// ============================================================================

test('14. Full locked runtime capability execution: data is strictly tenant-scoped with no raw DB access', async () => {
  const { appId } = seedPublishedPlugin({ appId: 'app_tax_calc' });

  // Install app
  await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });

  // Seed product in Company A and Company B
  sqlite
    .prepare(
      `INSERT INTO products (id, company_id, name, sku, price_cents, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'prod_a', COMPANY_A, 'Alpha Widget', 'SKU-A', 5000, 'active', Date.now(), Date.now(),
      'prod_b', COMPANY_B, 'Beta Secret Widget', 'SKU-B', 99000, 'active', Date.now(), Date.now(),
    );

  const taxPlugin = eap.defineErpfyPlugin({
    manifest: {
      protocol: 'eap-v1',
      app_id: appId,
      name: 'Tax Calculator',
      slug: 'tax-calc',
      version: '1.0.0',
      minimum_platform_version: '1.0.0',
      developer_id: 'dev_org_1',
      permissions: ['payroll.calculate'],
    },
    capabilities: {
      async 'payroll.calculate'(ctx, payload) {
        // Plugin accesses data ONLY through tenant-scoped repository
        const products = await ctx.repositories.products.findMany();
        return {
          calculatedBy: ctx.pluginId,
          companyId: ctx.companyId,
          productsFound: products.length,
          productNames: products.map((p) => p.name),
          totalTax: payload.amount * 0.15,
        };
      },
    },
  });

  const { result, runtimeToken } = await eap.executePluginCapability(db, {
    companyId: COMPANY_A,
    appId,
    capability: 'payroll.calculate',
    payload: { amount: 1000 },
    plugin: taxPlugin,
  });

  assert.ok(runtimeToken);
  assert.equal(result.companyId, COMPANY_A);
  assert.equal(result.totalTax, 150);
  assert.equal(result.productsFound, 1);
  assert.deepEqual(result.productNames, ['Alpha Widget']); // Only sees Company A!
});

// ============================================================================
// 7. PRIVATE PLUGIN LICENSING ENTITLEMENT
// ============================================================================

test('15. Private plugin restricted to Company A is blocked from installing in Company B', async () => {
  const { appId } = seedPublishedPlugin({
    appId: 'app_private_vip',
    platform: {
      id: 'erpfy',
      protocol: 'eap-v1',
      allowed_companies: [COMPANY_A], // ONLY COMPANY A is authorized!
    },
  });

  // Installation in Company A succeeds:
  const installA = await eap.installTenantApp(db, {
    companyId: COMPANY_A,
    appId,
    accountId: ACCOUNT_ID,
    grantedPermissions: ['payroll.read', 'payroll.calculate'],
  });
  assert.equal(installA.status, 'installed');

  // Installation in Company B is DENIED:
  await assert.rejects(
    async () => {
      await eap.installTenantApp(db, {
        companyId: COMPANY_B,
        appId,
        accountId: ACCOUNT_ID,
        grantedPermissions: ['payroll.read', 'payroll.calculate'],
      });
    },
    (err) => {
      assert.match(err.message, /Entitlement Denied/);
      return true;
    },
  );
});

// ============================================================================
// 8. PHASE 6A.2 — LOCKED RUNTIME TRUST HARDENING & ADVANCED REGRESSION
// ============================================================================

test('16. Client cannot mint extra capability: effective capabilities are strictly intersected', () => {
  const effective = eap.deriveEffectiveCapabilities({
    manifestPermissions: ['payroll.read', 'payroll.calculate'],
    installedPermissions: ['payroll.read'],
    requestedCapabilities: ['payroll.read', 'admin.grant', 'payroll.calculate'],
  });

  // Client cannot expand authority; only approved manifest & installed permission persists
  assert.deepEqual(effective, ['payroll.read']);
});

test('17. Requested capability outside manifest is denied', () => {
  const effective = eap.deriveEffectiveCapabilities({
    manifestPermissions: ['payroll.read'],
    installedPermissions: ['payroll.read', 'inventory.write'],
    requestedCapabilities: ['inventory.write'],
  });

  // Even if requested or installed, if outside manifest, it evaluates to empty
  assert.deepEqual(effective, []);
});

test('18. Requested capability outside authenticated user RBAC is denied', () => {
  const effective = eap.deriveEffectiveCapabilities({
    manifestPermissions: ['payroll.read', 'payroll.calculate'],
    installedPermissions: ['payroll.read', 'payroll.calculate'],
    userPermissions: ['payroll.read'], // User lacks payroll.calculate
    requestedCapabilities: ['payroll.calculate'],
  });

  assert.deepEqual(effective, []);
});

test('19. Token with wrong or missing issuer is strictly denied', () => {
  // Issue token then forge issuer claim
  const tokenData = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  // Verification with expectedIssuer mismatch
  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(tokenData.token, {
        expectedIssuer: 'unauthorized-platform',
      });
    },
    (err) => {
      assert.match(err.message, /Token issuer mismatch/);
      return true;
    },
  );
});

test('20. Token with wrong or missing audience is strictly denied', () => {
  const tokenData = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(tokenData.token, {
        expectedAudience: 'public-external-browser',
      });
    },
    (err) => {
      assert.match(err.message, /Token audience mismatch/);
      return true;
    },
  );
});

test('21. Token with wrong plugin ID or version is strictly denied', () => {
  const tokenData = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  // Plugin mismatch
  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(tokenData.token, {
        pluginId: 'app_imposter_plugin',
      });
    },
    (err) => {
      assert.match(err.message, /Plugin Identity Violation/);
      return true;
    },
  );

  // Version mismatch
  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(tokenData.token, {
        pluginVersion: '2.0.0',
      });
    },
    (err) => {
      assert.match(err.message, /Version Mismatch/);
      return true;
    },
  );
});

test('22. Token issued in the future beyond safe clock skew (> 60s) is rejected', () => {
  const futureToken = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
    issuedAtOffsetMs: 90 * 1000, // 90 seconds in the future
  });

  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(futureToken.token);
    },
    (err) => {
      assert.match(err.message, /Token issued in the future beyond allowable clock skew/);
      return true;
    },
  );
});

test('23. Token replay prevention: one-shot high-risk operations cannot reuse jti', async () => {
  const tokenData = eap.issuePluginRuntimeToken({
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
  });

  const jti = tokenData.payload.jti;
  assert.ok(jti.startsWith('jti_'));

  // First consumption succeeds
  const firstUse = await eap.consumeOneShotToken(jti);
  assert.equal(firstUse, true);

  // Replay attempt fails
  const secondUse = await eap.consumeOneShotToken(jti);
  assert.equal(secondUse, false);
});

test('24. Release signature verified against actual package hash & hash tampering rejected', async () => {
  const { appId, version, release } = seedPublishedPlugin({ appId: 'app_hash_check' });

  // Authentic signature verifies against true hash
  const isValid = eap.verifyReleaseSignature(
    appId,
    version,
    release.packageHash,
    release.signedAt,
    release.releaseId,
    release.signature,
    TEST_SECRET,
  );
  assert.equal(isValid, true);

  // Tampered hash fails verification
  const tamperedHash = crypto.createHash('sha256').update('malicious_content').digest('hex');
  const isTamperedValid = eap.verifyReleaseSignature(
    appId,
    version,
    tamperedHash,
    release.signedAt,
    release.releaseId,
    release.signature,
    TEST_SECRET,
  );
  assert.equal(isTamperedValid, false);
});

test('25. Version substitution rejected cryptographically', () => {
  const { appId, release } = seedPublishedPlugin({
    appId: 'app_version_sub',
    version: '1.0.0',
  });

  // Attempt to use release signature from 1.0.0 for version 1.0.1
  const isSubstitutedValid = eap.verifyReleaseSignature(
    appId,
    '1.0.1',
    release.packageHash,
    release.signedAt,
    release.releaseId,
    release.signature,
    TEST_SECRET,
  );
  assert.equal(isSubstitutedValid, false);
});

test('26. Key separation: runtime-token key cannot verify or forge release signatures', () => {
  const appId = 'app_key_sep_1';
  const version = '1.0.0';
  const packageHash = crypto.createHash('sha256').update('test_pkg').digest('hex');
  const releaseId = 'rel_test_123';
  const signedAt = Date.now();

  // Attacker has compromised the runtime-token derived key
  const runtimeTokenKey = eap.getDerivedPlatformSecretHex(TEST_SECRET, 'runtime-token');

  // Attacker crafts HMAC signature using runtime-token key
  const forgedHmac = crypto.createHmac('sha256', runtimeTokenKey);
  forgedHmac.update(`erpfy:eap-v1:${appId}:${version}:${packageHash}:${signedAt}:${releaseId}`);
  const forgedSig = forgedHmac.digest('hex');

  // Server verifies release signature using platform master secret
  const verifies = eap.verifyReleaseSignature(
    appId,
    version,
    packageHash,
    signedAt,
    releaseId,
    forgedSig,
    TEST_SECRET,
  );
  assert.equal(verifies, false, 'Runtime-token key compromise must NOT permit release signing');
});

test('27. Key separation: release-signing key cannot forge runtime tokens', () => {
  const releaseSigningKey = eap.getDerivedPlatformSecretHex(TEST_SECRET, 'release-signing');

  // Attacker attempts to forge a runtime token using release-signing key
  const payload = {
    iss: 'erpfy',
    aud: 'erpfy-plugin-runtime',
    platform: 'erpfy',
    pluginId: 'app_payroll_pro',
    pluginVersion: '1.0.0',
    installationId: 'inst_abc123',
    companyId: COMPANY_A,
    allowedCapabilities: ['payroll.calculate'],
    issuedAt: Date.now(),
    expiresAt: Date.now() + 600000,
    jti: 'jti_forged_999',
    nonce: 'nonce_fake',
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', releaseSigningKey);
  hmac.update(`erpfy_rt_v2:${encodedPayload}`);
  const forgedSig = hmac.digest('hex');
  const forgedToken = `erpfy_rt.${encodedPayload}.${forgedSig}`;

  // Server verifies runtime token using master secret
  assert.throws(
    () => {
      eap.verifyPluginRuntimeToken(forgedToken);
    },
    (err) => {
      assert.match(err.message, /Cryptographic token verification failed/);
      return true;
    },
  );
});

test('28. Copied plugin still cannot execute without installation and runtime authority', async () => {
  const copiedPlugin = eap.defineErpfyPlugin({
    manifest: {
      protocol: 'eap-v1',
      app_id: 'app_pirated_copy',
      name: 'Pirated Plugin',
      slug: 'pirated-plugin',
      version: '1.0.0',
      minimum_platform_version: '1.0.0',
      permissions: ['payroll.calculate'],
    },
    capabilities: {
      async 'payroll.calculate'() {
        return { success: true };
      },
    },
  });

  // 1. Standalone call fails closed
  await assert.rejects(
    async () => {
      // @ts-expect-error simulating standalone call without platform
      await copiedPlugin.execute('payroll.calculate', null, {});
    },
    (err) => {
      assert.match(err.message, /missing official ERPFY runtime context/);
      return true;
    },
  );

  // 2. Preflight execution check fails closed (no installation record)
  await assert.rejects(
    async () => {
      await eap.executePluginCapability(db, {
        companyId: COMPANY_A,
        appId: 'app_pirated_copy',
        capability: 'payroll.calculate',
        payload: {},
        plugin: copiedPlugin,
      });
    },
    (err) => {
      assert.match(err.message, /No installation record found/);
      return true;
    },
  );
});
