/**
 * Cryptographic primitives for ERPFY authentication.
 * Authority: ERPFY-MASTER-PLAN.md sections 50, 51, 81.
 *
 * Everything here uses WebCrypto, which is available in the Workers runtime. There is no
 * native bcrypt/argon2 on this platform, so passwords use PBKDF2-HMAC-SHA256 at a high
 * iteration count. If the platform later offers a memory-hard KDF, `PASSWORD_ALGORITHM`
 * and `verifyPassword` are the only places that need to change — stored hashes carry
 * their own parameters so old and new can coexist.
 */

const encoder = new TextEncoder();

/* ------------------------------------------------------------------ *
 * Encoding helpers
 * ------------------------------------------------------------------ */

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** URL-safe opaque token, used for sessions and one-time links. */
export function randomToken(byteLength = 32): string {
  return toBase64(randomBytes(byteLength))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Constant-time comparison. Used wherever a secret is compared, so a timing signal cannot
 * reveal how much of a token or code was correct.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

/** SHA-256 hex. Used to store session tokens, one-time links and recovery codes. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

/* ------------------------------------------------------------------ *
 * Passwords
 * ------------------------------------------------------------------ */

const PASSWORD_ALGORITHM = 'pbkdf2-sha256';
/** OWASP guidance for PBKDF2-HMAC-SHA256. Raise this, never lower it. */
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BITS = 256;

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    PASSWORD_KEY_BITS,
  );
  return toBase64(new Uint8Array(bits));
}

/** Stored form: `pbkdf2-sha256$iterations$saltBase64$hashBase64`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const hash = await derive(password, salt, PASSWORD_ITERATIONS);
  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${hash}`;
}

export type PasswordCheck = { valid: boolean; needsRehash: boolean };

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<PasswordCheck> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== PASSWORD_ALGORITHM) {
    return { valid: false, needsRehash: false };
  }
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1000) {
    return { valid: false, needsRehash: false };
  }
  const candidate = await derive(password, fromBase64(parts[2]), iterations);
  const valid = timingSafeEqual(candidate, parts[3]);
  return { valid, needsRehash: valid && iterations < PASSWORD_ITERATIONS };
}

/**
 * Password policy. Length is the control that actually matters, so the floor is 12 rather
 * than a short password dressed up with character-class rules.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (password.length > 200) return 'Use 200 characters or fewer.';
  if (!/[^\s]/.test(password)) return 'Enter a password.';
  return null;
}

/* ------------------------------------------------------------------ *
 * Secret-at-rest encryption (AES-GCM)
 * ------------------------------------------------------------------ */

/**
 * A TOTP secret has to be reversible to verify a code, so it cannot simply be hashed.
 * It is encrypted with a key held outside the database. Without that key configured,
 * two-factor enrolment is refused rather than storing secrets in the clear.
 */
export async function importSecretKey(rawKey: string): Promise<CryptoKey> {
  // The configured value is hashed to a fixed 256-bit key, so any sufficiently random
  // string works and the key length is never wrong.
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export type Sealed = { cipher: string; iv: string };

export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext),
  );
  return { cipher: toBase64(new Uint8Array(cipher)), iv: toBase64(iv) };
}

export async function unseal(key: CryptoKey, sealed: Sealed): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(sealed.iv) as BufferSource },
    key,
    fromBase64(sealed.cipher) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

/* ------------------------------------------------------------------ *
 * TOTP — RFC 6238, the flavour authenticator apps expect
 * ------------------------------------------------------------------ */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function fromBase32(value: string): Uint8Array {
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) continue;
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

/** 160-bit secret, the size authenticator apps and RFC 4226 assume. */
export function generateTotpSecret(): string {
  return toBase32(randomBytes(20));
}

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** One step either side, so a slow phone clock still works. */
export const TOTP_WINDOW = 1;

async function totpAt(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase32(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const message = new Uint8Array(8);
  let remaining = counter;
  for (let index = 7; index >= 0; index -= 1) {
    message[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, message as BufferSource),
  );
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verifies a code against the current step and one step either side. Returns the matched
 * counter so the caller can reject replay of a code that was already accepted.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  atMs = Date.now(),
): Promise<{ valid: boolean; counter: number }> {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== TOTP_DIGITS) return { valid: false, counter: 0 };

  const current = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
  for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift += 1) {
    const counter = current + drift;
    // eslint-disable-next-line no-await-in-loop -- at most three cheap HMACs
    const expected = await totpAt(secret, counter);
    if (timingSafeEqual(expected, clean)) return { valid: true, counter };
  }
  return { valid: false, counter: 0 };
}

/** otpauth:// URI for the QR code. The label and issuer are what the app displays. */
export function totpUri(
  secret: string,
  accountEmail: string,
  issuer = 'ERPFY',
): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ------------------------------------------------------------------ *
 * Recovery codes
 * ------------------------------------------------------------------ */

export const RECOVERY_CODE_COUNT = 10;

/**
 * Codes are shown once and stored only as hashes, so a database copy cannot be used to
 * sign in and no code ever reaches a log (master-plan section 50).
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  // Crockford-style alphabet without look-alike characters, so codes can be read aloud.
  const alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  const codes: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const bytes = randomBytes(10);
    let code = '';
    for (let position = 0; position < 10; position += 1) {
      code += alphabet[bytes[position] % alphabet.length];
      if (position === 4) code += '-';
    }
    codes.push(code);
  }
  return codes;
}

export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, '');
}
