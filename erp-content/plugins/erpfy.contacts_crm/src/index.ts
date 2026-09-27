/**
 * ERPFY Universal Contacts / CRM / Party Master Foundation Plugin
 * Plugin ID: erpfy.contacts_crm
 * Version: 1.0.0
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  UniversalPartyService,
  FullPartyProfile,
  PartyRecord,
  PartyRoleRecord,
  AddressRecord,
  ContactPersonRecord,
  RelationshipRecord,
  PartyType,
  PartyRoleKey,
  AddressType,
} from './contracts/types';

import {
  createPartyRecord,
  getPartyProfile,
  listParties,
  updatePartyRecord,
  archivePartyRecord,
  assignPartyRole,
  removePartyRole,
  addContactPerson,
  addPartyAddress,
  addRelationship,
} from './services/party-service';

import { findDuplicates, mergeParties } from './services/duplicate-service';
import {
  createLead,
  listLeads,
  convertLead,
  createOpportunity,
  listOpportunities,
  createActivity,
  listActivities,
} from './services/crm-pipeline-service';

import {
  parseCsvContent,
  previewPartyImport,
  executePartyImport,
  exportPartiesCsv,
} from './services/import-export-service';

import { recordAuditEvent, getPartyAuditEvents } from './services/audit-service';

export * from './contracts/types';
export {
  createPartyRecord,
  getPartyProfile,
  listParties,
  updatePartyRecord,
  archivePartyRecord,
  assignPartyRole,
  removePartyRole,
  addContactPerson,
  addPartyAddress,
  addRelationship,
  findDuplicates,
  mergeParties,
  createLead,
  listLeads,
  convertLead,
  createOpportunity,
  listOpportunities,
  createActivity,
  listActivities,
  parseCsvContent,
  previewPartyImport,
  executePartyImport,
  exportPartiesCsv,
  recordAuditEvent,
  getPartyAuditEvents,
};

/**
 * Creates a bound instance of the UniversalPartyService for cross-plugin usage.
 */
export function createUniversalPartyClient(db: D1Database): UniversalPartyService {
  return {
    async getParty(companyId: string, partyId: string): Promise<FullPartyProfile | null> {
      return getPartyProfile(db, companyId, partyId);
    },

    async findParty(
      companyId: string,
      query: { email?: string; phone?: string; taxId?: string; search?: string },
    ): Promise<PartyRecord[]> {
      const { parties } = await listParties(db, companyId, {
        search: query.search || query.email || query.phone || query.taxId,
        limit: 20,
      });
      return parties;
    },

    async createParty(
      companyId: string,
      payload: Partial<PartyRecord> & { partyType: PartyType; displayName: string },
      actorAccountId: string,
    ): Promise<PartyRecord> {
      return createPartyRecord(db, companyId, payload, actorAccountId);
    },

    async assignRole(
      companyId: string,
      partyId: string,
      roleKey: PartyRoleKey,
      metadata: Record<string, unknown> = {},
    ): Promise<PartyRoleRecord> {
      return assignPartyRole(db, companyId, partyId, roleKey, metadata);
    },

    async removeRole(companyId: string, partyId: string, roleKey: PartyRoleKey): Promise<boolean> {
      return removePartyRole(db, companyId, partyId, roleKey);
    },

    async getAddresses(
      companyId: string,
      partyId: string,
      type?: AddressType,
    ): Promise<AddressRecord[]> {
      const profile = await getPartyProfile(db, companyId, partyId);
      if (!profile) return [];
      if (type) {
        return profile.addresses.filter((a) => a.type === type);
      }
      return profile.addresses;
    },

    async getPrimaryContact(
      companyId: string,
      partyId: string,
    ): Promise<ContactPersonRecord | null> {
      const profile = await getPartyProfile(db, companyId, partyId);
      if (!profile || profile.contacts.length === 0) return null;
      return profile.contacts.find((c) => c.isPrimary) || profile.contacts[0];
    },

    async resolvePartyRelationship(
      companyId: string,
      sourcePartyId: string,
      targetPartyId: string,
    ): Promise<RelationshipRecord | null> {
      const row = await db
        .prepare(
          `SELECT * FROM crm_relationships
            WHERE company_id = ?1 AND source_party_id = ?2 AND target_party_id = ?3
            LIMIT 1`,
        )
        .bind(companyId, sourcePartyId, targetPartyId)
        .first<any>();

      if (!row) return null;
      return {
        id: row.id,
        companyId: row.company_id,
        sourcePartyId: row.source_party_id,
        targetPartyId: row.target_party_id,
        relationshipType: row.relationship_type,
        notes: row.notes || '',
        createdAt: Number(row.created_at),
      };
    },
  };
}
