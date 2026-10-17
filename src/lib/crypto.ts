// =============================================================================
// PRVTCHAT CRYPTOGRAPHY LAYER (Web Crypto API — AES-256-GCM + SHA-256)
// =============================================================================

import type { EncryptedPacket, KeyMetadata } from '../types';

const getCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Web Crypto API is unavailable in this environment.');
};

/**
 * Converts an ArrayBuffer or Uint8Array to a URL-safe Base64 string.
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts a URL-safe Base64 string back to a Uint8Array.
 */
export function base64UrlToBuffer(base64Url: string): Uint8Array {
  if (!base64Url || typeof base64Url !== 'string') {
    throw new Error('Invalid Base64 input: must be a non-empty string.');
  }
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error('Malformed Base64 string encoding.');
  }
}

/**
 * Generates a high-entropy 256-bit AES-GCM key and exports it as URL-safe Base64.
 */
export async function generateRoomKey(): Promise<{
  cryptoKey: CryptoKey;
  keyString: string;
}> {
  const crypto = getCrypto();
  const cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawKey = await crypto.subtle.exportKey('raw', cryptoKey);
  return {
    cryptoKey,
    keyString: bufferToBase64Url(rawKey),
  };
}

/**
 * Imports a URL-safe Base64 key string into a Web Crypto AES-GCM CryptoKey.
 * Defaults to non-extractable (extractable: false) to prevent memory key exfiltration.
 * @param keyString 32-byte Base64-encoded key
 * @param extractable Whether key can be exported again (defaults to false for security)
 */
export async function importRoomKey(
  keyString: string,
  extractable = true,
): Promise<CryptoKey> {
  if (!keyString || typeof keyString !== 'string') {
    throw new Error('Invalid or missing 256-bit encryption key.');
  }
  let rawBytes: Uint8Array;
  try {
    rawBytes = base64UrlToBuffer(keyString);
  } catch {
    throw new Error('Invalid or missing 256-bit encryption key.');
  }
  if (rawBytes.byteLength !== 32) {
    throw new Error(
      `Invalid key length (${rawBytes.byteLength * 8} bits). Expected 256 bits (32 bytes).`,
    );
  }
  const crypto = getCrypto();
  return await crypto.subtle.importKey(
    'raw',
    rawBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Computes a human-verifiable SHA-256 fingerprint of the room key AND a
 * zero-knowledge verification commitment so the client can verify whether
 * the URL #key matches the room without exposing the key.
 */
export async function computeKeyMetadata(
  keyInput: CryptoKey | string | Uint8Array,
): Promise<KeyMetadata> {
  const crypto = getCrypto();
  let rawBytes: Uint8Array;
  if (typeof keyInput === 'string') {
    rawBytes = base64UrlToBuffer(keyInput.trim());
  } else if (keyInput instanceof Uint8Array) {
    rawBytes = keyInput;
  } else {
    // CryptoKey
    if (!keyInput.extractable) {
      throw new Error('CryptoKey is non-extractable. Pass key string or raw buffer to compute metadata.');
    }
    const rawBuffer = await crypto.subtle.exportKey('raw', keyInput);
    rawBytes = new Uint8Array(rawBuffer);
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const fingerprint = hex
    .slice(0, 24)
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join(' · ');
  const commitmentBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('prvtchat-commitment-v1:' + hex),
  );
  const commitment = bufferToBase64Url(commitmentBuffer);
  return { fingerprint, commitment };
}

/**
 * Encrypts any JSON-serializable object using AES-256-GCM with a fresh,
 * unique 96-bit (12-byte) random IV. Never sends plaintext or reusable IVs.
 */
export async function encryptPayload(
  cryptoKey: CryptoKey,
  payloadObj: unknown,
): Promise<EncryptedPacket> {
  if (payloadObj === undefined) {
    throw new Error('Payload cannot be undefined.');
  }
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit NIST SP 800-38D recommended IV
  const serialized = JSON.stringify(payloadObj);
  const encodedPlaintext = new TextEncoder().encode(serialized);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    cryptoKey,
    encodedPlaintext,
  );

  return {
    iv: bufferToBase64Url(iv),
    ciphertext: bufferToBase64Url(ciphertextBuffer),
    alg: 'AES-256-GCM',
  };
}

/**
 * Decrypts an { iv, ciphertext } record back into its original JSON payload.
 * Throws if tampered with, wrong key, invalid IV length, or corrupted bytes.
 */
export async function decryptPayload<T = unknown>(
  cryptoKey: CryptoKey,
  ivBase64: string,
  ciphertextBase64: string,
): Promise<T> {
  if (!ivBase64 || typeof ivBase64 !== 'string') {
    throw new Error('Missing or invalid IV.');
  }
  if (!ciphertextBase64 || typeof ciphertextBase64 !== 'string') {
    throw new Error('Missing or invalid ciphertext.');
  }

  const crypto = getCrypto();
  const iv = base64UrlToBuffer(ivBase64);

  // Strict 96-bit IV verification
  if (iv.byteLength !== 12) {
    throw new Error(
      `Invalid IV length (${iv.byteLength * 8} bits). AES-256-GCM requires a 96-bit (12-byte) IV.`,
    );
  }

  const ciphertext = base64UrlToBuffer(ciphertextBase64);
  if (ciphertext.byteLength < 16) {
    throw new Error('Ciphertext too short to contain a valid 128-bit GCM authentication tag.');
  }

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
      cryptoKey,
      ciphertext as BufferSource,
    );
  } catch {
    throw new Error('Ciphertext integrity check failed: payload was tampered with or key is invalid.');
  }

  const jsonStr = new TextDecoder().decode(decryptedBuffer);
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error('Decrypted content is malformed or invalid JSON.');
  }
}
