import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket, { type WebSocketServer } from 'ws';
import { createRelayServer } from '../../server/relay';
import { RelayClient } from './relayClient';
import type { Server } from 'node:http';

// Ensure WebSocket is available in headless Node.js test runners
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

async function waitFor(condition: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for condition.`);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe('RelayClient integration with RAM-Only MemoryRelay', () => {
  let server: Server;
  let wss: WebSocketServer;
  const TEST_PORT = 4999;
  const RELAY_WS_URL = `ws://127.0.0.1:${TEST_PORT}`;

  let clientAlice: RelayClient | null = null;
  let clientBob: RelayClient | null = null;

  beforeAll(async () => {
    const started = createRelayServer(TEST_PORT);
    server = started.server;
    wss = started.wss;
    if (!server.listening) {
      await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    }
  });

  afterAll(async () => {
    clientAlice?.disconnect();
    clientBob?.disconnect();
    await new Promise<void>((resolve) => {
      wss.close(() => {
        server.close(() => resolve());
      });
    });
  });

  it('connects, creates room, exchanges message and revokes in RAM', async () => {
    clientAlice = new RelayClient(RELAY_WS_URL);
    clientBob = new RelayClient(RELAY_WS_URL);

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

    await waitFor(() => receivedMessages.length >= 1);
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

    await waitFor(() => receivedReactions.length >= 1);
    expect(receivedReactions[0].reactionsCiphertext).toBe('EncryptedReactionData');

    // 5. Alice revokes room, Bob receives destroy notification
    let bobReceivedDestroy = false;
    clientBob.onRoomDestroyed((reason) => {
      if (reason === 'revoked') {
        bobReceivedDestroy = true;
      }
    });

    clientAlice.revokeRoom();
    await waitFor(() => bobReceivedDestroy);
    expect(bobReceivedDestroy).toBe(true);
  });
});
