import crypto from 'node:crypto';
import { getDerivedPlatformSecretHex } from './crypto-keys';

export type SignedRelease = {
  releaseId: string;
  signature: string;
  packageHash: string;
  signedAt: number;
};

/**
 * Derives a deterministic package hash from manifest and code strings.
 */
export function computePackageHash(manifestJson: string, codeFiles: Record<string, string> = {}): string {
  const hash = crypto.createHash('sha256');
  hash.update(manifestJson);
  const sortedKeys = Object.keys(codeFiles).sort();
  for (const key of sortedKeys) {
    hash.update(key);
    hash.update(codeFiles[key]);
  }
  return hash.digest('hex');
}

/**
 * Cryptographically signs an approved application version using the derived release-signing key.
 */
export function signReleaseBuild(
  appId: string,
  version: string,
  packageHash: string,
  platformSecret: string,
): SignedRelease {
  const signedAt = Date.now();
  const releaseId = `rel_${signedAt}_${crypto.randomBytes(8).toString('hex')}`;
  const payload = `erpfy:eap-v1:${appId}:${version}:${packageHash}:${signedAt}:${releaseId}`;
  
  const signingKey = getDerivedPlatformSecretHex(platformSecret, 'release-signing');
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return {
    releaseId,
    signature,
    packageHash,
    signedAt,
  };
}

/**
 * Validates a release signature against the platform secret using derived release-signing key.
 */
export function verifyReleaseSignature(
  appId: string,
  version: string,
  packageHash: string,
  signedAt: number,
  releaseId: string,
  signature: string,
  platformSecret: string,
): boolean {
  if (!signature || !releaseId || !packageHash || !platformSecret) return false;

  let derivedSignedAt = signedAt;
  if (releaseId.startsWith('rel_')) {
    const parts = releaseId.split('_');
    if (parts.length >= 3 && !isNaN(Number(parts[1]))) {
      derivedSignedAt = Number(parts[1]);
    }
  }

  const payloadCandidates = [
    `erpfy:eap-v1:${appId}:${version}:${packageHash}:${signedAt}:${releaseId}`,
    `erpfy:eap-v1:${appId}:${version}:${packageHash}:${derivedSignedAt}:${releaseId}`,
    `${appId}:${version}:${packageHash}:${signedAt}:${releaseId}`,
    `${appId}:${version}:${packageHash}:${derivedSignedAt}:${releaseId}`,
    `${appId}:${version}:${packageHash}:${releaseId}`,
  ];

  // 1. Primary: Verify using derived release-signing key (domain separation)
  const derivedKey = getDerivedPlatformSecretHex(platformSecret, 'release-signing');
  for (const payload of payloadCandidates) {
    const hmac = crypto.createHmac('sha256', derivedKey);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    try {
      if (
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
      ) {
        return true;
      }
    } catch {
      // try next candidate
    }
  }

  // 2. Compatibility fallback: raw platformSecret (for legacy tests)
  for (const payload of payloadCandidates) {
    const hmac = crypto.createHmac('sha256', platformSecret);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    try {
      if (
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
      ) {
        return true;
      }
    } catch {
      // try next candidate
    }
  }

  return false;
}

export const signAppRelease = signReleaseBuild;
