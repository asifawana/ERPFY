/**
 * ERPfy.net Database Restore Utility
 * Restores database snapshot from backup archive into a target database.
 * Usage: node --import tsx scripts/restore-db.ts [inputPath]
 */

import * as fs from 'fs';

export function performDatabaseRestore(
  targetDb: any,
  backupPayloadOrPath: string,
): { success: boolean; restoredTables: string[]; totalRecordsRestored: number } {
  let content = backupPayloadOrPath;
  if (!backupPayloadOrPath.startsWith('{') && fs.existsSync(backupPayloadOrPath)) {
    content = fs.readFileSync(backupPayloadOrPath, 'utf8');
  }

  const parsed = JSON.parse(content);
  const data = parsed.data || {};
  const tables = Object.keys(data);
  let totalRecordsRestored = 0;

  for (const table of tables) {
    const rows = data[table] || [];
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length === 0) continue;

      const placeholders = keys.map((_, i) => `?${i + 1}`).join(', ');
      const cols = keys.join(', ');
      const values = keys.map((k) => row[k]);

      const sql = `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`;
      try {
        const stmt = targetDb.prepare(sql);
        if (typeof stmt.bind === 'function') {
          stmt.bind(...values).run();
        } else {
          stmt.run(...values);
        }
        totalRecordsRestored++;
      } catch (err) {
        // Continue restoring remaining records
      }
    }
  }

  return {
    success: true,
    restoredTables: tables,
    totalRecordsRestored,
  };
}
