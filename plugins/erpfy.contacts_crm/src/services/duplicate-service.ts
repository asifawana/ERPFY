import type { D1Database } from '@cloudflare/workers-types';
import type {
  DuplicateCandidate,
  MergePartiesPayload,
  MergeResult,
  PartyRecord,
} from '../contracts/types';
import { recordAuditEvent } from './audit-service';
import { getPartyProfile } from './party-service';

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findDuplicates(
  db: D1Database,
  companyId: string,
  candidate: {
    email?: string;
    phone?: string;
    mobile?: string;
    taxIdentifier?: string;
    displayName?: string;
    excludePartyId?: string;
  },
): Promise<DuplicateCandidate[]> {
  const normEmail = candidate.email ? normalizeEmail(candidate.email) : '';
  const normPhone = candidate.phone ? normalizePhone(candidate.phone) : '';
  const normMobile = candidate.mobile ? normalizePhone(candidate.mobile) : '';
  const normTax = candidate.taxIdentifier?.trim() || '';

  if (!normEmail && !normPhone && !normMobile && !normTax) {
    return [];
  }

  const { results } = await db
    .prepare(
      `SELECT * FROM crm_parties
        WHERE company_id = ?1 AND status != 'archived'
          AND (?2 = '' OR primary_email = ?2)
          AND (?3 = '' OR primary_phone LIKE ?4)
          AND (?5 = '' OR primary_mobile LIKE ?6)
          AND (?7 = '' OR tax_identifier = ?7)
        LIMIT 20`,
    )
    .bind(
      companyId,
      normEmail,
      normPhone,
      `%${normPhone.slice(-7)}%`,
      normMobile,
      `%${normMobile.slice(-7)}%`,
      normTax,
    )
    .all<any>();

  const candidates: DuplicateCandidate[] = [];

  for (const row of results || []) {
    if (candidate.excludePartyId && row.id === candidate.excludePartyId) continue;

    const matchedFields: DuplicateCandidate['matchedFields'] = [];
    let matchScore = 0;

    if (normEmail && row.primary_email && normalizeEmail(row.primary_email) === normEmail) {
      matchedFields.push('email');
      matchScore += 40;
    }
    if (normPhone && row.primary_phone && normalizePhone(row.primary_phone) === normPhone) {
      matchedFields.push('phone');
      matchScore += 30;
    }
    if (normMobile && row.primary_mobile && normalizePhone(row.primary_mobile) === normMobile) {
      matchedFields.push('mobile');
      matchScore += 30;
    }
    if (normTax && row.tax_identifier && row.tax_identifier === normTax) {
      matchedFields.push('tax_identifier');
      matchScore += 50;
    }

    if (matchedFields.length > 0) {
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
        customFields: JSON.parse(row.custom_fields_json || '{}'),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        archivedAt: row.archived_at ? Number(row.archived_at) : null,
      };

      candidates.push({
        party,
        matchScore: Math.min(matchScore, 100),
        matchedFields,
        reason: `Matched on: ${matchedFields.join(', ')}`,
      });
    }
  }

  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}

export async function mergeParties(
  db: D1Database,
  companyId: string,
  payload: MergePartiesPayload,
  actorAccountId: string,
): Promise<MergeResult> {
  const primary = await getPartyProfile(db, companyId, payload.primaryPartyId);
  if (!primary) {
    throw new Error('Primary party not found.');
  }

  const now = Date.now();
  let totalRoles = 0;
  let totalContacts = 0;
  let totalAddresses = 0;
  let totalActivities = 0;

  for (const dupId of payload.duplicatePartyIds) {
    if (dupId === payload.primaryPartyId) continue;

    const dup = await getPartyProfile(db, companyId, dupId);
    if (!dup) continue;

    // 1. Move or preserve roles
    for (const role of dup.roles) {
      const exists = primary.roles.some((r) => r.roleKey === role.roleKey);
      if (!exists) {
        await db
          .prepare(
            `UPDATE crm_party_roles
                SET party_id = ?1
              WHERE company_id = ?2 AND party_id = ?3 AND role_key = ?4`,
          )
          .bind(primary.id, companyId, dupId, role.roleKey)
          .run();
        totalRoles++;
      }
    }

    // 2. Re-parent contacts
    const contactsRes = await db
      .prepare(`UPDATE crm_contacts SET party_id = ?1, updated_at = ?2 WHERE company_id = ?3 AND party_id = ?4`)
      .bind(primary.id, now, companyId, dupId)
      .run();
    totalContacts += contactsRes.meta?.changes || 0;

    // 3. Re-parent addresses
    const addrRes = await db
      .prepare(`UPDATE crm_addresses SET party_id = ?1, updated_at = ?2 WHERE company_id = ?3 AND party_id = ?4`)
      .bind(primary.id, now, companyId, dupId)
      .run();
    totalAddresses += addrRes.meta?.changes || 0;

    // 4. Re-parent activities
    const actRes = await db
      .prepare(`UPDATE crm_activities SET party_id = ?1 WHERE company_id = ?2 AND party_id = ?3`)
      .bind(primary.id, companyId, dupId)
      .run();
    totalActivities += actRes.meta?.changes || 0;

    // 5. Re-parent notes
    await db
      .prepare(`UPDATE crm_notes SET party_id = ?1, updated_at = ?2 WHERE company_id = ?3 AND party_id = ?4`)
      .bind(primary.id, now, companyId, dupId)
      .run();

    // 6. Re-parent leads and opportunities
    await db
      .prepare(`UPDATE crm_leads SET party_id = ?1, updated_at = ?2 WHERE company_id = ?3 AND party_id = ?4`)
      .bind(primary.id, now, companyId, dupId)
      .run();

    await db
      .prepare(`UPDATE crm_opportunities SET party_id = ?1, updated_at = ?2 WHERE company_id = ?3 AND party_id = ?4`)
      .bind(primary.id, now, companyId, dupId)
      .run();

    // 7. Soft archive duplicate party, recording merged reference
    const custom = {
      ...dup.customFields,
      mergedInto: primary.id,
      mergedAt: now,
      mergedBy: actorAccountId,
    };

    await db
      .prepare(
        `UPDATE crm_parties
            SET status = 'archived', archived_at = ?1, custom_fields_json = ?2, updated_at = ?1
          WHERE id = ?3 AND company_id = ?4`,
      )
      .bind(now, JSON.stringify(custom), dupId, companyId)
      .run();

    await recordAuditEvent(db, companyId, dupId, actorAccountId, 'party.merged_as_duplicate', {
      mergedInto: primary.id,
    });
  }

  // Record audit on primary
  const audit = await recordAuditEvent(db, companyId, primary.id, actorAccountId, 'party.merged', {
    mergedPartyIds: payload.duplicatePartyIds,
    rolesTransferred: totalRoles,
    contactsTransferred: totalContacts,
    addressesTransferred: totalAddresses,
    activitiesTransferred: totalActivities,
  });

  return {
    primaryPartyId: primary.id,
    mergedPartyIds: payload.duplicatePartyIds,
    rolesCount: totalRoles,
    contactsCount: totalContacts,
    addressesCount: totalAddresses,
    activitiesCount: totalActivities,
    auditEventId: audit.id,
  };
}
