import * as nodeCrypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Converts a 64-char hex key string into a 32-byte Buffer suitable for AES-256.
 */
function keyFromHex(hex: string): Buffer {
  if (hex.length !== 64) {
    throw new Error('Encryption key must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext  - The string to encrypt.
 * @param key        - A 64-char hex string (32 bytes).
 * @returns          - Base64-encoded string in the format: `ciphertext:iv:authTag`
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuf = keyFromHex(key);
  const iv = nodeCrypto.randomBytes(IV_LENGTH);

  const cipher = nodeCrypto.createCipheriv(ALGORITHM, keyBuf, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Encode all three parts as base64, joined by ':'
  return [
    encrypted.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a ciphertext string produced by `encrypt`.
 *
 * @param ciphertext - Base64-encoded string in the format: `ciphertext:iv:authTag`
 * @param key        - A 64-char hex string (32 bytes).
 * @returns          - The original plaintext string.
 */
export function decrypt(ciphertext: string, key: string): string {
  const keyBuf = keyFromHex(key);
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format — expected "ciphertext:iv:authTag"');
  }

  const [encryptedB64, ivB64, authTagB64] = parts;
  const encryptedBuf = Buffer.from(encryptedB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = nodeCrypto.createDecipheriv(ALGORITHM, keyBuf, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuf),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
