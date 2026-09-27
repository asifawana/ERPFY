import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

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
              ' get ERPFY_SECRET_KEY() { return "test-secret"; } };',
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

const { getEmailProvider, sendEmail, renderWelcomeTemplate, renderEmailVerificationTemplate } =
  await bundleModule('lib/email/index.ts');

const { authRateLimiter, apiRateLimiter } = await bundleModule('lib/security/rate-limit.ts');

const { validateEnvironmentConfig } = await bundleModule('lib/config/validator.ts');

const { redactSensitiveData } = await bundleModule('lib/logging/index.ts');

/* ------------------------------------------------------------------ *
 * 1. Email System Tests
 * ------------------------------------------------------------------ */
test('Email System: Console provider is default and formats logs cleanly', async () => {
  const provider = getEmailProvider();
  assert.equal(provider.name, 'console');
  assert.equal(provider.isProduction, false);

  const res = await sendEmail({
    to: 'customer@test.com',
    subject: 'Welcome to ERPfy',
    text: 'Your account is ready.',
  });

  assert.equal(res.success, true);
  assert.equal(res.provider, 'console');
  assert.ok(res.id.startsWith('email_console_'));
});

test('Email Templates: Welcome & Verification templates render required parameters', () => {
  const welcome = renderWelcomeTemplate({ name: 'Alice Smith', appUrl: 'https://erpfy.net' });
  assert.match(welcome.subject, /Welcome to ERPfy.net, Alice Smith/);
  assert.match(welcome.html, /Go to My Workspace/);

  const verify = renderEmailVerificationTemplate({
    name: 'Bob',
    verifyUrl: 'https://erpfy.net/verify?token=xyz',
  });
  assert.match(verify.subject, /Verify your ERPfy email/);
  assert.match(verify.text, /https:\/\/erpfy\.net\/verify\?token=xyz/);
});

/* ------------------------------------------------------------------ *
 * 2. Rate Limiting Tests
 * ------------------------------------------------------------------ */
test('Rate Limiter: Sliding window enforces request limits and allows within quota', async () => {
  const key = 'test-ip-127.0.0.1';
  authRateLimiter.reset(key);

  // Consume up to limit (10 for auth)
  for (let i = 0; i < 10; i++) {
    const res = await authRateLimiter.check(key);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
  }

  // 11th request must be rejected
  const blocked = await authRateLimiter.check(key);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetSeconds > 0);

  authRateLimiter.reset(key);
});

/* ------------------------------------------------------------------ *
 * 3. Configuration Validator Tests
 * ------------------------------------------------------------------ */
test('Config Validator: Identifies configured, optional, and missing required variables', () => {
  const devReport = validateEnvironmentConfig({ NODE_ENV: 'development' });
  assert.equal(devReport.environment, 'development');
  // In dev, missing required doesn't fail production readiness
  assert.equal(devReport.isProductionReady, true);

  const prodReportEmpty = validateEnvironmentConfig({ NODE_ENV: 'production' });
  assert.equal(prodReportEmpty.environment, 'production');
  assert.equal(prodReportEmpty.isProductionReady, false);
  assert.ok(prodReportEmpty.summary.missingRequired > 0);

  const prodReportConfigured = validateEnvironmentConfig({
    NODE_ENV: 'production',
    ERPFY_SECRET_KEY: 'test-secret-key-32-chars-long-12345678',
  });
  assert.equal(prodReportConfigured.isProductionReady, true);
  assert.equal(prodReportConfigured.summary.missingRequired, 0);
});

/* ------------------------------------------------------------------ *
 * 4. Logging & Redaction Tests
 * ------------------------------------------------------------------ */
test('Logging: Sensitive fields are properly redacted from log metadata', () => {
  const payload = {
    user: 'admin@erpfy.test',
    password: 'super-secret-password-123',
    apiKey: 'sk_live_abcdef123456',
    nested: {
      creditCard: '4111222233334444',
      token: 'session_token_xyz',
      city: 'Karachi',
    },
  };

  const redacted = redactSensitiveData(payload);
  assert.equal(redacted.user, 'admin@erpfy.test');
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.nested.creditCard, '[REDACTED]');
  assert.equal(redacted.nested.token, '[REDACTED]');
  assert.equal(redacted.nested.city, 'Karachi');
});
