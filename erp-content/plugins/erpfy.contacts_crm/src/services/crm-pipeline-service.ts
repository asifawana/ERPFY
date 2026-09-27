import type { D1Database } from '@cloudflare/workers-types';
import type {
  LeadRecord,
  OpportunityRecord,
  ActivityRecord,
  PartyRoleKey,
  LeadStatus,
  OpportunityStage,
  ActivityType,
  PartyType,
} from '../contracts/types';
import { createPartyRecord, assignPartyRole, getPartyProfile } from './party-service';
import { recordAuditEvent } from './audit-service';

export async function createLead(
  db: D1Database,
  companyId: string,
  data: {
    title: string;
    partyId?: string;
    source?: string;
    estimatedValue?: number;
    assignedUserId?: string;
  },
): Promise<LeadRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const rec: LeadRecord = {
    id,
    companyId,
    partyId: data.partyId || null,
    title: data.title.trim(),
    status: 'new',
    source: data.source?.trim() || '',
    estimatedValue: Number(data.estimatedValue || 0),
    assignedUserId: data.assignedUserId?.trim() || '',
    convertedAt: null,
    convertedPartyId: null,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT INTO crm_leads (
        id, company_id, party_id, title, status, source, estimated_value,
        assigned_user_id, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(
      rec.id,
      rec.companyId,
      rec.partyId,
      rec.title,
      rec.status,
      rec.source,
      rec.estimatedValue,
      rec.assignedUserId,
      rec.createdAt,
      rec.updatedAt,
    )
    .run();

  return rec;
}

export async function listLeads(
  db: D1Database,
  companyId: string,
  options: { status?: LeadStatus; search?: string } = {},
): Promise<LeadRecord[]> {
  let sql = `SELECT * FROM crm_leads WHERE company_id = ?1`;
  const params: (string | number)[] = [companyId];
  let paramIdx = 2;

  if (options.status) {
    sql += ` AND status = ?${paramIdx++}`;
    params.push(options.status);
  }

  if (options.search) {
    sql += ` AND title LIKE ?${paramIdx++}`;
    params.push(`%${options.search.trim()}%`);
  }

  sql += ` ORDER BY updated_at DESC LIMIT 100`;

  const { results } = await db.prepare(sql).bind(...params).all<any>();

  return (results || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    partyId: row.party_id,
    title: row.title,
    status: row.status,
    source: row.source || '',
    estimatedValue: Number(row.estimated_value || 0),
    assignedUserId: row.assigned_user_id || '',
    convertedAt: row.converted_at ? Number(row.converted_at) : null,
    convertedPartyId: row.converted_party_id,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export async function convertLead(
  db: D1Database,
  companyId: string,
  leadId: string,
  options: {
    partyType?: PartyType;
    displayName?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    assignRoles?: PartyRoleKey[];
    createOpportunity?: {
      name: string;
      amount?: number;
    };
  },
  actorAccountId: string,
): Promise<{
  lead: LeadRecord;
  partyId: string;
  opportunityId?: string;
}> {
  const leadRow = await db
    .prepare(`SELECT * FROM crm_leads WHERE id = ?1 AND company_id = ?2`)
    .bind(leadId, companyId)
    .first<any>();

  if (!leadRow) {
    throw new Error('Lead not found.');
  }

  if (leadRow.status === 'converted') {
    throw new Error('Lead is already converted.');
  }

  let canonicalPartyId = leadRow.party_id;

  // If lead does not have a canonical party, create one
  if (!canonicalPartyId) {
    const newParty = await createPartyRecord(
      db,
      companyId,
      {
        partyType: options.partyType || 'person',
        displayName: options.displayName?.trim() || leadRow.title,
        primaryEmail: options.primaryEmail,
        primaryPhone: options.primaryPhone,
        source: leadRow.source || 'lead_conversion',
        initialRoles: options.assignRoles || ['customer'],
      },
      actorAccountId,
    );
    canonicalPartyId = newParty.id;
  } else {
    // If party already existed, ensure requested roles are assigned
    const rolesToAssign = options.assignRoles || ['customer'];
    for (const r of rolesToAssign) {
      await assignPartyRole(db, companyId, canonicalPartyId, r);
    }
  }

  const now = Date.now();
  let createdOppId: string | undefined = undefined;

  // Optionally create Opportunity
  if (options.createOpportunity) {
    const opp = await createOpportunity(db, companyId, {
      partyId: canonicalPartyId,
      name: options.createOpportunity.name,
      amount: options.createOpportunity.amount || leadRow.estimated_value || 0,
      stage: 'qualification',
    });
    createdOppId = opp.id;
  }

  // Update lead record to converted
  await db
    .prepare(
      `UPDATE crm_leads
          SET status = 'converted', converted_at = ?1, converted_party_id = ?2,
              party_id = ?2, updated_at = ?1
        WHERE id = ?3 AND company_id = ?4`,
    )
    .bind(now, canonicalPartyId, leadId, companyId)
    .run();

  await recordAuditEvent(db, companyId, canonicalPartyId, actorAccountId, 'lead.converted', {
    leadId,
    opportunityId: createdOppId,
  });

  const updatedLead: LeadRecord = {
    id: leadRow.id,
    companyId: leadRow.company_id,
    partyId: canonicalPartyId,
    title: leadRow.title,
    status: 'converted',
    source: leadRow.source || '',
    estimatedValue: Number(leadRow.estimated_value || 0),
    assignedUserId: leadRow.assigned_user_id || '',
    convertedAt: now,
    convertedPartyId: canonicalPartyId,
    createdAt: Number(leadRow.created_at),
    updatedAt: now,
  };

  return {
    lead: updatedLead,
    partyId: canonicalPartyId,
    opportunityId: createdOppId,
  };
}

export async function createOpportunity(
  db: D1Database,
  companyId: string,
  data: {
    partyId: string;
    name: string;
    stage?: OpportunityStage;
    amount?: number;
    probability?: number;
    expectedCloseAt?: number;
  },
): Promise<OpportunityRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const rec: OpportunityRecord = {
    id,
    companyId,
    partyId: data.partyId,
    name: data.name.trim(),
    stage: data.stage || 'qualification',
    amount: Number(data.amount || 0),
    probability: data.probability ?? 50,
    expectedCloseAt: data.expectedCloseAt || null,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT INTO crm_opportunities (
        id, company_id, party_id, name, stage, amount, probability,
        expected_close_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(
      rec.id,
      rec.companyId,
      rec.partyId,
      rec.name,
      rec.stage,
      rec.amount,
      rec.probability,
      rec.expectedCloseAt,
      rec.createdAt,
      rec.updatedAt,
    )
    .run();

  return rec;
}

export async function listOpportunities(
  db: D1Database,
  companyId: string,
  options: { stage?: OpportunityStage; partyId?: string } = {},
): Promise<OpportunityRecord[]> {
  let sql = `SELECT * FROM crm_opportunities WHERE company_id = ?1`;
  const params: (string | number)[] = [companyId];
  let paramIdx = 2;

  if (options.stage) {
    sql += ` AND stage = ?${paramIdx++}`;
    params.push(options.stage);
  }

  if (options.partyId) {
    sql += ` AND party_id = ?${paramIdx++}`;
    params.push(options.partyId);
  }

  sql += ` ORDER BY updated_at DESC LIMIT 100`;

  const { results } = await db.prepare(sql).bind(...params).all<any>();

  return (results || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    partyId: row.party_id,
    name: row.name,
    stage: row.stage,
    amount: Number(row.amount || 0),
    probability: Number(row.probability || 0),
    expectedCloseAt: row.expected_close_at ? Number(row.expected_close_at) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export async function createActivity(
  db: D1Database,
  companyId: string,
  data: {
    partyId: string;
    type: ActivityType;
    subject: string;
    description?: string;
    dueDate?: number;
    assignedUserId?: string;
  },
): Promise<ActivityRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const rec: ActivityRecord = {
    id,
    companyId,
    partyId: data.partyId,
    type: data.type,
    subject: data.subject.trim(),
    description: data.description?.trim() || '',
    status: 'pending',
    dueDate: data.dueDate || null,
    completedAt: null,
    assignedUserId: data.assignedUserId?.trim() || '',
    createdAt: now,
  };

  await db
    .prepare(
      `INSERT INTO crm_activities (
        id, company_id, party_id, type, subject, description, status,
        due_date, completed_at, assigned_user_id, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    )
    .bind(
      rec.id,
      rec.companyId,
      rec.partyId,
      rec.type,
      rec.subject,
      rec.description,
      rec.status,
      rec.dueDate,
      rec.completedAt,
      rec.assignedUserId,
      rec.createdAt,
    )
    .run();

  return rec;
}

export async function listActivities(
  db: D1Database,
  companyId: string,
  options: { partyId?: string; status?: string } = {},
): Promise<ActivityRecord[]> {
  let sql = `SELECT * FROM crm_activities WHERE company_id = ?1`;
  const params: (string | number)[] = [companyId];
  let paramIdx = 2;

  if (options.partyId) {
    sql += ` AND party_id = ?${paramIdx++}`;
    params.push(options.partyId);
  }

  if (options.status) {
    sql += ` AND status = ?${paramIdx++}`;
    params.push(options.status);
  }

  sql += ` ORDER BY created_at DESC LIMIT 100`;

  const { results } = await db.prepare(sql).bind(...params).all<any>();

  return (results || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    partyId: row.party_id,
    type: row.type,
    subject: row.subject,
    description: row.description || '',
    status: row.status,
    dueDate: row.due_date ? Number(row.due_date) : null,
    completedAt: row.completed_at ? Number(row.completed_at) : null,
    assignedUserId: row.assigned_user_id || '',
    createdAt: Number(row.created_at),
  }));
}
