import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRelayServer } from '../../server/relay';
import { RelayClient } from './relayClient';
import type { Server } from 'node:http';
import type { WebSocketServer } from 'ws';

describe('RelayClient integration with RAM-Only MemoryRelay', () => {
  let server: Server;
  let wss: WebSocketServer;
  const TEST_PORT = 4999;
  const RELAY_WS_URL = `ws://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    const started = createRelayServer(TEST_PORT);
    server = started.server;
    wss = started.wss;
    await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    wss.close();
    server.close();
  });

  it('connects, creates room, exchanges message and revokes in RAM', async () => {
    const clientAlice = new RelayClient(RELAY_WS_URL);
    const clientBob = new RelayClient(RELAY_WS_URL);

    const now = Date.now();

    // 1. Alice creates room
    const createRes = await clientAlice.createRoom({
      slug: 'e2e-ram-chat',
      creatorUid: 'alice_uid',
      expiresAt: now + 3600000,
      keyCommitment: 'commitment_hash_123',
      allowPeerRevoke: true,
    });

    expect(createRes.success).toBe(true);
    expect(createRes.room?.slug).toBe('e2e-ram-chat');

    // 2. Bob joins room
    const bobJoinRes = await clientBob.joinRoom('e2e-ram-chat', 'bob_uid');
    expect(bobJoinRes.success).toBe(true);
    expect(bobJoinRes.room?.slug).toBe('e2e-ram-chat');

    // 3. Alice sends encrypted message, Bob receives it
    const receivedMessages: any[] = [];
    clientBob.onMessage((msg) => {
      receivedMessages.push(msg);
    });

    clientAlice.postMessage({
      id: 'msg_e2e_1',
      roomSlug: 'e2e-ram-chat',
      senderUid: 'alice_uid',
      createdAt: now,
      type: 'text',
      iv: '1234567890123456',
      ciphertext: 'SecretCiphertextPayload',
      alg: 'AES-256-GCM',
      deleted: false,
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].ciphertext).toBe('SecretCiphertextPayload');

    // 4. Bob toggles reaction, Alice receives it
    const receivedReactions: any[] = [];
    clientAlice.onReaction((update) => {
      receivedReactions.push(update);
    });

    clientBob.toggleReaction({
      messageId: 'msg_e2e_1',
      reactionsIv: '1234567890123456',
      reactionsCiphertext: 'EncryptedReactionData',
      reactionsUpdatedAt: now + 200,
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(receivedReactions.length).toBe(1);
    expect(receivedReactions[0].reactionsCiphertext).toBe('EncryptedReactionData');

    // 5. Alice revokes room, Bob receives destroy notification
    let bobReceivedDestroy = false;
    clientBob.onRoomDestroyed((reason) => {
      if (reason === 'revoked') {
        bobReceivedDestroy = true;
      }
    });

    clientAlice.revokeRoom();
    await new Promise((r) => setTimeout(r, 150));
    expect(bobReceivedDestroy).toBe(true);

    clientAlice.disconnect();
    clientBob.disconnect();
  });
});
