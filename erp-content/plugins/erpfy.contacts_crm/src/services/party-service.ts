import type { D1Database } from '@cloudflare/workers-types';
import type {
  PartyRecord,
  FullPartyProfile,
  PartyRoleRecord,
  ContactPersonRecord,
  AddressRecord,
  RelationshipRecord,
  TagRecord,
  ConsentRecord,
  PartyType,
  PartyRoleKey,
  PartyStatus,
  AddressType,
  RelationshipType,
  ConsentChannel,
  ConsentStatus,
} from '../contracts/types';
import { recordAuditEvent } from './audit-service';

interface RawPartyRow {
  id: string;
  company_id: string;
  party_type: PartyType;
  display_name: string;
  legal_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  status: PartyStatus;
  primary_email: string | null;
  primary_phone: string | null;
  primary_mobile: string | null;
  website: string | null;
  tax_identifier: string | null;
  registration_identifier: string | null;
  preferred_language: string | null;
  preferred_currency: string | null;
  source: string | null;
  owner_user_id: string | null;
  custom_fields_json: string | null;
  created_at: number | string;
  updated_at: number | string;
  archived_at: number | string | null;
}

interface RawPartyRoleRow {
  id: string;
  company_id: string;
  party_id: string;
  role_key: PartyRoleKey;
  status: 'active' | 'inactive';
  metadata_json: string | null;
  created_at: number | string;
}

interface RawContactRow {
  id: string;
  company_id: string;
  party_id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  is_primary: number;
  notes: string | null;
  created_at: number | string;
  updated_at: number | string;
}

interface RawAddressRow {
  id: string;
  company_id: string;
  party_id: string;
  type: AddressType;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country_code: string;
  is_default: number;
  created_at: number | string;
  updated_at: number | string;
}

interface RawRelationshipRow {
  id: string;
  company_id: string;
  source_party_id: string;
  target_party_id: string;
  relationship_type: RelationshipType;
  notes: string | null;
  created_at: number | string;
}

interface RawTagRow {
  id: string;
  name: string;
  color: string;
  created_at: number | string;
}

interface RawConsentRow {
  id: string;
  company_id: string;
  party_id: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  captured_at: number | string;
  notes: string | null;
}

interface RawPartyListRow extends RawPartyRow {
  role_keys: string | null;
}

export async function createPartyRecord(
  db: D1Database,
  companyId: string,
  data: {
    partyType: PartyType;
    displayName: string;
    legalName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    primaryMobile?: string;
    website?: string;
    taxIdentifier?: string;
    registrationIdentifier?: string;
    preferredLanguage?: string;
    preferredCurrency?: string;
    source?: string;
    ownerUserId?: string;
    customFields?: Record<string, unknown>;
    initialRoles?: PartyRoleKey[];
  },
  actorAccountId: string,
): Promise<PartyRecord> {
  const partyId = crypto.randomUUID();
  const now = Date.now();

  const record: PartyRecord = {
    id: partyId,
    companyId,
    partyType: data.partyType,
    displayName: data.displayName.trim(),
    legalName: data.legalName?.trim() || '',
    firstName: data.firstName?.trim() || '',
    middleName: data.middleName?.trim() || '',
    lastName: data.lastName?.trim() || '',
    status: 'active',
    primaryEmail: data.primaryEmail?.trim().toLowerCase() || '',
    primaryPhone: data.primaryPhone?.trim() || '',
    primaryMobile: data.primaryMobile?.trim() || '',
    website: data.website?.trim() || '',
    taxIdentifier: data.taxIdentifier?.trim() || '',
    registrationIdentifier: data.registrationIdentifier?.trim() || '',
    preferredLanguage: data.preferredLanguage?.trim() || 'en',
    preferredCurrency: data.preferredCurrency?.trim() || '',
    source: data.source?.trim() || '',
    ownerUserId: data.ownerUserId?.trim() || '',
    customFields: data.customFields || {},
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  await db
    .prepare(
      `INSERT INTO crm_parties (
        id, company_id, party_type, display_name, legal_name, first_name, middle_name,
        last_name, status, primary_email, primary_phone, primary_mobile, website,
        tax_identifier, registration_identifier, preferred_language, preferred_currency,
        source, owner_user_id, custom_fields_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`,
    )
    .bind(
      record.id,
      record.companyId,
      record.partyType,
      record.displayName,
      record.legalName,
      record.firstName,
      record.middleName,
      record.lastName,
      record.status,
      record.primaryEmail,
      record.primaryPhone,
      record.primaryMobile,
      record.website,
      record.taxIdentifier,
      record.registrationIdentifier,
      record.preferredLanguage,
      record.preferredCurrency,
      record.source,
      record.ownerUserId,
      JSON.stringify(record.customFields),
      record.createdAt,
      record.updatedAt,
    )
    .run();

  if (Array.isArray(data.initialRoles)) {
    for (const roleKey of data.initialRoles) {
      await assignPartyRole(db, companyId, partyId, roleKey);
    }
  }

  await recordAuditEvent(db, companyId, partyId, actorAccountId, 'party.created', {
    displayName: record.displayName,
    partyType: record.partyType,
  });

  return record;
}

export async function getPartyProfile(
  db: D1Database,
  companyId: string,
  partyId: string,
): Promise<FullPartyProfile | null> {
  const row = await db
    .prepare(`SELECT * FROM crm_parties WHERE id = ?1 AND company_id = ?2`)
    .bind(partyId, companyId)
    .first<RawPartyRow>();

  if (!row) return null;

  const party: PartyRecord = {
    id: row.id,
    companyId: row.company_id,
    partyType: row.party_type,
    displayName: row.display_name,
    legalName: row.legal_name || '',
    firstName: row.first_name || '',
    middleName: row.middle_name || '',
    lastName: row.last_name || '',
    status: row.status,
    primaryEmail: row.primary_email || '',
    primaryPhone: row.primary_phone || '',
    primaryMobile: row.primary_mobile || '',
    website: row.website || '',
    taxIdentifier: row.tax_identifier || '',
    registrationIdentifier: row.registration_identifier || '',
    preferredLanguage: row.preferred_language || 'en',
    preferredCurrency: row.preferred_currency || '',
    source: row.source || '',
    ownerUserId: row.owner_user_id || '',
    customFields: JSON.parse(row.custom_fields_json || '{}') as Record<string, unknown>,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    archivedAt: row.archived_at ? Number(row.archived_at) : null,
  };

  const [rolesRes, contactsRes, addressesRes, outRelsRes, inRelsRes, tagsRes, consentsRes] =
    await Promise.all([
      db
        .prepare(`SELECT * FROM crm_party_roles WHERE company_id = ?1 AND party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawPartyRoleRow>(),
      db
        .prepare(`SELECT * FROM crm_contacts WHERE company_id = ?1 AND party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawContactRow>(),
      db
        .prepare(`SELECT * FROM crm_addresses WHERE company_id = ?1 AND party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawAddressRow>(),
      db
        .prepare(`SELECT * FROM crm_relationships WHERE company_id = ?1 AND source_party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawRelationshipRow>(),
      db
        .prepare(`SELECT * FROM crm_relationships WHERE company_id = ?1 AND target_party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawRelationshipRow>(),
      db
        .prepare(
          `SELECT t.id, t.name, t.color, t.created_at FROM crm_tags t
             JOIN crm_party_tags pt ON pt.tag_id = t.id
            WHERE pt.company_id = ?1 AND pt.party_id = ?2`,
        )
        .bind(companyId, partyId)
        .all<RawTagRow>(),
      db
        .prepare(`SELECT * FROM crm_consents WHERE company_id = ?1 AND party_id = ?2`)
        .bind(companyId, partyId)
        .all<RawConsentRow>(),
    ]);

  const roles: PartyRoleRecord[] = (rolesRes.results || []).map((r) => ({
    id: r.id,
    companyId: r.company_id,
    partyId: r.party_id,
    roleKey: r.role_key,
    status: r.status,
    metadata: JSON.parse(r.metadata_json || '{}') as Record<string, unknown>,
    createdAt: Number(r.created_at),
  }));

  const contacts: ContactPersonRecord[] = (contactsRes.results || []).map((c) => ({
    id: c.id,
    companyId: c.company_id,
    partyId: c.party_id,
    firstName: c.first_name || '',
    lastName: c.last_name || '',
    jobTitle: c.job_title || '',
    department: c.department || '',
    email: c.email || '',
    phone: c.phone || '',
    mobile: c.mobile || '',
    whatsapp: c.whatsapp || '',
    isPrimary: Boolean(c.is_primary),
    notes: c.notes || '',
    createdAt: Number(c.created_at),
    updatedAt: Number(c.updated_at),
  }));

  const addresses: AddressRecord[] = (addressesRes.results || []).map((a) => ({
    id: a.id,
    companyId: a.company_id,
    partyId: a.party_id,
    type: a.type,
    label: a.label || '',
    line1: a.line1,
    line2: a.line2 || '',
    city: a.city,
    state: a.state || '',
    postalCode: a.postal_code || '',
    countryCode: a.country_code,
    isDefault: Boolean(a.is_default),
    createdAt: Number(a.created_at),
    updatedAt: Number(a.updated_at),
  }));

  const outgoing: RelationshipRecord[] = (outRelsRes.results || []).map((r) => ({
    id: r.id,
    companyId: r.company_id,
    sourcePartyId: r.source_party_id,
    targetPartyId: r.target_party_id,
    relationshipType: r.relationship_type,
    notes: r.notes || '',
    createdAt: Number(r.created_at),
  }));

  const incoming: RelationshipRecord[] = (inRelsRes.results || []).map((r) => ({
    id: r.id,
    companyId: r.company_id,
    sourcePartyId: r.source_party_id,
    targetPartyId: r.target_party_id,
    relationshipType: r.relationship_type,
    notes: r.notes || '',
    createdAt: Number(r.created_at),
  }));

  const tags: TagRecord[] = (tagsRes.results || []).map((t) => ({
    id: t.id,
    companyId,
    name: t.name,
    color: t.color,
    createdAt: Number(t.created_at),
  }));

  const consents: ConsentRecord[] = (consentsRes.results || []).map((c) => ({
    id: c.id,
    companyId: c.company_id,
    partyId: c.party_id,
    channel: c.channel,
    status: c.status,
    capturedAt: Number(c.captured_at),
    notes: c.notes || '',
  }));

  return {
    ...party,
    roles,
    contacts,
    addresses,
    relationships: { outgoing, incoming },
    tags,
    consents,
  };
}

export async function listParties(
  db: D1Database,
  companyId: string,
  options: {
    partyType?: PartyType;
    roleKey?: string;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ parties: (PartyRecord & { roles: string[] })[]; total: number }> {
  const limit = Math.min(Math.max(options.limit || 50, 1), 200);
  const offset = Math.max(options.offset || 0, 0);

  let whereSql = `WHERE p.company_id = ?1`;
  const params: (string | number)[] = [companyId];
  let paramIdx = 2;

  if (options.status) {
    whereSql += ` AND p.status = ?${paramIdx++}`;
    params.push(options.status);
  } else {
    whereSql += ` AND p.status != 'archived'`;
  }

  if (options.partyType) {
    whereSql += ` AND p.party_type = ?${paramIdx++}`;
    params.push(options.partyType);
  }

  if (options.search) {
    const term = `%${options.search.trim()}%`;
    whereSql += ` AND (p.display_name LIKE ?${paramIdx} OR p.primary_email LIKE ?${paramIdx} OR p.primary_phone LIKE ?${paramIdx} OR p.tax_identifier LIKE ?${paramIdx})`;
    params.push(term);
    paramIdx++;
  }

  if (options.roleKey) {
    whereSql += ` AND EXISTS (SELECT 1 FROM crm_party_roles r WHERE r.party_id = p.id AND r.role_key = ?${paramIdx++} AND r.status = 'active')`;
    params.push(options.roleKey);
  }

  const countRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM crm_parties p ${whereSql}`)
    .bind(...params)
    .first<{ cnt: number }>();

  const total = Number(countRow?.cnt || 0);

  const querySql = `
    SELECT p.*,
           (SELECT GROUP_CONCAT(r.role_key) FROM crm_party_roles r WHERE r.party_id = p.id AND r.status = 'active') as role_keys
      FROM crm_parties p
      ${whereSql}
     ORDER BY p.updated_at DESC
     LIMIT ?${paramIdx++} OFFSET ?${paramIdx++}
  `;

  params.push(limit, offset);

  const { results } = await db.prepare(querySql).bind(...params).all<RawPartyListRow>();

  const parties = (results || []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    partyType: row.party_type,
    displayName: row.display_name,
    legalName: row.legal_name || '',
    firstName: row.first_name || '',
    middleName: row.middle_name || '',
    lastName: row.last_name || '',
    status: row.status,
    primaryEmail: row.primary_email || '',
    primaryPhone: row.primary_phone || '',
    primaryMobile: row.primary_mobile || '',
    website: row.website || '',
    taxIdentifier: row.tax_identifier || '',
    registrationIdentifier: row.registration_identifier || '',
    preferredLanguage: row.preferred_language || 'en',
    preferredCurrency: row.preferred_currency || '',
    source: row.source || '',
    ownerUserId: row.owner_user_id || '',
    customFields: JSON.parse(row.custom_fields_json || '{}') as Record<string, unknown>,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    archivedAt: row.archived_at ? Number(row.archived_at) : null,
    roles: row.role_keys ? row.role_keys.split(',') : [],
  }));

  return { parties, total };
}

export async function updatePartyRecord(
  db: D1Database,
  companyId: string,
  partyId: string,
  updates: Partial<PartyRecord>,
  actorAccountId: string,
): Promise<PartyRecord | null> {
  const existing = await getPartyProfile(db, companyId, partyId);
  if (!existing) return null;

  const now = Date.now();
  const updated: PartyRecord = {
    ...existing,
    displayName: updates.displayName?.trim() ?? existing.displayName,
    legalName: updates.legalName?.trim() ?? existing.legalName,
    firstName: updates.firstName?.trim() ?? existing.firstName,
    lastName: updates.lastName?.trim() ?? existing.lastName,
    primaryEmail: updates.primaryEmail?.trim().toLowerCase() ?? existing.primaryEmail,
    primaryPhone: updates.primaryPhone?.trim() ?? existing.primaryPhone,
    primaryMobile: updates.primaryMobile?.trim() ?? existing.primaryMobile,
    website: updates.website?.trim() ?? existing.website,
    taxIdentifier: updates.taxIdentifier?.trim() ?? existing.taxIdentifier,
    preferredLanguage: updates.preferredLanguage ?? existing.preferredLanguage,
    preferredCurrency: updates.preferredCurrency ?? existing.preferredCurrency,
    customFields: updates.customFields ?? existing.customFields,
    updatedAt: now,
  };

  await db
    .prepare(
      `UPDATE crm_parties
          SET display_name = ?1, legal_name = ?2, first_name = ?3, last_name = ?4,
              primary_email = ?5, primary_phone = ?6, primary_mobile = ?7, website = ?8,
              tax_identifier = ?9, preferred_language = ?10, preferred_currency = ?11,
              custom_fields_json = ?12, updated_at = ?13
        WHERE id = ?14 AND company_id = ?15`,
    )
    .bind(
      updated.displayName,
      updated.legalName,
      updated.firstName,
      updated.lastName,
      updated.primaryEmail,
      updated.primaryPhone,
      updated.primaryMobile,
      updated.website,
      updated.taxIdentifier,
      updated.preferredLanguage,
      updated.preferredCurrency,
      JSON.stringify(updated.customFields),
      updated.updatedAt,
      partyId,
      companyId,
    )
    .run();

  await recordAuditEvent(db, companyId, partyId, actorAccountId, 'party.updated', {
    updatedFields: Object.keys(updates),
  });

  return updated;
}

export async function archivePartyRecord(
  db: D1Database,
  companyId: string,
  partyId: string,
  actorAccountId: string,
): Promise<boolean> {
  const now = Date.now();
  const res = await db
    .prepare(
      `UPDATE crm_parties
          SET status = 'archived', archived_at = ?1, updated_at = ?1
        WHERE id = ?2 AND company_id = ?3`,
    )
    .bind(now, partyId, companyId)
    .run();

  if (res.meta?.changes && res.meta.changes > 0) {
    await recordAuditEvent(db, companyId, partyId, actorAccountId, 'party.archived', {});
    return true;
  }
  return false;
}

export async function assignPartyRole(
  db: D1Database,
  companyId: string,
  partyId: string,
  roleKey: PartyRoleKey,
  metadata: Record<string, unknown> = {},
): Promise<PartyRoleRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO crm_party_roles (id, company_id, party_id, role_key, status, metadata_json, created_at)
       VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6)
       ON CONFLICT(company_id, party_id, role_key) DO UPDATE SET status = 'active', metadata_json = ?5`,
    )
    .bind(id, companyId, partyId, roleKey, JSON.stringify(metadata), now)
    .run();

  return {
    id,
    companyId,
    partyId,
    roleKey,
    status: 'active',
    metadata,
    createdAt: now,
  };
}

export async function removePartyRole(
  db: D1Database,
  companyId: string,
  partyId: string,
  roleKey: PartyRoleKey,
): Promise<boolean> {
  const res = await db
    .prepare(`DELETE FROM crm_party_roles WHERE company_id = ?1 AND party_id = ?2 AND role_key = ?3`)
    .bind(companyId, partyId, roleKey)
    .run();
  return Boolean(res.meta?.changes && res.meta.changes > 0);
}

export async function addContactPerson(
  db: D1Database,
  companyId: string,
  partyId: string,
  data: Partial<ContactPersonRecord>,
): Promise<ContactPersonRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const rec: ContactPersonRecord = {
    id,
    companyId,
    partyId,
    firstName: data.firstName?.trim() || '',
    lastName: data.lastName?.trim() || '',
    jobTitle: data.jobTitle?.trim() || '',
    department: data.department?.trim() || '',
    email: data.email?.trim().toLowerCase() || '',
    phone: data.phone?.trim() || '',
    mobile: data.mobile?.trim() || '',
    whatsapp: data.whatsapp?.trim() || '',
    isPrimary: Boolean(data.isPrimary),
    notes: data.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT INTO crm_contacts (
        id, company_id, party_id, first_name, last_name, job_title, department,
        email, phone, mobile, whatsapp, is_primary, notes, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    )
    .bind(
      rec.id,
      rec.companyId,
      rec.partyId,
      rec.firstName,
      rec.lastName,
      rec.jobTitle,
      rec.department,
      rec.email,
      rec.phone,
      rec.mobile,
      rec.whatsapp,
      rec.isPrimary ? 1 : 0,
      rec.notes,
      rec.createdAt,
      rec.updatedAt,
    )
    .run();

  return rec;
}

export async function addPartyAddress(
  db: D1Database,
  companyId: string,
  partyId: string,
  data: Partial<AddressRecord> & { line1: string; city: string; countryCode: string },
): Promise<AddressRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const rec: AddressRecord = {
    id,
    companyId,
    partyId,
    type: data.type || 'billing',
    label: data.label?.trim() || '',
    line1: data.line1.trim(),
    line2: data.line2?.trim() || '',
    city: data.city.trim(),
    state: data.state?.trim() || '',
    postalCode: data.postalCode?.trim() || '',
    countryCode: data.countryCode.trim().toUpperCase(),
    isDefault: Boolean(data.isDefault),
    createdAt: now,
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT INTO crm_addresses (
        id, company_id, party_id, type, label, line1, line2, city, state,
        postal_code, country_code, is_default, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    )
    .bind(
      rec.id,
      rec.companyId,
      rec.partyId,
      rec.type,
      rec.label,
      rec.line1,
      rec.line2,
      rec.city,
      rec.state,
      rec.postalCode,
      rec.countryCode,
      rec.isDefault ? 1 : 0,
      rec.createdAt,
      rec.updatedAt,
    )
    .run();

  return rec;
}

export async function addRelationship(
  db: D1Database,
  companyId: string,
  sourcePartyId: string,
  targetPartyId: string,
  relationshipType: string,
  notes: string = '',
): Promise<RelationshipRecord> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO crm_relationships (id, company_id, source_party_id, target_party_id, relationship_type, notes, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(id, companyId, sourcePartyId, targetPartyId, relationshipType, notes, now)
    .run();

  return {
    id,
    companyId,
    sourcePartyId,
    targetPartyId,
    relationshipType,
    notes,
    createdAt: now,
  };
}
