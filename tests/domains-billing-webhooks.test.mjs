import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, isValidDomainFormat } from '../lib/domains/resolver.ts';
import { SUBSCRIPTION_PLANS } from '../lib/billing/plans.ts';
import { signWebhookPayload } from '../lib/webhooks/dispatcher.ts';

test('Custom Domains: normalizer strips protocol, ports, and trailing slash', () => {
  assert.equal(normalizeDomain('https://Store.MyBrand.com/'), 'store.mybrand.com');
  assert.equal(normalizeDomain('http://sub.domain.pk:8080/path'), 'sub.domain.pk');
  assert.equal(normalizeDomain('  shop.acme.co.uk  '), 'shop.acme.co.uk');
});

test('Custom Domains: validates domain format correctly', () => {
  assert.equal(isValidDomainFormat('store.brand.com'), true);
  assert.equal(isValidDomainFormat('shop.brand.pk'), true);
  assert.equal(isValidDomainFormat('my-domain.co.uk'), true);
  assert.equal(isValidDomainFormat('invalid_domain'), false);
  assert.equal(isValidDomainFormat(''), false);
  assert.equal(isValidDomainFormat('http://bad.com'), false);
});

test('Subscription Plans: all 5 tiers defined with progressive quotas', () => {
  const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
  for (const t of tiers) {
    assert.ok(SUBSCRIPTION_PLANS[t], `Missing plan tier ${t}`);
    assert.ok(SUBSCRIPTION_PLANS[t].limits, `Missing limits for ${t}`);
  }

  assert.ok(SUBSCRIPTION_PLANS.starter.limits.maxProducts > SUBSCRIPTION_PLANS.free.limits.maxProducts);
  assert.ok(SUBSCRIPTION_PLANS.professional.limits.maxUsers > SUBSCRIPTION_PLANS.starter.limits.maxUsers);
  assert.ok(SUBSCRIPTION_PLANS.business.limits.maxOrdersPerMonth > SUBSCRIPTION_PLANS.professional.limits.maxOrdersPerMonth);
  assert.equal(SUBSCRIPTION_PLANS.free.limits.customDomains ?? SUBSCRIPTION_PLANS.free.limits.maxCustomDomains, 0);
  assert.ok(SUBSCRIPTION_PLANS.enterprise.limits.maxCustomDomains >= 100);
});

test('Webhooks: signWebhookPayload produces valid HMAC SHA-256 signature', () => {
  const payload = JSON.stringify({ event: 'order.created', total: 100 });
  const secret = 'whsec_test_secret_12345';
  const sig1 = signWebhookPayload(payload, secret);
  const sig2 = signWebhookPayload(payload, secret);

  assert.equal(sig1, sig2);
  assert.equal(sig1.length, 64); // 64 hex characters for SHA-256
  assert.match(sig1, /^[a-f0-9]{64}$/);

  // Different secret produces different signature
  const sigOther = signWebhookPayload(payload, 'whsec_different');
  assert.notEqual(sig1, sigOther);
});
