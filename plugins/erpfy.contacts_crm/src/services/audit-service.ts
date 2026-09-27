import type { D1Database } from '@cloudflare/workers-types';
import type { AuditEventRecord } from '../contracts/types';

export async function recordAuditEvent(
  db: D1Database,
  companyId: string,
  partyId: string,
  actorAccountId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<AuditEventRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO crm_audit_events (id, company_id, party_id, actor_account_id, action, details_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(id, companyId, partyId, actorAccountId, action, JSON.stringify(details), now)
    .run();

  return {
    id,
    companyId,
    partyId,
    actorAccountId,
    action,
    details,
    createdAt: now,
  };
}

export async function getPartyAuditEvents(
  db: D1Database,
  companyId: string,
  partyId: string,
): Promise<AuditEventRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM crm_audit_events
        WHERE company_id = ?1 AND party_id = ?2
        ORDER BY created_at DESC LIMIT 100`,
    )
    .bind(companyId, partyId)
    .all<any>();

  return (results || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    partyId: row.party_id,
    actorAccountId: row.actor_account_id,
    action: row.action,
    details: JSON.parse(row.details_json || '{}'),
    createdAt: Number(row.created_at),
  }));
}
