import { describe, expect, it } from 'vitest';
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  computeKeyMetadata,
  decryptPayload,
  encryptPayload,
  generateRoomKey,
  importRoomKey,
} from './crypto';

describe('Web Crypto E2EE Primitives', () => {
  it('generates a 256-bit key and encodes to URL-safe Base64', async () => {
    const { cryptoKey, keyString } = await generateRoomKey();
    expect(cryptoKey).toBeDefined();
    expect(cryptoKey.algorithm.name).toBe('AES-GCM');
    // 256 bits = 32 bytes. In base64url without padding: 43 characters
    const buffer = base64UrlToBuffer(keyString);
    expect(buffer.byteLength).toBe(32);
  });

  it('imports a raw key string back into a valid CryptoKey', async () => {
    const { keyString } = await generateRoomKey();
    const imported = await importRoomKey(keyString);
    expect(imported).toBeDefined();
    expect(imported.algorithm.name).toBe('AES-GCM');
  });

  it('encrypts and decrypts payloads roundtrip accurately', async () => {
    const { cryptoKey } = await generateRoomKey();
    const sampleMessage = {
      text: 'Confidential strategic briefing 🔐',
      senderName: 'Alice',
      sentAt: 1718000000000,
    };

    const packet = await encryptPayload(cryptoKey, sampleMessage);
    expect(packet.alg).toBe('AES-256-GCM');
    expect(packet.iv).toBeDefined();
    expect(packet.ciphertext).toBeDefined();
    // Ciphertext must not contain plaintext
    expect(packet.ciphertext).not.toContain('Confidential');

    const decrypted = await decryptPayload<typeof sampleMessage>(
      cryptoKey,
      packet.iv,
      packet.ciphertext
    );
    expect(decrypted.text).toBe(sampleMessage.text);
    expect(decrypted.senderName).toBe(sampleMessage.senderName);
    expect(decrypted.sentAt).toBe(sampleMessage.sentAt);
  });

  it('rejects tampered ciphertext with an authentication error', async () => {
    const { cryptoKey } = await generateRoomKey();
    const packet = await encryptPayload(cryptoKey, { text: 'Secret' });

    // Flip bits in ciphertext
    const rawCipher = base64UrlToBuffer(packet.ciphertext);
    rawCipher[0] ^= 0xff;
    const tampered = bufferToBase64Url(rawCipher);

    await expect(
      decryptPayload(cryptoKey, packet.iv, tampered)
    ).rejects.toThrow();
  });

  it('rejects decryption when using an incorrect key', async () => {
    const { cryptoKey: keyA } = await generateRoomKey();
    const { cryptoKey: keyB } = await generateRoomKey();

    const packet = await encryptPayload(keyA, { text: 'Secret' });

    await expect(
      decryptPayload(keyB, packet.iv, packet.ciphertext)
    ).rejects.toThrow();
  });

  it('computes consistent zero-knowledge SHA-256 key commitments', async () => {
    const { cryptoKey } = await generateRoomKey();
    const meta1 = await computeKeyMetadata(cryptoKey);
    const meta2 = await computeKeyMetadata(cryptoKey);

    expect(meta1.fingerprint).toBe(meta2.fingerprint);
    expect(meta1.commitment).toBe(meta2.commitment);
    expect(meta1.fingerprint).toMatch(/^[0-9A-F]{4}( · [0-9A-F]{4}){5}$/);
  });
});
