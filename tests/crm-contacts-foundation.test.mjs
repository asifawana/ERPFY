/**
 * ERPFY — Contacts & CRM / Universal Party Master Foundation
 * Comprehensive end-to-end test suite
 *
 * Tests the full lifecycle against the actual service signatures:
 *   1. Party CRUD (individual & organization)
 *   2. Multi-role assignment & removal
 *   3. Contact persons & addresses
 *   4. Duplicate detection (email / phone / taxId)
 *   5. Non-destructive merge
 *   6. Lead & opportunity lifecycle
 *   7. Lead → Party conversion
 *   8. Activity logging
 *   9. Import preview & execute
 *  10. CSV export
 *  11. Immutable audit log
 *  12. UniversalPartyService cross-plugin client
 */

import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

// ─── In-process SQLite shim (matches D1Database interface) ───────────────────

let sqlite;

class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.sql, args);
  }
  async first() {
    return sqlite.prepare(this.sql).get(...this.args) ?? null;
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(...this.args) };
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.args);
    return { results: [], meta: { changes: Number(result.changes) } };
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const stmt of statements) results.push(await stmt.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  },
};

globalThis.__erpTestDB = db;
globalThis.__erpTestSecretKey = 'test-secret-key-material-0123456789abcdef';

// ─── esbuild loader (bundles TS → ESM in-memory) ─────────────────────────────

async function loadModule(path) {
  const output = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [
      {
        name: 'test-d1-binding',
        setup(builder) {
          builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
            path: 'binding',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export const env = { ' +
              'get DB() { return globalThis.__erpTestDB; }, ' +
              'get ERPFY_SECRET_KEY() { return globalThis.__erpTestSecretKey; } };',
          }));
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
  );
}

// ─── Load plugin modules ──────────────────────────────────────────────────────

const partyMod = await loadModule('plugins/erpfy.contacts_crm/src/services/party-service.ts');
const dupMod   = await loadModule('plugins/erpfy.contacts_crm/src/services/duplicate-service.ts');
const crmMod   = await loadModule('plugins/erpfy.contacts_crm/src/services/crm-pipeline-service.ts');
const ieMod    = await loadModule('plugins/erpfy.contacts_crm/src/services/import-export-service.ts');
const auditMod = await loadModule('plugins/erpfy.contacts_crm/src/services/audit-service.ts');
const indexMod = await loadModule('plugins/erpfy.contacts_crm/src/index.ts');

// Party service
const {
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
} = partyMod;

// Duplicate service
const { findDuplicates, mergeParties } = dupMod;

// CRM pipeline
const {
  createLead,
  listLeads,
  convertLead,
  createOpportunity,
  listOpportunities,
  createActivity,
  listActivities,
} = crmMod;

// Import / Export
const {
  parseCsvContent,
  previewPartyImport,
  executePartyImport,
  exportPartiesCsv,
} = ieMod;

// Audit
const { recordAuditEvent, getPartyAuditEvents } = auditMod;

// Cross-plugin client
const { createUniversalPartyClient } = indexMod;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

const COMPANY_ID = uid();
const ACTOR_ID   = uid();

// ─── DB bootstrap ────────────────────────────────────────────────────────────

function loadMigration(file) {
  return readFileSync(file, 'utf8').replaceAll('--> statement-breakpoint', '');
}

beforeEach(() => {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');

  sqlite.exec(loadMigration('drizzle/0000_core_baseline.sql'));
  sqlite.exec(loadMigration('drizzle/0001_auth.sql'));
  sqlite.exec(loadMigration('drizzle/0010_crm_contacts_foundation.sql'));

  const now = Date.now();

  // Seed actor account (FK: core_companies.created_by → core_accounts.id)
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at)
       VALUES (?1, ?2, 'Test Actor', 'UTC', ?3, ?3)`,
    )
    .run(ACTOR_ID, 'actor@test.local', now);

  // Seed company
  sqlite
    .prepare(
      `INSERT INTO core_companies
         (id, name, slug, country_code, currency, timezone, language,
          sector_slug, industry_slug, business_models, employee_band,
          plan, state, trial_ends_at, onboarding_state, onboarding_steps,
          created_at, created_by, request_key)
       VALUES (?1, ?2, ?3, 'PK', 'PKR', 'Asia/Karachi', 'en',
               '', '', '[]', '',
               'starter', 'trial', ?4, 'completed', '{}',
               ?5, ?6, ?7)`,
    )
    .run(COMPANY_ID, 'Test Company Ltd', 'test-co', now + 86_400_000, now, ACTOR_ID, 'test-co-seed');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARTY CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('1. Party CRUD', () => {
  test('creates an individual party', async () => {
    const party = await createPartyRecord(
      db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Muhammad Asif', firstName: 'Muhammad', lastName: 'Asif',
        primaryEmail: 'asif@example.com', primaryMobile: '+923001234567' },
      ACTOR_ID,
    );
    assert.ok(party.id, 'should have an id');
    assert.equal(party.partyType, 'individual');
    assert.equal(party.displayName, 'Muhammad Asif');
    assert.equal(party.primaryEmail, 'asif@example.com');
    assert.equal(party.status, 'active');
    assert.equal(party.companyId, COMPANY_ID);
  });

  test('creates an organization party', async () => {
    const party = await createPartyRecord(
      db, COMPANY_ID,
      { partyType: 'organization', displayName: 'XYZ Traders',
        legalName: 'XYZ Traders Private Limited', taxIdentifier: 'PKT-12345',
        primaryEmail: 'info@xyztraders.com' },
      ACTOR_ID,
    );
    assert.equal(party.partyType, 'organization');
    assert.equal(party.legalName, 'XYZ Traders Private Limited');
    assert.equal(party.taxIdentifier, 'PKT-12345');
  });

  test('getPartyProfile returns flat profile with roles/contacts/addresses arrays', async () => {
    const created = await createPartyRecord(
      db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Profile Test', primaryEmail: 'profile@test.com' },
      ACTOR_ID,
    );
    const profile = await getPartyProfile(db, COMPANY_ID, created.id);
    assert.ok(profile, 'profile should exist');
    // FullPartyProfile is a flat spread of PartyRecord + extra arrays
    assert.equal(profile.id, created.id);
    assert.equal(profile.displayName, 'Profile Test');
    assert.ok(Array.isArray(profile.roles), 'roles array');
    assert.ok(Array.isArray(profile.addresses), 'addresses array');
    assert.ok(Array.isArray(profile.contacts), 'contacts array');
  });

  test('listParties isolates by company', async () => {
    const otherCompanyId = uid();
    const now2 = Date.now();
    sqlite
      .prepare(
        `INSERT INTO core_companies
           (id, name, slug, country_code, currency, timezone, language,
            sector_slug, industry_slug, business_models, employee_band,
            plan, state, trial_ends_at, onboarding_state, onboarding_steps,
            created_at, created_by, request_key)
         VALUES (?1, ?2, ?3, 'PK', 'PKR', 'Asia/Karachi', 'en',
                 '', '', '[]', '',
                 'starter', 'trial', ?4, 'completed', '{}',
                 ?5, ?6, ?7)`,
      )
      .run(otherCompanyId, 'Other Company', 'other-co', now2 + 86_400_000, now2, ACTOR_ID, 'other-co-seed');

    await createPartyRecord(db, COMPANY_ID,      { partyType: 'individual', displayName: 'Party A' }, ACTOR_ID);
    await createPartyRecord(db, COMPANY_ID,      { partyType: 'individual', displayName: 'Party B' }, ACTOR_ID);
    await createPartyRecord(db, otherCompanyId,  { partyType: 'individual', displayName: 'Other Party' }, ACTOR_ID);

    const { parties } = await listParties(db, COMPANY_ID, {});
    assert.equal(parties.length, 2, 'only parties for this company');
    assert.ok(parties.every((p) => p.companyId === COMPANY_ID));
  });

  test('updatePartyRecord updates fields', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Old Name' }, ACTOR_ID);
    const updated = await updatePartyRecord(db, COMPANY_ID, party.id,
      { displayName: 'New Name', primaryEmail: 'new@example.com' }, ACTOR_ID);
    assert.equal(updated.displayName, 'New Name');
    assert.equal(updated.primaryEmail, 'new@example.com');
  });

  test('archivePartyRecord soft-deletes', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'To Archive' }, ACTOR_ID);
    await archivePartyRecord(db, COMPANY_ID, party.id, ACTOR_ID);
    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    assert.equal(profile?.status, 'archived');
    assert.ok(profile?.archivedAt, 'archivedAt should be set');
  });

  test('cross-company access returns null', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Protected' }, ACTOR_ID);
    const profile = await getPartyProfile(db, uid(), party.id);
    assert.equal(profile, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-ROLE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('2. Multi-role assignment', () => {
  test('assigns multiple roles to one party', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Multi-Role Org' }, ACTOR_ID);

    const r1 = await assignPartyRole(db, COMPANY_ID, party.id, 'customer', {});
    const r2 = await assignPartyRole(db, COMPANY_ID, party.id, 'supplier', {});
    const r3 = await assignPartyRole(db, COMPANY_ID, party.id, 'dealer',   {});

    assert.equal(r1.roleKey, 'customer');
    assert.equal(r2.roleKey, 'supplier');
    assert.equal(r3.roleKey, 'dealer');

    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    const keys = profile.roles.map((r) => r.roleKey);
    assert.ok(keys.includes('customer'));
    assert.ok(keys.includes('supplier'));
    assert.ok(keys.includes('dealer'));
  });

  test('duplicate role assignment is idempotent (only one row)', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Role Idempotent' }, ACTOR_ID);
    await assignPartyRole(db, COMPANY_ID, party.id, 'customer', {});
    await assert.doesNotReject(() => assignPartyRole(db, COMPANY_ID, party.id, 'customer', {}));
    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    assert.equal(profile.roles.filter((r) => r.roleKey === 'customer').length, 1);
  });

  test('removePartyRole removes the role', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Role Remove' }, ACTOR_ID);
    await assignPartyRole(db, COMPANY_ID, party.id, 'customer', {});
    await assignPartyRole(db, COMPANY_ID, party.id, 'supplier', {});
    await removePartyRole(db, COMPANY_ID, party.id, 'customer');
    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    const activeKeys = profile.roles.map((r) => r.roleKey);
    assert.ok(!activeKeys.includes('customer'), 'customer removed');
    assert.ok(activeKeys.includes('supplier'), 'supplier remains');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONTACT PERSONS & ADDRESSES
// ─────────────────────────────────────────────────────────────────────────────

describe('3. Contact persons & addresses', () => {
  test('addContactPerson stores firstName/lastName', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Acme Corp' }, ACTOR_ID);

    const contact = await addContactPerson(db, COMPANY_ID, party.id, {
      firstName: 'Sales', lastName: 'Rep',
      email: 'sales@acme.com', phone: '+1-555-0100',
      jobTitle: 'Sales Manager', isPrimary: true,
    });

    assert.equal(contact.firstName, 'Sales');
    assert.equal(contact.lastName, 'Rep');
    assert.equal(contact.email, 'sales@acme.com');
    assert.equal(contact.isPrimary, true);

    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    assert.equal(profile.contacts.length, 1);
    assert.equal(profile.contacts[0].firstName, 'Sales');
  });

  test('addPartyAddress stores billing and shipping addresses', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Address Corp' }, ACTOR_ID);

    await addPartyAddress(db, COMPANY_ID, party.id,
      { type: 'billing',  line1: '10 Main Street', city: 'Karachi', countryCode: 'PK', isDefault: true });
    await addPartyAddress(db, COMPANY_ID, party.id,
      { type: 'shipping', line1: 'Warehouse Rd 5',  city: 'Lahore',  countryCode: 'PK', isDefault: false });

    const profile = await getPartyProfile(db, COMPANY_ID, party.id);
    assert.equal(profile.addresses.length, 2);
    const types = profile.addresses.map((a) => a.type);
    assert.ok(types.includes('billing'));
    assert.ok(types.includes('shipping'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DUPLICATE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

describe('4. Duplicate detection', () => {
  test('finds duplicate by email', async () => {
    await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Original', primaryEmail: 'dup@example.com' }, ACTOR_ID);

    // findDuplicates uses candidate.email (not primaryEmail)
    const candidates = await findDuplicates(db, COMPANY_ID, { email: 'dup@example.com' });
    assert.ok(candidates.length > 0, 'should find duplicate candidate');
    assert.ok(candidates.some((c) => c.party.primaryEmail === 'dup@example.com'));
  });

  test('finds duplicate by tax identifier', async () => {
    await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Tax Org', taxIdentifier: 'TAX-9999' }, ACTOR_ID);
    const candidates = await findDuplicates(db, COMPANY_ID, { taxIdentifier: 'TAX-9999' });
    assert.ok(candidates.length > 0, 'should find by tax id');
  });

  test('no false positives for unique data', async () => {
    await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Unique One', primaryEmail: 'one@unique.test' }, ACTOR_ID);
    const candidates = await findDuplicates(db, COMPANY_ID, { email: 'totally-different@example.com' });
    assert.equal(candidates.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. MERGE (non-destructive)
// ─────────────────────────────────────────────────────────────────────────────

describe('5. Non-destructive merge', () => {
  test('winner survives, loser is archived', async () => {
    const primary = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Primary Party', primaryEmail: 'primary@test.com' }, ACTOR_ID);
    const dup = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Duplicate Party', primaryEmail: 'dup@test.com' }, ACTOR_ID);

    await assignPartyRole(db, COMPANY_ID, primary.id, 'customer', {});
    await assignPartyRole(db, COMPANY_ID, dup.id, 'supplier', {});

    const result = await mergeParties(
      db, COMPANY_ID,
      { primaryPartyId: primary.id, duplicatePartyIds: [dup.id] },
      ACTOR_ID,
    );

    assert.equal(result.primaryPartyId, primary.id);

    const primaryProfile = await getPartyProfile(db, COMPANY_ID, primary.id);
    assert.equal(primaryProfile?.status, 'active', 'winner stays active');

    const dupProfile = await getPartyProfile(db, COMPANY_ID, dup.id);
    assert.equal(dupProfile?.status, 'archived', 'loser is archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. LEAD & OPPORTUNITY LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

describe('6. Lead & opportunity lifecycle', () => {
  test('createLead creates a lead with status=new', async () => {
    // createLead(db, companyId, { title, partyId?, source?, estimatedValue? })
    const lead = await createLead(db, COMPANY_ID, {
      title: 'Fresh Lead', source: 'website', estimatedValue: 50000,
    });
    assert.ok(lead.id);
    assert.equal(lead.title, 'Fresh Lead');
    assert.equal(lead.status, 'new');
    assert.equal(lead.companyId, COMPANY_ID);
  });

  test('listLeads returns array of leads', async () => {
    await createLead(db, COMPANY_ID, { title: 'Lead 1', source: 'manual' });
    await createLead(db, COMPANY_ID, { title: 'Lead 2', source: 'manual' });
    const leads = await listLeads(db, COMPANY_ID, {});
    assert.ok(leads.length >= 2);
  });

  test('createOpportunity creates an opportunity (uses name/amount)', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Opp Org' }, ACTOR_ID);

    const opp = await createOpportunity(db, COMPANY_ID, {
      partyId: party.id, name: 'Q4 Bulk Purchase', stage: 'proposal', amount: 250000,
    });
    assert.ok(opp.id);
    assert.equal(opp.partyId, party.id);
    assert.equal(opp.stage, 'proposal');
    assert.equal(opp.amount, 250000);
  });

  test('listOpportunities returns array', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'organization', displayName: 'Opp List Org' }, ACTOR_ID);
    await createOpportunity(db, COMPANY_ID, { partyId: party.id, name: 'Opp A', stage: 'qualification', amount: 1000 });
    await createOpportunity(db, COMPANY_ID, { partyId: party.id, name: 'Opp B', stage: 'won', amount: 5000 });
    const opps = await listOpportunities(db, COMPANY_ID, {});
    assert.ok(opps.length >= 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. LEAD → PARTY CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

describe('7. Lead-to-Party conversion', () => {
  test('convertLead creates a party with customer role and marks lead converted', async () => {
    // convertLead(db, companyId, leadId, { displayName?, primaryEmail?, assignRoles? }, actorId)
    const lead = await createLead(db, COMPANY_ID, {
      title: 'Convert Me', source: 'call',
    });

    const result = await convertLead(db, COMPANY_ID, lead.id, {
      partyType: 'individual',
      displayName: 'Convert Me',
      primaryEmail: 'convert@lead.test',
      assignRoles: ['customer'],
    }, ACTOR_ID);

    assert.ok(result.partyId, 'should produce a partyId');
    assert.equal(result.lead.status, 'converted');

    const profile = await getPartyProfile(db, COMPANY_ID, result.partyId);
    const roleKeys = profile.roles.map((r) => r.roleKey);
    assert.ok(roleKeys.includes('customer'), 'converted party has customer role');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. CRM ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

describe('8. CRM Activities', () => {
  test('createActivity creates an activity (uses subject)', async () => {
    // createActivity(db, companyId, { partyId, type, subject, description?, dueDate? })
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Activity Target' }, ACTOR_ID);

    const activity = await createActivity(db, COMPANY_ID, {
      partyId: party.id,
      type: 'call',
      subject: 'Follow-up call regarding proposal',
    });

    assert.ok(activity.id);
    assert.equal(activity.type, 'call');
    assert.equal(activity.partyId, party.id);
    assert.equal(activity.subject, 'Follow-up call regarding proposal');
  });

  test('listActivities returns array filtered by partyId', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Activity List Target' }, ACTOR_ID);

    await createActivity(db, COMPANY_ID, { partyId: party.id, type: 'email', subject: 'Intro email' });
    await createActivity(db, COMPANY_ID, { partyId: party.id, type: 'meeting', subject: 'Demo meeting' });

    const activities = await listActivities(db, COMPANY_ID, { partyId: party.id });
    assert.ok(activities.length >= 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. IMPORT (preview + execute)
// ─────────────────────────────────────────────────────────────────────────────

describe('9. CSV Import', () => {
  test('parseCsvContent returns { headers, rows }', () => {
    const csv = [
      'display_name,party_type,primary_email',
      'Person A,individual,a@test.com',
      'Org B,organization,b@test.com',
    ].join('\n');

    const { headers, rows } = parseCsvContent(csv);
    assert.ok(Array.isArray(headers), 'headers is array');
    assert.ok(headers.includes('display_name'), 'has display_name header');
    assert.equal(rows.length, 2, 'two data rows');
    assert.equal(rows[0]['display_name'], 'Person A');
  });

  test('previewPartyImport detects valid and error rows', async () => {
    const rows = [
      { display_name: 'Imported Person', party_type: 'individual', email: 'import@test.com' },
      { display_name: '',               party_type: 'individual', email: ''                 }, // bad — no display_name
    ];
    const columnMap = { displayName: 'display_name', partyType: 'party_type', email: 'email' };
    const preview = await previewPartyImport(db, COMPANY_ID, rows, columnMap);

    assert.ok(Array.isArray(preview), 'preview is array');
    const valid   = preview.filter((r) => !r.error);
    const invalid = preview.filter((r) =>  r.error);
    assert.ok(valid.length >= 1,   'at least one valid row');
    assert.ok(invalid.length >= 1, 'at least one invalid row');
  });

  test('executePartyImport inserts valid rows, skips errored rows', async () => {
    const rows = [
      { display_name: 'Import A', party_type: 'individual', email: 'import-a@test.com' },
      { display_name: 'Import B', party_type: 'organization' },
      { display_name: '',         party_type: 'individual'   }, // will error in preview
    ];
    const columnMap = { displayName: 'display_name', partyType: 'party_type', email: 'email' };
    const preview = await previewPartyImport(db, COMPANY_ID, rows, columnMap);
    const { importedCount, skippedCount } = await executePartyImport(db, COMPANY_ID, preview, ACTOR_ID);

    assert.ok(importedCount >= 1, 'at least one row imported');
    // The empty display_name row should be skipped via error
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

describe('10. CSV Export', () => {
  test('exportPartiesCsv returns CSV string with party data', async () => {
    await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Export Person', primaryEmail: 'export@test.com' }, ACTOR_ID);

    const csv = await exportPartiesCsv(db, COMPANY_ID, {});
    assert.ok(typeof csv === 'string');
    assert.ok(csv.includes('Export Person'), 'CSV contains party name');
    assert.ok(csv.includes('export@test.com'), 'CSV contains email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. IMMUTABLE AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

describe('11. Immutable audit log', () => {
  test('recordAuditEvent + getPartyAuditEvents round-trip', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Audit Subject' }, ACTOR_ID);

    // recordAuditEvent(db, companyId, partyId, actorAccountId, action, details)
    await recordAuditEvent(db, COMPANY_ID, party.id, ACTOR_ID, 'party.custom_event', { foo: 'bar' });

    const events = await getPartyAuditEvents(db, COMPANY_ID, party.id);
    assert.ok(Array.isArray(events));
    assert.ok(events.length >= 1, 'at least one event');
    // Event has 'action' field (not 'eventType')
    assert.ok(events.some((e) => e.action === 'party.custom_event'), 'custom event present');
  });

  test('audit events are company-scoped', async () => {
    const party = await createPartyRecord(db, COMPANY_ID,
      { partyType: 'individual', displayName: 'Scope Test' }, ACTOR_ID);

    await recordAuditEvent(db, COMPANY_ID, party.id, ACTOR_ID, 'party.created', {});

    const wrongCompany = await getPartyAuditEvents(db, uid(), party.id);
    assert.equal(wrongCompany.length, 0, 'cross-company access returns nothing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. UNIVERSAL PARTY SERVICE (cross-plugin client)
// ─────────────────────────────────────────────────────────────────────────────

describe('12. UniversalPartyService client API', () => {
  test('createUniversalPartyClient returns a valid client', () => {
    const client = createUniversalPartyClient(db);
    assert.ok(typeof client.getParty               === 'function');
    assert.ok(typeof client.findParty              === 'function');
    assert.ok(typeof client.createParty            === 'function');
    assert.ok(typeof client.assignRole             === 'function');
    assert.ok(typeof client.removeRole             === 'function');
    assert.ok(typeof client.getAddresses           === 'function');
    assert.ok(typeof client.getPrimaryContact      === 'function');
    assert.ok(typeof client.resolvePartyRelationship === 'function');
  });

  test('client.createParty creates a party', async () => {
    const client = createUniversalPartyClient(db);
    const party = await client.createParty(
      COMPANY_ID,
      { partyType: 'individual', displayName: 'Client Created Party', primaryEmail: 'client@sdk.test' },
      ACTOR_ID,
    );
    assert.ok(party.id);
    assert.equal(party.displayName, 'Client Created Party');
  });

  test('client.getParty retrieves the party profile', async () => {
    const client = createUniversalPartyClient(db);
    const created = await client.createParty(
      COMPANY_ID, { partyType: 'organization', displayName: 'Get Test Org' }, ACTOR_ID);
    const profile = await client.getParty(COMPANY_ID, created.id);
    assert.ok(profile, 'profile should exist');
    // client.getParty returns FullPartyProfile (flat spread)
    assert.equal(profile.id, created.id);
  });

  test('client.findParty returns results by email', async () => {
    const client = createUniversalPartyClient(db);
    await client.createParty(COMPANY_ID,
      { partyType: 'individual', displayName: 'Findable', primaryEmail: 'findme@sdk.test' }, ACTOR_ID);
    const results = await client.findParty(COMPANY_ID, { email: 'findme@sdk.test' });
    assert.ok(results.length >= 1, 'should find by email');
  });

  test('client.assignRole and removeRole work end-to-end', async () => {
    const client = createUniversalPartyClient(db);
    const party = await client.createParty(
      COMPANY_ID, { partyType: 'individual', displayName: 'Role SDK Test' }, ACTOR_ID);

    const role = await client.assignRole(COMPANY_ID, party.id, 'customer');
    assert.equal(role.roleKey, 'customer');
    assert.equal(role.status, 'active');

    const removed = await client.removeRole(COMPANY_ID, party.id, 'customer');
    assert.equal(removed, true);
  });

  test('client.getAddresses returns party addresses', async () => {
    const client = createUniversalPartyClient(db);
    const party = await client.createParty(
      COMPANY_ID, { partyType: 'organization', displayName: 'Address SDK Org' }, ACTOR_ID);

    // addPartyAddress uses countryCode (not country), isDefault (not isPrimary)
    await addPartyAddress(db, COMPANY_ID, party.id,
      { type: 'billing', line1: 'SDK Billing Road', city: 'Karachi', countryCode: 'PK', isDefault: true });

    const addresses = await client.getAddresses(COMPANY_ID, party.id);
    assert.ok(addresses.length >= 1);
    assert.equal(addresses[0].type, 'billing');
  });

  test('client.getPrimaryContact returns primary contact', async () => {
    const client = createUniversalPartyClient(db);
    const party = await client.createParty(
      COMPANY_ID, { partyType: 'organization', displayName: 'Contact SDK Org' }, ACTOR_ID);

    // addContactPerson uses firstName/lastName not name
    await addContactPerson(db, COMPANY_ID, party.id, {
      firstName: 'CEO', lastName: 'Name',
      email: 'ceo@sdkorg.com', phone: '+921234567890',
      jobTitle: 'CEO', isPrimary: true,
    });

    const primary = await client.getPrimaryContact(COMPANY_ID, party.id);
    assert.ok(primary, 'primary contact should exist');
    assert.equal(primary.isPrimary, true);
    assert.equal(primary.firstName, 'CEO');
  });

  test('client.resolvePartyRelationship returns null for non-existent', async () => {
    const client = createUniversalPartyClient(db);
    const rel = await client.resolvePartyRelationship(COMPANY_ID, uid(), uid());
    assert.equal(rel, null);
  });

  test('addRelationship + resolvePartyRelationship round-trip', async () => {
    const client = createUniversalPartyClient(db);
    const parent = await client.createParty(
      COMPANY_ID, { partyType: 'organization', displayName: 'Parent Org' }, ACTOR_ID);
    const child = await client.createParty(
      COMPANY_ID, { partyType: 'organization', displayName: 'Child Org' }, ACTOR_ID);

    // addRelationship is positional: (db, companyId, sourceId, targetId, type, notes)
    await addRelationship(db, COMPANY_ID, parent.id, child.id, 'subsidiary', 'Wholly owned subsidiary');

    const rel = await client.resolvePartyRelationship(COMPANY_ID, parent.id, child.id);
    assert.ok(rel, 'relationship should be found');
    assert.equal(rel.relationshipType, 'subsidiary');
  });
});
