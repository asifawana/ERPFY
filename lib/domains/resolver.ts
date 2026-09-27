import type { D1Database } from '@cloudflare/workers-types';
import type { CustomDomainRecord, DomainVerificationResult } from './types.ts';
import { randomUUID } from 'crypto';

interface CompanySettingsPayload {
  customDomains?: CustomDomainRecord[];
  ecommerceStore?: {
    customDomain?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Normalizes host/domain name (strips protocol, port, trailing slash).
 */
export function normalizeDomain(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split(':')[0];
  return cleaned;
}

/**
 * Validates domain format (FQDN).
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain || domain.length < 3 || domain.length > 253) return false;
  // Standard domain regex: labels separated by dots, each label 1-63 chars, alnum and hyphens
  const fqdnRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
  return fqdnRegex.test(domain);
}

/**
 * Fetches all custom domain records configured for a company.
 */
export async function getCompanyDomains(
  db: D1Database,
  companyId: string,
): Promise<CustomDomainRecord[]> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!row?.data) return [];
  try {
    const parsed = JSON.parse(row.data) as CompanySettingsPayload;
    return parsed.customDomains || [];
  } catch {
    return [];
  }
}

/**
 * Adds a new custom domain for a company in 'pending' status.
 */
export async function addCustomDomain(
  db: D1Database,
  companyId: string,
  rawDomain: string,
): Promise<{ success: boolean; record?: CustomDomainRecord; error?: string }> {
  const domain = normalizeDomain(rawDomain);

  if (!isValidDomainFormat(domain)) {
    return { success: false, error: 'Invalid domain format. Example: store.yourbrand.com' };
  }

  // Check if domain is already registered anywhere in any company's settings
  const existingRows = await db
    .prepare(
      `SELECT company_id, data FROM core_company_settings
       WHERE data LIKE ?1`,
    )
    .bind(`%"${domain}"%`)
    .all<{ company_id: string; data: string }>();

  for (const row of existingRows.results || []) {
    try {
      const parsed = JSON.parse(row.data) as CompanySettingsPayload;
      const domains = parsed.customDomains || [];
      if (domains.some((d) => d.domain === domain)) {
        if (row.company_id === companyId) {
          return { success: false, error: 'This domain is already registered to your account.' };
        } else {
          return { success: false, error: 'This domain is already in use by another tenant.' };
        }
      }
    } catch {
      // Continue check
    }
  }

  // Load current company domains
  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  const now = new Date().toISOString();
  let settingsDoc: CompanySettingsPayload = {};
  if (settingsRow?.data) {
    try {
      settingsDoc = JSON.parse(settingsRow.data);
    } catch {
      settingsDoc = {};
    }
  }

  const existingList: CustomDomainRecord[] = settingsDoc.customDomains || [];
  const isApex = domain.split('.').length === 2;
  const baseDomain = (process.env.PLATFORM_DOMAIN || 'erpfy.net').trim().toLowerCase();

  const newRecord: CustomDomainRecord = {
    id: `dom_${randomUUID().slice(0, 12)}`,
    companyId,
    domain,
    isPrimary: existingList.length === 0, // First domain is primary by default
    status: 'pending',
    sslStatus: 'pending',
    dnsRecordType: isApex ? 'A' : 'CNAME',
    dnsExpectedValue: isApex ? (process.env.APEX_IP_TARGET || '76.76.21.21') : `cname.${baseDomain}`,
    verificationToken: `erpfy-verify-${randomUUID().slice(0, 16)}`,
    createdAt: now,
    updatedAt: now,
  };

  existingList.push(newRecord);
  settingsDoc.customDomains = existingList;

  const company = await db
    .prepare('SELECT created_by FROM core_companies WHERE id = ?1 LIMIT 1')
    .bind(companyId)
    .first<{ created_by: string }>();
  const actorId = company?.created_by || 'acc_admin';
  const timestamp = Date.now();

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (company_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(companyId, JSON.stringify(settingsDoc), timestamp, actorId)
    .run();

  return { success: true, record: newRecord };
}

import { getDomainProvider } from './providers.ts';

/**
 * Performs DNS verification and SSL provisioning for a domain using configured provider adapter.
 * Supports Local Development, Cloudflare for SaaS, and Caddy On-Demand TLS.
 */
export async function verifyCustomDomain(
  db: D1Database,
  companyId: string,
  domainId: string,
): Promise<DomainVerificationResult> {
  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!settingsRow?.data) {
    return {
      verified: false,
      message: 'Company settings not found.',
      dnsRecordType: 'CNAME',
      expectedValue: 'cname.erpfy.net',
      sslReady: false,
    };
  }

  let settingsDoc: CompanySettingsPayload;
  try {
    settingsDoc = JSON.parse(settingsRow.data);
  } catch {
    return {
      verified: false,
      message: 'Failed to read company settings.',
      dnsRecordType: 'CNAME',
      expectedValue: 'cname.erpfy.net',
      sslReady: false,
    };
  }

  const list: CustomDomainRecord[] = settingsDoc.customDomains || [];
  const targetIndex = list.findIndex((d) => d.id === domainId);

  if (targetIndex === -1) {
    return {
      verified: false,
      message: 'Domain record not found.',
      dnsRecordType: 'CNAME',
      expectedValue: 'cname.erpfy.net',
      sslReady: false,
    };
  }

  const record = list[targetIndex];
  const provider = getDomainProvider();

  // 1. Verify DNS through the provider adapter
  const dnsResult = await provider.verifyDns(
    record.domain,
    record.dnsRecordType,
    record.dnsExpectedValue,
    record.verificationToken,
  );

  const now = new Date().toISOString();
  record.provider = provider.name;
  record.isProduction = provider.isProduction;
  record.updatedAt = now;

  if (!dnsResult.verified) {
    record.status = 'failed';
    record.sslStatus = 'pending';
    record.dnsCurrentValue = dnsResult.currentValue;

    list[targetIndex] = record;
    settingsDoc.customDomains = list;

    await db
      .prepare(`UPDATE core_company_settings SET data = ?1, updated_at = ?2 WHERE company_id = ?3`)
      .bind(JSON.stringify(settingsDoc), Date.now(), companyId)
      .run();

    return {
      verified: false,
      message: dnsResult.message,
      dnsRecordType: record.dnsRecordType,
      expectedValue: record.dnsExpectedValue,
      currentValue: dnsResult.currentValue,
      sslReady: false,
      provider: provider.name,
      isProduction: provider.isProduction,
    };
  }

  // 2. DNS verified — provision SSL through the provider adapter
  const sslResult = await provider.provisionSsl(record.domain);
  record.status = 'verified';
  record.sslStatus = sslResult.sslStatus;
  record.verifiedAt = now;
  record.dnsCurrentValue = dnsResult.currentValue || record.dnsExpectedValue;

  // Sync with ecommerceStore.customDomain if primary
  if (record.isPrimary) {
    if (!settingsDoc.ecommerceStore) {
      settingsDoc.ecommerceStore = {};
    }
    settingsDoc.ecommerceStore.customDomain = record.domain;
  }

  list[targetIndex] = record;
  settingsDoc.customDomains = list;

  await db
    .prepare(`UPDATE core_company_settings SET data = ?1, updated_at = ?2 WHERE company_id = ?3`)
    .bind(JSON.stringify(settingsDoc), Date.now(), companyId)
    .run();

  return {
    verified: true,
    message: `${dnsResult.message} ${sslResult.message}`,
    dnsRecordType: record.dnsRecordType,
    expectedValue: record.dnsExpectedValue,
    currentValue: record.dnsCurrentValue,
    sslReady: record.sslStatus === 'active',
    provider: provider.name,
    isProduction: provider.isProduction,
  };
}

/**
 * Removes a custom domain record.
 */
export async function removeCustomDomain(
  db: D1Database,
  companyId: string,
  domainId: string,
): Promise<{ success: boolean; error?: string }> {
  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!settingsRow?.data) return { success: false, error: 'Not found' };

  let settingsDoc: CompanySettingsPayload;
  try {
    settingsDoc = JSON.parse(settingsRow.data);
  } catch {
    return { success: false, error: 'Corrupt settings' };
  }

  let list: CustomDomainRecord[] = settingsDoc.customDomains || [];
  const removed = list.find((d) => d.id === domainId);
  list = list.filter((d) => d.id !== domainId);

  // If removed domain was primary, designate next verified or first domain
  if (removed?.isPrimary && list.length > 0) {
    const nextVerified = list.find((d) => d.status === 'verified') || list[0];
    nextVerified.isPrimary = true;
    if (settingsDoc.ecommerceStore) {
      settingsDoc.ecommerceStore.customDomain = nextVerified.domain;
    }
  } else if (list.length === 0 && settingsDoc.ecommerceStore) {
    delete settingsDoc.ecommerceStore.customDomain;
  }

  settingsDoc.customDomains = list;

  await db
    .prepare(
      `UPDATE core_company_settings
       SET data = ?1, updated_at = ?2
       WHERE company_id = ?3`,
    )
    .bind(JSON.stringify(settingsDoc), Date.now(), companyId)
    .run();

  return { success: true };
}

/**
 * Resolves an incoming host or domain to its tenant company.
 */
export async function resolveTenantByDomain(
  db: D1Database,
  rawHost: string,
): Promise<{ companyId: string; slug: string; name: string } | null> {
  const host = normalizeDomain(rawHost);

  // Platform root domains are system entrypoints, not tenant stores
  const baseDomain = (process.env.PLATFORM_DOMAIN || 'erpfy.net').trim().toLowerCase();
  const systemHosts = new Set([
    baseDomain,
    `www.${baseDomain}`,
    `app.${baseDomain}`,
    `api.${baseDomain}`,
    'localhost',
    '127.0.0.1',
  ]);
  if (systemHosts.has(host)) {
    return null;
  }

  // 1. Direct subdomain check: e.g. acme.erpfy.net or acme.[PLATFORM_DOMAIN]
  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1));
    const reserved = ['www', 'app', 'api', 'admin', 'auth', 'mail', 'smtp', 'cdn', 'static', 'assets', 'ws'];
    if (!reserved.includes(sub)) {
      const company = await db
        .prepare(`SELECT id, slug, name FROM core_companies WHERE slug = ?1 LIMIT 1`)
        .bind(sub)
        .first<{ id: string; slug: string; name: string }>();
      if (company) {
        return { companyId: company.id, slug: company.slug, name: company.name };
      }
    }
  }

  // 2. Custom domain match in company settings
  const rows = await db
    .prepare(
      `SELECT c.id, c.slug, c.name, s.data
       FROM core_companies c
       JOIN core_company_settings s ON s.company_id = c.id
       WHERE s.data LIKE ?1`,
    )
    .bind(`%"${host}"%`)
    .all<{ id: string; slug: string; name: string; data: string }>();

  for (const row of rows.results || []) {
    try {
      const doc = JSON.parse(row.data) as CompanySettingsPayload;
      const domains = doc.customDomains || [];
      const match = domains.find((d) => d.domain === host && d.status === 'verified');
      if (match) {
        return { companyId: row.id, slug: row.slug, name: row.name };
      }
      if (doc.ecommerceStore?.customDomain === host) {
        return { companyId: row.id, slug: row.slug, name: row.name };
      }
    } catch {
      // Continue
    }
  }

  return null;
}
