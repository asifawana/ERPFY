import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../core/server';
import type { EapManifest } from './manifest';
import { computePackageHash } from './signing';

export const MAX_TOTAL_PACKAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_FILE_COUNT = 50;

/**
 * Storage Tier Classification:
 * The current local filesystem / memory quarantine storage is designed for LOCAL DEVELOPMENT ONLY.
 * For Cloudflare Workers and multi-instance serverless deployments, durable object storage (Cloudflare R2
 * or S3-compatible bucket) is mandatory so that quarantined packages persist across worker invocations.
 */
export const QUARANTINE_STORAGE_TIER = 'development-local' as const;
export const PRODUCTION_STORAGE_REQUIREMENT =
  'Cloudflare R2 or S3-compatible durable object storage required for production deployments' as const;

const BANNED_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.sh', '.bat', '.cmd', '.ps1', '.vbs',
  '.py', '.php', '.rb', '.bin', '.com', '.scr', '.pif', '.application',
  '.gadget', '.msi', '.msp', '.hta', '.cpl', '.msc', '.jar',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.json', '.css', '.svg', '.png', '.jpg', '.jpeg',
  '.webp', '.gif', '.ico', '.md', '.txt', '.html',
]);

export type QuarantinedPackage = {
  appId: string;
  version: string;
  packageHash: string;
  manifest: EapManifest;
  files: Record<string, string>;
  quarantinedAt: number;
  status: 'quarantined' | 'verified' | 'rejected';
};

// In-memory isolated storage fallback for serverless/testing environments
const memoryQuarantineStore: Map<string, QuarantinedPackage> =
  ((globalThis as unknown as { __erpQuarantineStore?: Map<string, QuarantinedPackage> }).__erpQuarantineStore) ||
  new Map<string, QuarantinedPackage>();
(globalThis as unknown as { __erpQuarantineStore?: Map<string, QuarantinedPackage> }).__erpQuarantineStore = memoryQuarantineStore;

const QUARANTINE_DIR = path.resolve(process.cwd(), '.quarantine', 'packages');

/**
 * Validates a single filename against path traversal, control characters, and unsafe extensions.
 */
export function validatePackageFilename(filename: string): void {
  if (typeof filename !== 'string' || !filename.trim()) {
    throw new ApiError(400, 'Invalid empty filename in package bundle.');
  }

  // Reject null bytes and control characters
  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i);
    if (code < 32 || code === 127) {
      throw new ApiError(400, `Forbidden control character in filename '${filename}'.`);
    }
  }

  // Reject directory traversal attempts
  if (
    filename.includes('..') ||
    filename.startsWith('/') ||
    filename.startsWith('\\') ||
    /^[a-zA-Z]:/.test(filename)
  ) {
    throw new ApiError(400, `Path traversal detected in filename '${filename}'.`);
  }

  // Normalize path separators to forward slashes for cross-platform consistency
  const normalized = filename.replace(/\\/g, '/');

  // Check path segments for dangerous names or traversal
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !segment.trim()) {
      throw new ApiError(400, `Invalid path segment '${segment}' in filename '${filename}'.`);
    }
    if (/[*?"<>|:]/.test(segment)) {
      throw new ApiError(400, `Forbidden character in filename '${filename}'.`);
    }
  }

  // Check file extension
  const ext = path.extname(filename).toLowerCase();
  if (!ext) {
    throw new ApiError(400, `Missing file extension in package file '${filename}'.`);
  }

  if (BANNED_EXTENSIONS.has(ext)) {
    throw new ApiError(400, `Executable or forbidden file extension '${ext}' in package file '${filename}'.`);
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ApiError(400, `Unsupported file extension '${ext}' in package file '${filename}'.`);
  }
}

/**
 * Validates the entire package bundle: file count, size limits, filename safety, and manifest entrypoint integrity.
 */
export function validatePackageBundle(
  manifest: EapManifest,
  codeFiles: Record<string, string> = {},
): { sanitizedFiles: Record<string, string>; totalBytes: number } {
  const entries = Object.entries(codeFiles);

  if (entries.length === 0) {
    if (manifest.entrypoints?.client || manifest.entrypoints?.server) {
      throw new ApiError(400, 'Package bundle cannot be empty when entrypoints are declared in manifest.');
    }
    // Default minimal entrypoint placeholder for declarative manifest-only apps
    return { sanitizedFiles: { 'index.js': '// declarative manifest-only package' }, totalBytes: 0 };
  }

  if (entries.length > MAX_FILE_COUNT) {
    throw new ApiError(400, `Package exceeds maximum allowed file count of ${MAX_FILE_COUNT} (received ${entries.length}).`);
  }

  let totalBytes = 0;
  const sanitizedFiles: Record<string, string> = {};

  for (const [filename, content] of entries) {
    validatePackageFilename(filename);

    if (typeof content !== 'string') {
      throw new ApiError(400, `Content for file '${filename}' must be a string.`);
    }

    const fileBytes = Buffer.byteLength(content, 'utf8');
    if (fileBytes > MAX_FILE_BYTES) {
      throw new ApiError(400, `File '${filename}' exceeds maximum allowed size of 2 MB.`);
    }

    totalBytes += fileBytes;
    if (totalBytes > MAX_TOTAL_PACKAGE_BYTES) {
      throw new ApiError(400, 'Total package bundle size exceeds maximum allowed limit of 5 MB.');
    }

    const normalizedKey = filename.replace(/\\/g, '/');
    sanitizedFiles[normalizedKey] = content;
  }

  // Verify that declared entrypoints in manifest actually exist in the uploaded bundle
  if (manifest.entrypoints) {
    if (manifest.entrypoints.client) {
      const clientEntry = manifest.entrypoints.client.replace(/\\/g, '/').replace(/^\.\//, '');
      if (!sanitizedFiles[clientEntry]) {
        throw new ApiError(400, `Declared client entrypoint '${manifest.entrypoints.client}' was not found in uploaded files.`);
      }
    }
    if (manifest.entrypoints.server) {
      const serverEntry = manifest.entrypoints.server.replace(/\\/g, '/').replace(/^\.\//, '');
      if (!sanitizedFiles[serverEntry]) {
        throw new ApiError(400, `Declared server entrypoint '${manifest.entrypoints.server}' was not found in uploaded files.`);
      }
    }
  }

  return { sanitizedFiles, totalBytes };
}

/**
 * Stores a package into isolated quarantine storage with cryptographic hash verification.
 */
export async function storeQuarantinedPackage(pkg: QuarantinedPackage): Promise<void> {
  // Validate hash consistency before persisting
  const manifestJson = JSON.stringify(pkg.manifest);
  const calculatedHash = computePackageHash(manifestJson, pkg.files);

  if (calculatedHash !== pkg.packageHash) {
    throw new ApiError(400, 'Package hash mismatch during quarantine storage. Bundle integrity violated.');
  }

  const key = `${pkg.appId}:${pkg.version}`;
  memoryQuarantineStore.set(key, { ...pkg });

  try {
    const pkgDir = path.join(QUARANTINE_DIR, pkg.appId, pkg.version);
    fs.mkdirSync(pkgDir, { recursive: true, mode: 0o700 });

    // Store manifest
    fs.writeFileSync(path.join(pkgDir, 'manifest.json'), manifestJson, { mode: 0o600 });

    // Store package metadata
    const metadata = {
      appId: pkg.appId,
      version: pkg.version,
      packageHash: pkg.packageHash,
      quarantinedAt: pkg.quarantinedAt,
      status: pkg.status,
    };
    fs.writeFileSync(path.join(pkgDir, 'quarantine-metadata.json'), JSON.stringify(metadata, null, 2), { mode: 0o600 });

    // Store code files
    const filesDir = path.join(pkgDir, 'files');
    if (fs.existsSync(filesDir)) {
      fs.rmSync(filesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(filesDir, { recursive: true, mode: 0o700 });

    for (const [relativePath, content] of Object.entries(pkg.files)) {
      const filePath = path.join(filesDir, relativePath);
      const parentDir = path.dirname(filePath);
      fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(filePath, content, { mode: 0o600 });
    }
  } catch {
    // Filesystem may be read-only in some serverless/test environments; in-memory store remains authoritative
  }
}

/**
 * Retrieves a quarantined package and verifies cryptographic tamper-proofing.
 */
export async function getQuarantinedPackage(appId: string, version: string): Promise<QuarantinedPackage | null> {
  const key = `${appId}:${version}`;
  const fromMemory = memoryQuarantineStore.get(key);

  if (fromMemory) {
    // Re-verify hash before returning
    const manifestJson = JSON.stringify(fromMemory.manifest);
    const calculated = computePackageHash(manifestJson, fromMemory.files);
    if (calculated !== fromMemory.packageHash) {
      throw new ApiError(500, 'Quarantined package failed integrity check: stored content tampered.');
    }
    return fromMemory;
  }

  try {
    const pkgDir = path.join(QUARANTINE_DIR, appId, version);
    if (!fs.existsSync(pkgDir)) return null;

    const manifestRaw = fs.readFileSync(path.join(pkgDir, 'manifest.json'), 'utf8');
    const metaRaw = fs.readFileSync(path.join(pkgDir, 'quarantine-metadata.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw) as EapManifest;
    const meta = JSON.parse(metaRaw);

    const filesDir = path.join(pkgDir, 'files');
    const files: Record<string, string> = {};

    function readDirRecursive(dir: string, base: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.join(base, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          readDirRecursive(full, rel);
        } else {
          files[rel] = fs.readFileSync(full, 'utf8');
        }
      }
    }

    if (fs.existsSync(filesDir)) {
      readDirRecursive(filesDir, '');
    }

    const calculatedHash = computePackageHash(manifestRaw, files);
    if (calculatedHash !== meta.packageHash) {
      throw new ApiError(500, 'Quarantined package failed integrity check on disk.');
    }

    const pkg: QuarantinedPackage = {
      appId,
      version,
      packageHash: meta.packageHash,
      manifest,
      files,
      quarantinedAt: meta.quarantinedAt,
      status: meta.status,
    };

    memoryQuarantineStore.set(key, pkg);
    return pkg;
  } catch {
    return null;
  }
}

/**
 * Purges a quarantined package from storage.
 */
export async function deleteQuarantinedPackage(appId: string, version: string): Promise<void> {
  const key = `${appId}:${version}`;
  memoryQuarantineStore.delete(key);

  try {
    const pkgDir = path.join(QUARANTINE_DIR, appId, version);
    if (fs.existsSync(pkgDir)) {
      fs.rmSync(pkgDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup error if already removed
  }
}
