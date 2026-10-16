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
    const buffer = base64UrlToBuffer(keyString);
    expect(buffer.byteLength).toBe(32);
  });

  it('imports a raw key string back into a valid CryptoKey', async () => {
    const { keyString } = await generateRoomKey();
    const imported = await importRoomKey(keyString);
    expect(imported).toBeDefined();
    expect(imported.algorithm.name).toBe('AES-GCM');
  });

  it('supports non-extractable session keys for hardened memory isolation', async () => {
    const { keyString } = await generateRoomKey();
    const nonExtractable = await importRoomKey(keyString, false);
    expect(nonExtractable.extractable).toBe(false);

    // Crypto operations still work seamlessly
    const packet = await encryptPayload(nonExtractable, { test: 'secure' });
    const decrypted = await decryptPayload<{ test: string }>(nonExtractable, packet.iv, packet.ciphertext);
    expect(decrypted.test).toBe('secure');
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
      packet.ciphertext,
    );
    expect(decrypted.text).toBe(sampleMessage.text);
    expect(decrypted.senderName).toBe(sampleMessage.senderName);
    expect(decrypted.sentAt).toBe(sampleMessage.sentAt);
  });

  it('generates fresh, unique 96-bit IVs for every encryption operation under same key', async () => {
    const { cryptoKey } = await generateRoomKey();
    const packet1 = await encryptPayload(cryptoKey, { seq: 1 });
    const packet2 = await encryptPayload(cryptoKey, { seq: 2 });
    const packet3 = await encryptPayload(cryptoKey, { seq: 3 });

    expect(packet1.iv).not.toBe(packet2.iv);
    expect(packet2.iv).not.toBe(packet3.iv);
    expect(base64UrlToBuffer(packet1.iv).byteLength).toBe(12);
    expect(base64UrlToBuffer(packet2.iv).byteLength).toBe(12);
  });

  it('rejects tampered ciphertext with an authentication error', async () => {
    const { cryptoKey } = await generateRoomKey();
    const packet = await encryptPayload(cryptoKey, { text: 'Secret' });

    // Flip bits in ciphertext
    const rawCipher = base64UrlToBuffer(packet.ciphertext);
    rawCipher[0] ^= 0xff;
    const tampered = bufferToBase64Url(rawCipher);

    await expect(
      decryptPayload(cryptoKey, packet.iv, tampered),
    ).rejects.toThrow(/Ciphertext integrity check failed/);
  });

  it('rejects decryption when using an incorrect key', async () => {
    const { cryptoKey: keyA } = await generateRoomKey();
    const { cryptoKey: keyB } = await generateRoomKey();

    const packet = await encryptPayload(keyA, { text: 'Secret' });

    await expect(
      decryptPayload(keyB, packet.iv, packet.ciphertext),
    ).rejects.toThrow(/Ciphertext integrity check failed/);
  });

  it('rejects invalid or non-96-bit IVs', async () => {
    const { cryptoKey } = await generateRoomKey();
    const packet = await encryptPayload(cryptoKey, { text: 'Secret' });

    // 8-byte IV instead of 12-byte IV
    const invalidIv = bufferToBase64Url(new Uint8Array(8));
    await expect(
      decryptPayload(cryptoKey, invalidIv, packet.ciphertext),
    ).rejects.toThrow(/Invalid IV length/);
  });

  it('rejects truncated ciphertext shorter than 128-bit authentication tag', async () => {
    const { cryptoKey } = await generateRoomKey();
    const shortCipher = bufferToBase64Url(new Uint8Array(8));
    const validIv = bufferToBase64Url(new Uint8Array(12));

    await expect(
      decryptPayload(cryptoKey, validIv, shortCipher),
    ).rejects.toThrow(/Ciphertext too short/);
  });

  it('rejects invalid key length on import', async () => {
    const shortKey = bufferToBase64Url(new Uint8Array(16)); // 128-bit key
    await expect(importRoomKey(shortKey)).rejects.toThrow(/Invalid key length/);
  });

  it('simulates cross-device key sharing and bidirectional encryption/decryption', async () => {
    // Device A creates room and generates raw keyString in URL hash
    const { keyString: sharedHashKey, cryptoKey: deviceAKey } = await generateRoomKey();

    // Device B receives URL hash #key=... and imports as non-extractable CryptoKey
    const deviceBKey = await importRoomKey(sharedHashKey, false);
    expect(deviceBKey.extractable).toBe(false);

    // Device A encrypts message for Device B
    const packetFromA = await encryptPayload(deviceAKey, { text: 'Hello from Device A', sender: 'Alice' });
    const decryptedByB = await decryptPayload<{ text: string; sender: string }>(
      deviceBKey,
      packetFromA.iv,
      packetFromA.ciphertext,
    );
    expect(decryptedByB.text).toBe('Hello from Device A');
    expect(decryptedByB.sender).toBe('Alice');

    // Device B replies, encrypted with non-extractable key
    const packetFromB = await encryptPayload(deviceBKey, { text: 'Acknowledged by Device B', sender: 'Bob' });
    const decryptedByA = await decryptPayload<{ text: string; sender: string }>(
      deviceAKey,
      packetFromB.iv,
      packetFromB.ciphertext,
    );
    expect(decryptedByA.text).toBe('Acknowledged by Device B');
    expect(decryptedByA.sender).toBe('Bob');
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
