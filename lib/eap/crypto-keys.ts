import crypto from 'node:crypto';

export type KeyPurpose =
  | 'release-signing'
  | 'runtime-token'
  | 'webhook-signing'
  | 'company-secret-encryption';

/**
 * Derives a purpose-specific cryptographic key from the platform master secret.
 * Uses HKDF (RFC 5869) to guarantee complete domain separation:
 * a compromise of one derived key (e.g. runtime-token) cannot be used
 * to forge signatures under another purpose (e.g. release-signing).
 */
export function getDerivedPlatformKey(masterSecret: string, purpose: KeyPurpose): Buffer {
  const salt = 'erpfy-platform-domain-keys-v1';
  const info = `erpfy:${purpose}:v1`;
  const ab = crypto.hkdfSync('sha256', Buffer.from(masterSecret, 'utf8'), salt, info, 32);
  return Buffer.from(ab);
}

export function getDerivedPlatformSecretHex(masterSecret: string, purpose: KeyPurpose): string {
  return getDerivedPlatformKey(masterSecret, purpose).toString('hex');
}
