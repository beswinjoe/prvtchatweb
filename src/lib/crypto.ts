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
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
 */
export async function importRoomKey(keyString: string): Promise<CryptoKey> {
  if (!keyString || typeof keyString !== 'string' || keyString.length < 32) {
    throw new Error('Invalid or missing 256-bit encryption key.');
  }
  const rawBytes = base64UrlToBuffer(keyString);
  if (rawBytes.byteLength !== 32) {
    throw new Error(
      `Invalid key length (${rawBytes.byteLength * 8} bits). Expected 256 bits.`,
    );
  }
  const crypto = getCrypto();
  return await crypto.subtle.importKey(
    'raw',
    rawBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Computes a human-verifiable SHA-256 fingerprint of the room key AND a
 * zero-knowledge verification commitment so the client can verify whether
 * the URL #key matches the room without exposing the key.
 */
export async function computeKeyMetadata(
  cryptoKey: CryptoKey,
): Promise<KeyMetadata> {
  const crypto = getCrypto();
  const rawKey = await crypto.subtle.exportKey('raw', cryptoKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey);
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
 * Encrypts any JSON-serializable object using AES-256-GCM with a fresh
 * 96-bit random IV. Never sends plaintext to the server.
 */
export async function encryptPayload(
  cryptoKey: CryptoKey,
  payloadObj: unknown,
): Promise<EncryptedPacket> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV
  const encodedPlaintext = new TextEncoder().encode(
    JSON.stringify(payloadObj),
  );
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
 * Throws if tampered with or if the wrong key is used.
 */
export async function decryptPayload<T = unknown>(
  cryptoKey: CryptoKey,
  ivBase64: string,
  ciphertextBase64: string,
): Promise<T> {
  const crypto = getCrypto();
  const iv = base64UrlToBuffer(ivBase64);
  const ciphertext = base64UrlToBuffer(ciphertextBase64);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    cryptoKey,
    ciphertext as BufferSource,
  );
  const jsonStr = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}
