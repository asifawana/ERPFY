import type { D1Database } from '@cloudflare/workers-types';
import { createHmac, randomBytes, randomUUID } from 'crypto';

export interface WebhookEndpoint {
  id: string;
  companyId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeliveredAt?: string;
  lastStatusCode?: number;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  signature: string;
  statusCode?: number;
  success: boolean;
  error?: string;
  deliveredAt: string;
}

interface CompanySettingsPayload {
  webhooks?: WebhookEndpoint[];
  [key: string]: unknown;
}

/**
 * Sign payload with HMAC SHA-256
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Retrieves all registered webhooks for a company.
 */
export async function getCompanyWebhooks(
  db: D1Database,
  companyId: string,
): Promise<WebhookEndpoint[]> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!row?.data) return [];
  try {
    const parsed = JSON.parse(row.data) as CompanySettingsPayload;
    return parsed.webhooks || [];
  } catch {
    return [];
  }
}

/**
 * Registers a new webhook endpoint.
 */
export async function registerWebhook(
  db: D1Database,
  companyId: string,
  url: string,
  events: string[],
): Promise<{ success: boolean; webhook?: WebhookEndpoint; error?: string }> {
  try {
    new URL(url);
  } catch {
    return { success: false, error: 'Invalid webhook URL' };
  }

  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  let doc: CompanySettingsPayload = {};
  if (settingsRow?.data) {
    try {
      doc = JSON.parse(settingsRow.data);
    } catch {
      doc = {};
    }
  }

  const existing: WebhookEndpoint[] = doc.webhooks || [];
  const now = new Date().toISOString();

  const endpoint: WebhookEndpoint = {
    id: `whk_${randomUUID().slice(0, 12)}`,
    companyId,
    url,
    secret: `whsec_${randomBytes(24).toString('hex')}`,
    events: events && events.length > 0 ? events : ['*'],
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  existing.push(endpoint);
  doc.webhooks = existing;

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
    .bind(companyId, JSON.stringify(doc), timestamp, actorId)
    .run();

  return { success: true, webhook: endpoint };
}

/**
 * Deletes a webhook endpoint.
 */
export async function deleteWebhook(
  db: D1Database,
  companyId: string,
  webhookId: string,
): Promise<{ success: boolean }> {
  const settingsRow = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1 LIMIT 1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!settingsRow?.data) return { success: true };
  let doc: CompanySettingsPayload;
  try {
    doc = JSON.parse(settingsRow.data);
  } catch {
    return { success: true };
  }

  doc.webhooks = (doc.webhooks || []).filter((w) => w.id !== webhookId);
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE core_company_settings SET data = ?1, updated_at = ?2 WHERE company_id = ?3`,
    )
    .bind(JSON.stringify(doc), Date.now(), companyId)
    .run();

  return { success: true };
}

/**
 * Dispatches a webhook event asynchronously to all matching subscriber endpoints.
 */
export async function dispatchWebhook(
  db: D1Database,
  companyId: string,
  event: string,
  payloadData: unknown,
): Promise<WebhookDeliveryLog[]> {
  const endpoints = await getCompanyWebhooks(db, companyId);
  const results: WebhookDeliveryLog[] = [];
  const now = new Date().toISOString();

  const matching = endpoints.filter(
    (ep) => ep.active && (ep.events.includes('*') || ep.events.includes(event)),
  );

  for (const ep of matching) {
    const bodyStr = JSON.stringify({
      id: `evt_${randomUUID().slice(0, 12)}`,
      event,
      timestamp: now,
      companyId,
      data: payloadData,
    });

    const signature = signWebhookPayload(bodyStr, ep.secret);

    let statusCode: number | undefined;
    let success = false;
    let errorMsg: string | undefined;

    try {
      const response = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ERPfy-Webhook-Dispatcher/1.0',
          'X-ERPfy-Event': event,
          'X-ERPfy-Signature': `sha256=${signature}`,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      statusCode = response.status;
      success = response.ok;
      if (!response.ok) {
        errorMsg = `HTTP ${response.status} ${response.statusText}`;
      }
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err);
      statusCode = 0;
      success = false;
    }

    results.push({
      id: `log_${randomUUID().slice(0, 10)}`,
      webhookId: ep.id,
      event,
      payload: payloadData,
      signature,
      statusCode,
      success,
      error: errorMsg,
      deliveredAt: now,
    });
  }

  return results;
}
