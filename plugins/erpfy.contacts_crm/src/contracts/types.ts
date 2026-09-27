/**
 * ERPFY Universal Contacts / CRM / Party Master Foundation
 * Technical Plugin ID: erpfy.contacts_crm
 * Public Contracts & Types
 */

export type PartyType = 'person' | 'organization' | 'household';
export type PartyStatus = 'active' | 'archived' | 'inactive';

export type PartyRoleKey =
  | 'customer'
  | 'supplier'
  | 'dealer'
  | 'distributor'
  | 'farmer'
  | 'lead'
  | 'partner'
  | 'contractor'
  | 'agent'
  | 'employee'
  | (string & {});

export type AddressType =
  | 'billing'
  | 'shipping'
  | 'office'
  | 'home'
  | 'warehouse'
  | 'custom';

export type RelationshipType =
  | 'employee_of'
  | 'works_for'
  | 'parent_guardian'
  | 'dealer_distributor'
  | 'branch_contact'
  | 'emergency_contact'
  | (string & {});

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type OpportunityStage =
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type ActivityType = 'call' | 'meeting' | 'task' | 'email' | 'followup';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';

export type ConsentChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'post';
export type ConsentStatus = 'opted_in' | 'opted_out';

export interface PartyRecord {
  id: string;
  companyId: string;
  partyType: PartyType;
  displayName: string;
  legalName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  status: PartyStatus;
  primaryEmail: string;
  primaryPhone: string;
  primaryMobile: string;
  website: string;
  taxIdentifier: string;
  registrationIdentifier: string;
  preferredLanguage: string;
  preferredCurrency: string;
  source: string;
  ownerUserId: string;
  customFields: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface PartyRoleRecord {
  id: string;
  companyId: string;
  partyId: string;
  roleKey: PartyRoleKey;
  status: 'active' | 'inactive';
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface ContactPersonRecord {
  id: string;
  companyId: string;
  partyId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  isPrimary: boolean;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface AddressRecord {
  id: string;
  companyId: string;
  partyId: string;
  type: AddressType;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RelationshipRecord {
  id: string;
  companyId: string;
  sourcePartyId: string;
  targetPartyId: string;
  relationshipType: RelationshipType;
  notes: string;
  createdAt: number;
}

export interface TagRecord {
  id: string;
  companyId: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface NoteRecord {
  id: string;
  companyId: string;
  partyId: string;
  authorAccountId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityRecord {
  id: string;
  companyId: string;
  partyId: string;
  type: ActivityType;
  subject: string;
  description: string;
  status: ActivityStatus;
  dueDate: number | null;
  completedAt: number | null;
  assignedUserId: string;
  createdAt: number;
}

export interface ConsentRecord {
  id: string;
  companyId: string;
  partyId: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  capturedAt: number;
  notes: string;
}

export interface LeadRecord {
  id: string;
  companyId: string;
  partyId: string | null;
  title: string;
  status: LeadStatus;
  source: string;
  estimatedValue: number;
  assignedUserId: string;
  convertedAt: number | null;
  convertedPartyId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface OpportunityRecord {
  id: string;
  companyId: string;
  partyId: string;
  name: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  expectedCloseAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEventRecord {
  id: string;
  companyId: string;
  partyId: string;
  actorAccountId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: number;
}

export interface FullPartyProfile extends PartyRecord {
  roles: PartyRoleRecord[];
  contacts: ContactPersonRecord[];
  addresses: AddressRecord[];
  relationships: {
    outgoing: RelationshipRecord[];
    incoming: RelationshipRecord[];
  };
  tags: TagRecord[];
  consents: ConsentRecord[];
  notes?: NoteRecord[];
  recentActivities?: ActivityRecord[];
}

export interface DuplicateCandidate {
  party: PartyRecord;
  matchScore: number;
  matchedFields: ('email' | 'phone' | 'mobile' | 'tax_identifier' | 'legal_name')[];
  reason: string;
}

export interface MergePartiesPayload {
  primaryPartyId: string;
  duplicatePartyIds: string[];
  fieldOverrides?: Partial<PartyRecord>;
}

export interface MergeResult {
  primaryPartyId: string;
  mergedPartyIds: string[];
  rolesCount: number;
  contactsCount: number;
  addressesCount: number;
  activitiesCount: number;
  auditEventId: string;
}

/**
 * Cross-Plugin Public Service Contract
 * Domain plugins call this interface rather than querying crm_* tables directly.
 */
export interface UniversalPartyService {
  getParty(companyId: string, partyId: string): Promise<FullPartyProfile | null>;
  findParty(companyId: string, query: { email?: string; phone?: string; taxId?: string; search?: string }): Promise<PartyRecord[]>;
  createParty(companyId: string, payload: Partial<PartyRecord> & { partyType: PartyType; displayName: string }, actorAccountId: string): Promise<PartyRecord>;
  assignRole(companyId: string, partyId: string, roleKey: PartyRoleKey, metadata?: Record<string, unknown>): Promise<PartyRoleRecord>;
  removeRole(companyId: string, partyId: string, roleKey: PartyRoleKey): Promise<boolean>;
  getAddresses(companyId: string, partyId: string, type?: AddressType): Promise<AddressRecord[]>;
  getPrimaryContact(companyId: string, partyId: string): Promise<ContactPersonRecord | null>;
  resolvePartyRelationship(companyId: string, sourcePartyId: string, targetPartyId: string): Promise<RelationshipRecord | null>;
}
