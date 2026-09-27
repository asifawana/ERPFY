import type { D1Database } from '@cloudflare/workers-types';
import type { PartyRecord, PartyType, PartyRoleKey } from '../contracts/types';
import { createPartyRecord, listParties } from './party-service';
import { findDuplicates } from './duplicate-service';

export interface ImportPreviewRow {
  index: number;
  displayName: string;
  partyType: PartyType;
  legalName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  primaryMobile?: string;
  taxIdentifier?: string;
  roleKey?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  error?: string;
}

export function parseCsvContent(csvString: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
    const row: Record<string, string> = {};
    rawHeaders.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers: rawHeaders, rows };
}

export async function previewPartyImport(
  db: D1Database,
  companyId: string,
  rows: Record<string, string>[],
  columnMap: {
    displayName: string;
    partyType?: string;
    legalName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    taxId?: string;
    roleKey?: string;
  },
): Promise<ImportPreviewRow[]> {
  const preview: ImportPreviewRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const displayName = raw[columnMap.displayName]?.trim();
    const rawType = (columnMap.partyType ? raw[columnMap.partyType]?.trim().toLowerCase() : 'person') as PartyType;
    const partyType: PartyType = rawType === 'organization' || rawType === 'household' ? rawType : 'person';
    const email = columnMap.email ? raw[columnMap.email]?.trim() : '';
    const phone = columnMap.phone ? raw[columnMap.phone]?.trim() : '';
    const mobile = columnMap.mobile ? raw[columnMap.mobile]?.trim() : '';
    const taxIdentifier = columnMap.taxId ? raw[columnMap.taxId]?.trim() : '';
    const legalName = columnMap.legalName ? raw[columnMap.legalName]?.trim() : '';
    const roleKey = columnMap.roleKey ? raw[columnMap.roleKey]?.trim() : 'customer';

    if (!displayName) {
      preview.push({
        index: i,
        displayName: '',
        partyType,
        error: 'Missing required display name.',
        isDuplicate: false,
      });
      continue;
    }

    const dups = await findDuplicates(db, companyId, {
      email,
      phone,
      mobile,
      taxIdentifier,
    });

    preview.push({
      index: i,
      displayName,
      partyType,
      legalName,
      primaryEmail: email,
      primaryPhone: phone,
      primaryMobile: mobile,
      taxIdentifier,
      roleKey,
      isDuplicate: dups.length > 0,
      duplicateReason: dups.length > 0 ? dups[0].reason : undefined,
    });
  }

  return preview;
}

export async function executePartyImport(
  db: D1Database,
  companyId: string,
  previewRows: ImportPreviewRow[],
  actorAccountId: string,
  skipDuplicates: boolean = true,
): Promise<{ importedCount: number; skippedCount: number; errors: string[] }> {
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const row of previewRows) {
    if (row.error) {
      errors.push(`Row ${row.index + 1}: ${row.error}`);
      continue;
    }

    if (row.isDuplicate && skipDuplicates) {
      skippedCount++;
      continue;
    }

    try {
      await createPartyRecord(
        db,
        companyId,
        {
          partyType: row.partyType,
          displayName: row.displayName,
          legalName: row.legalName,
          primaryEmail: row.primaryEmail,
          primaryPhone: row.primaryPhone,
          primaryMobile: row.primaryMobile,
          taxIdentifier: row.taxIdentifier,
          source: 'import',
          initialRoles: row.roleKey ? [row.roleKey as PartyRoleKey] : ['customer'],
        },
        actorAccountId,
      );
      importedCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Insert failed';
      errors.push(`Row ${row.index + 1}: ${msg}`);
    }
  }

  return { importedCount, skippedCount, errors };
}

export async function exportPartiesCsv(
  db: D1Database,
  companyId: string,
  options: { roleKey?: string } = {},
): Promise<string> {
  const { parties } = await listParties(db, companyId, {
    limit: 1000,
    roleKey: options.roleKey,
  });

  const headers = [
    'ID',
    'Type',
    'Display Name',
    'Legal Name',
    'Roles',
    'Email',
    'Phone',
    'Mobile',
    'Tax ID',
    'Website',
    'Status',
    'Created At',
  ];

  const lines = [headers.join(',')];

  for (const p of parties) {
    const row = [
      `"${p.id}"`,
      `"${p.partyType}"`,
      `"${p.displayName.replace(/"/g, '""')}"`,
      `"${p.legalName.replace(/"/g, '""')}"`,
      `"${p.roles.join(';')}"`,
      `"${p.primaryEmail}"`,
      `"${p.primaryPhone}"`,
      `"${p.primaryMobile}"`,
      `"${p.taxIdentifier}"`,
      `"${p.website}"`,
      `"${p.status}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}
