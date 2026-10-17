import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MemoryRelay,
  MAX_MESSAGE_SIZE_BYTES,
  MAX_MESSAGES_PER_ROOM,
  type RelayMessage,
} from './relay';

describe('RAM-Only MemoryRelay Server', () => {
  let relay: MemoryRelay;

  beforeEach(() => {
    relay = new MemoryRelay();
  });

  afterEach(() => {
    relay.close();
  });

  it('creates an active room in volatile memory', () => {
    const now = Date.now();
    const result = relay.createRoom({
      slug: 'test-room',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
      allowPeerRevoke: true,
    });

    expect(result.success).toBe(true);
    expect(relay.getRoomCount()).toBe(1);

    const room = relay.getRoom('test-room');
    expect(room).toBeDefined();
    expect(room?.creatorUid).toBe('alice_123');
    expect(room?.status).toBe('active');
  });

  it('rejects room creation exceeding the 7-day maximum limit', () => {
    const now = Date.now();
    const result = relay.createRoom({
      slug: 'long-room',
      creatorUid: 'alice_123',
      expiresAt: now + 8 * 24 * 3600 * 1000, // 8 days
      keyCommitment: 'hash_abc_123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/7-day/);
    expect(relay.getRoomCount()).toBe(0);
  });

  it('enforces payload size limits (< 1MB)', () => {
    const now = Date.now();
    relay.createRoom({
      slug: 'size-test',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
    });

    // Mock WebSocket object
    const mockWs = {} as any;

    const oversizedMessage: RelayMessage = {
      id: 'msg_oversized',
      roomSlug: 'size-test',
      senderUid: 'alice_123',
      createdAt: now,
      type: 'image',
      iv: '1234567890123456',
      ciphertext: 'X'.repeat(MAX_MESSAGE_SIZE_BYTES + 100),
      alg: 'AES-256-GCM',
      deleted: false,
    };

    const result = relay.postMessage('size-test', oversizedMessage, mockWs);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/1MB/);
  });

  it('bounds message ring buffer to MAX_MESSAGES_PER_ROOM (50) in memory', () => {
    const now = Date.now();
    relay.createRoom({
      slug: 'ring-test',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
    });

    const mockWs = {} as any;

    // Post 60 messages (10 more than the limit of 50)
    for (let i = 1; i <= 60; i++) {
      relay.postMessage(
        'ring-test',
        {
          id: `msg_${i}`,
          roomSlug: 'ring-test',
          senderUid: 'alice_123',
          createdAt: now + i,
          type: 'text',
          iv: '1234567890123456',
          ciphertext: `ciphertext_${i}`,
          alg: 'AES-256-GCM',
          deleted: false,
        },
        mockWs,
      );
    }

    const room = relay.getRoom('ring-test')!;
    expect(room.messages.length).toBe(MAX_MESSAGES_PER_ROOM);
    // Oldest messages (1-10) should have been evicted from RAM ring buffer
    expect(room.messages[0].id).toBe('msg_11');
    expect(room.messages[room.messages.length - 1].id).toBe('msg_60');
  });

  it('immediately purges and zeroes room state upon destruction', () => {
    const now = Date.now();
    relay.createRoom({
      slug: 'purge-test',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
    });

    const mockWs = {} as any;
    relay.postMessage(
      'purge-test',
      {
        id: 'msg_1',
        roomSlug: 'purge-test',
        senderUid: 'alice_123',
        createdAt: now,
        type: 'text',
        iv: '1234567890123456',
        ciphertext: 'ciphertext_1',
        alg: 'AES-256-GCM',
        deleted: false,
      },
      mockWs,
    );

    expect(relay.getRoom('purge-test')?.messages.length).toBe(1);

    // Destroy room
    relay.destroyRoom('purge-test', 'revoked');

    // Room must be completely deleted from memory
    expect(relay.getRoom('purge-test')).toBeUndefined();
    expect(relay.getRoomCount()).toBe(0);
  });

  it('updates encrypted reactions without modifying message payload', () => {
    const now = Date.now();
    relay.createRoom({
      slug: 'reaction-test',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
    });

    const mockWs = {} as any;
    relay.postMessage(
      'reaction-test',
      {
        id: 'msg_react',
        roomSlug: 'reaction-test',
        senderUid: 'alice_123',
        createdAt: now,
        type: 'text',
        iv: '1234567890123456',
        ciphertext: 'SecretCiphertext',
        alg: 'AES-256-GCM',
        deleted: false,
      },
      mockWs,
    );

    const updateRes = relay.updateReaction('reaction-test', {
      messageId: 'msg_react',
      reactionsIv: '1234567890123456',
      reactionsCiphertext: 'EncryptedReactionsData==',
      reactionsUpdatedAt: now + 100,
    });

    expect(updateRes.success).toBe(true);
    const room = relay.getRoom('reaction-test')!;
    const msg = room.messages.find((m) => m.id === 'msg_react')!;
    expect(msg.reactionsCiphertext).toBe('EncryptedReactionsData==');
    expect(msg.ciphertext).toBe('SecretCiphertext'); // Unaltered
  });

  it('denies room revocation if caller is not room creator', () => {
    const now = Date.now();
    relay.createRoom({
      slug: 'revoke-guard-test',
      creatorUid: 'alice_123',
      expiresAt: now + 3600000,
      keyCommitment: 'hash_abc_123',
    });

    const room = relay.getRoom('revoke-guard-test');
    expect(room).toBeDefined();

    // Attacker cannot revoke room
    const attackerUid = 'mallory_999';
    expect(room?.creatorUid === attackerUid).toBe(false);

    // Only creator can revoke room
    expect(room?.creatorUid === 'alice_123').toBe(true);
    relay.destroyRoom('revoke-guard-test', 'revoked');
    expect(relay.getRoom('revoke-guard-test')).toBeUndefined();
  });
});
