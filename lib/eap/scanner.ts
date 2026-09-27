import type { EapManifest } from './manifest';

export type ScanResult = {
  status: 'PASS' | 'WARNING' | 'FAIL';
  issues: string[];
  warnings: string[];
  metrics: {
    scannedFiles: number;
    permissionCount: number;
    hasServerEntrypoint: boolean;
    hasClientEntrypoint: boolean;
    scannedAt: number;
  };
};

const FORBIDDEN_CODE_PATTERNS: { pattern: RegExp; message: string; severity: 'FAIL' | 'WARNING' }[] = [
  { pattern: /\beval\s*\(/, message: 'Forbidden use of eval() detected.', severity: 'FAIL' },
  { pattern: /\bnew\s+Function\s*\(/, message: 'Forbidden use of dynamic Function constructor detected.', severity: 'FAIL' },
  { pattern: /\bchild_process\b/, message: 'Unauthorized access to OS process execution (child_process).', severity: 'FAIL' },
  { pattern: /\b(execSync|spawnSync|exec|spawn)\s*\(/, message: 'Unauthorized execution of shell processes.', severity: 'FAIL' },
  { pattern: /\bprocess\.exit\b/, message: 'Attempt to terminate host process with process.exit().', severity: 'FAIL' },
  { pattern: /\bDROP\s+TABLE\s+(?!app_)/i, message: 'Destructive SQL DROP TABLE on non-app table detected.', severity: 'FAIL' },
  { pattern: /\bALTER\s+TABLE\s+core_/i, message: 'Forbidden alteration of core system tables detected.', severity: 'FAIL' },
  { pattern: /\bTRUNCATE\s+(?!app_)/i, message: 'Forbidden TRUNCATE query detected.', severity: 'FAIL' },
  { pattern: /:root\s*\{[^}]*(--erpfy-|background|color)/, message: 'Forbidden global :root theme override detected. Plugins must inherit ERPFY theme tokens.', severity: 'FAIL' },
  { pattern: /\b(body|html)\s*\{[^}]*(background|color|margin|padding|font)/, message: 'Forbidden destructive body/html CSS override detected.', severity: 'FAIL' },
  { pattern: /\*\s*\{[^}]*(margin|padding|background|color|font-family)/, message: "Forbidden destructive global '*' CSS selector detected.", severity: 'FAIL' },
  { pattern: /(?:\bid=["'](?:admin-content|erpfy-shell|erpfy-sidebar|erpfy-topbar)["'])/, message: 'Forbidden attempt to create duplicate platform shell elements.', severity: 'FAIL' },
  { pattern: /\blocalStorage\b/, message: 'Direct browser localStorage usage detected; prefer ERP settings API.', severity: 'WARNING' },
  { pattern: /\bfetch\s*\(\s*['"`]http:\/\//, message: 'Insecure unencrypted HTTP request detected.', severity: 'WARNING' },
];

const DISALLOWED_PERMISSIONS = [
  'full_database_access',
  'system.admin',
  'core.drop_tables',
  'root.all',
];

const SENSITIVE_PERMISSIONS = [
  'payments.write',
  'settings.write',
  'invoices.write',
];

/**
 * Executes static security and policy scan on an EAP application package.
 */
export function scanEapPackage(
  manifest: EapManifest,
  codeContents: Record<string, string> = {},
): ScanResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Permission checks
  for (const perm of manifest.permissions) {
    if (DISALLOWED_PERMISSIONS.includes(perm)) {
      issues.push(`Prohibited permission requested: '${perm}'.`);
    }
    if (SENSITIVE_PERMISSIONS.includes(perm)) {
      warnings.push(`High-risk permission requested: '${perm}'. Requires explicit tenant warning.`);
    }
  }

  // 2. Scan code files if provided
  let scannedFiles = 0;
  for (const [filename, content] of Object.entries(codeContents)) {
    scannedFiles++;
    for (const rule of FORBIDDEN_CODE_PATTERNS) {
      if (rule.pattern.test(content)) {
        const msg = `[${filename}] ${rule.message}`;
        if (rule.severity === 'FAIL') {
          issues.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }
  }

  const status: 'PASS' | 'WARNING' | 'FAIL' = issues.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARNING' : 'PASS';

  return {
    status,
    issues,
    warnings,
    metrics: {
      scannedFiles,
      permissionCount: manifest.permissions.length,
      hasServerEntrypoint: Boolean(manifest.entrypoints?.server),
      hasClientEntrypoint: Boolean(manifest.entrypoints?.client),
      scannedAt: Date.now(),
    },
  };
}
