/**
 * ERPfy.net Database Backup Utility
 * Exports database snapshot to backup archive.
 * Usage: node --import tsx scripts/backup-db.ts [outputPath]
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BackupMetadata {
  version: string;
  timestamp: string;
  databaseDriver: string;
  tables: string[];
  recordsCount: Record<string, number>;
}

export function performDatabaseBackup(db: any, outputPath?: string): { metadata: BackupMetadata; snapshotJson: string; filepath?: string } {
  const timestamp = new Date().toISOString();
  const tables = [
    'core_accounts',
    'core_companies',
    'core_memberships',
    'core_company_settings',
    'crm_parties',
    'core_audit_logs',
  ];

  const dump: Record<string, unknown[]> = {};
  const recordsCount: Record<string, number> = {};

  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      const results = rows.results || rows;
      dump[table] = results;
      recordsCount[table] = results.length;
    } catch {
      dump[table] = [];
      recordsCount[table] = 0;
    }
  }

  const metadata: BackupMetadata = {
    version: '1.0.0',
    timestamp,
    databaseDriver: 'sqlite/d1',
    tables,
    recordsCount,
  };

  const snapshotJson = JSON.stringify({ metadata, data: dump }, null, 2);

  let filepath: string | undefined;
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, snapshotJson, 'utf8');
    filepath = outputPath;
  }

  return { metadata, snapshotJson, filepath };
}

// CLI Execution
if (process.argv[1]?.endsWith('backup-db.ts')) {
  console.log('[Backup] Starting database backup...');
  const target = path.resolve(process.cwd(), 'tmp', `backup-${Date.now()}.json`);
  console.log(`[Backup] Output file target: ${target}`);
}
