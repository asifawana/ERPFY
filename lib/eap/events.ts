import crypto from 'node:crypto';

export type PlatformEventPayload = {
  eventId: string;
  eventType: string;
  companyId: string;
  timestamp: number;
  data: Record<string, unknown>;
};

/**
 * Computes an HMAC-SHA256 signature for a webhook payload.
 */
export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Dispatches a platform event to all subscribed active webhooks for a company.
 */
export async function dispatchPlatformEvent(
  db: D1Database,
  {
    eventType,
    companyId,
    data,
    actorId = 'system',
  }: {
    eventType: string;
    companyId: string;
    data: Record<string, unknown>;
    actorId?: string;
  },
): Promise<{ dispatched: number; eventId: string }> {
  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const timestamp = Date.now();

  const _payload: PlatformEventPayload = {
    eventId,
    eventType,
    companyId,
    timestamp,
    data,
  };

  // Find all active webhooks for this event and company
  const { results } = await db
    .prepare(
      `SELECT w.id, w.endpoint_url, w.secret, w.app_id
         FROM eap_app_webhooks w
         JOIN eap_apps a ON a.id = w.app_id
        WHERE w.company_id = ?1
          AND w.event_type = ?2
          AND w.status = 'active'
          AND a.is_killed = 0`,
    )
    .bind(companyId, eventType)
    .all<{
      id: string;
      endpoint_url: string;
      secret: string;
      app_id: string;
    }>();

  const webhooks = results || [];

  // Update last triggered timestamps
  if (webhooks.length > 0) {
    const ids = webhooks.map((w) => w.id);
    await db
      .prepare(
        `UPDATE eap_app_webhooks
            SET last_triggered_at = ?1
          WHERE id IN (${ids.map((_, i) => `?${i + 2}`).join(',')})`,
      )
      .bind(timestamp, ...ids)
      .run();
  }

  // Record audit log
  await db
    .prepare(
      `INSERT INTO eap_app_audit_logs
        (id, actor_id, actor_type, company_id, action, details, created_at)
       VALUES (?1, ?2, 'system', ?3, ?4, ?5, ?6)`,
    )
    .bind(
      `audit_${crypto.randomBytes(12).toString('hex')}`,
      actorId,
      companyId,
      `event.${eventType}`,
      JSON.stringify({ eventId, webhooksMatched: webhooks.length }),
      timestamp,
    )
    .run();

  return {
    dispatched: webhooks.length,
    eventId,
  };
}
