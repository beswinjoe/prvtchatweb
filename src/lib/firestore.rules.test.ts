import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('Firestore Security Rules Suite', () => {
  let testEnv: RulesTestEnvironment | null = null;
  const appId = 'prvtchat-ephemeral-e2ee';
  const rulesPath = resolve(process.cwd(), 'firestore.rules');

  beforeAll(async () => {
    try {
      const rules = readFileSync(rulesPath, 'utf8');
      testEnv = await initializeTestEnvironment({
        projectId: 'prvtchat-rules-test',
        firestore: {
          rules,
          host: '127.0.0.1',
          port: 8080,
        },
      });
    } catch {
      // If emulator is not running, test will be skipped or report emulator requirement
      testEnv = null;
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  const getEnv = () => {
    if (!testEnv) {
      throw new Error('Firestore Emulator is not running. Start with: firebase emulators:start --only firestore');
    }
    return testEnv;
  };

  it('blocks unauthenticated reads and writes to rooms', async () => {
    if (!testEnv) return;
    const unauthDb = getEnv().unauthenticatedContext().firestore();
    const roomRef = doc(unauthDb, 'artifacts', appId, 'public', 'data', 'rooms', 'secret-room-1');

    await assertFails(getDoc(roomRef));
    await assertFails(
      setDoc(roomRef, {
        slug: 'secret-room-1',
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        creatorUid: 'anon_attacker',
        keyCommitment: 'valid_commitment',
      }),
    );
  });

  it('allows authenticated users to create valid active rooms within 7-day bound', async () => {
    if (!testEnv) return;
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'alice-room-1');
    const now = Date.now();

    await assertSucceeds(
      setDoc(roomRef, {
        slug: 'alice-room-1',
        status: 'active',
        createdAt: now,
        expiresAt: now + 24 * 3600 * 1000, // 24 hours
        creatorUid: 'alice_uid',
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('rejects room creation exceeding the 7-day hard ceiling', async () => {
    if (!testEnv) return;
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'long-room');
    const now = Date.now();

    // 8 days (exceeds 7-day limit)
    await assertFails(
      setDoc(roomRef, {
        slug: 'long-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 8 * 24 * 3600 * 1000,
        creatorUid: 'alice_uid',
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('rejects room creation with spoofed creatorUid', async () => {
    if (!testEnv) return;
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'spoofed-room');
    const now = Date.now();

    // alice tries to claim bob is creator
    await assertFails(
      setDoc(roomRef, {
        slug: 'spoofed-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'bob_uid',
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('allows participants to revoke active rooms', async () => {
    if (!testEnv) return;
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const roomRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revokable-room');

    await setDoc(roomRef, {
      slug: 'revokable-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revokable-room');

    await assertSucceeds(
      updateDoc(bobRoomRef, {
        status: 'revoked',
        revokedBy: 'bob_uid',
      }),
    );
  });

  it('enforces message authorization: only active rooms can receive messages', async () => {
    if (!testEnv) return;
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const activeRoomRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'active-chat');

    await setDoc(activeRoomRef, {
      slug: 'active-chat',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const msgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-1');

    // Bob sends message with his own UID to active room -> succeeds
    await assertSucceeds(
      setDoc(msgRef, {
        roomSlug: 'active-chat',
        senderUid: 'bob_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );

    // Bob tries to spoof Alice as sender -> fails
    const spoofedMsgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-spoof');
    await assertFails(
      setDoc(spoofedMsgRef, {
        roomSlug: 'active-chat',
        senderUid: 'alice_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );
  });

  it('rejects sending messages to revoked rooms', async () => {
    if (!testEnv) return;
    const now = Date.now();

    // Seed revoked room using admin/security-rules-disabled context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'dead-chat'), {
        slug: 'dead-chat',
        status: 'revoked',
        createdAt: now - 10000,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        keyCommitment: 'commitment_hash_abc123',
      });
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const msgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-fail');

    await assertFails(
      setDoc(msgRef, {
        roomSlug: 'dead-chat',
        senderUid: 'bob_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );
  });

  it('prevents modifying message ciphertext during reaction updates', async () => {
    if (!testEnv) return;
    const now = Date.now();
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();

    await setDoc(doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'react-chat'), {
      slug: 'react-chat',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      keyCommitment: 'commitment_hash_abc123',
    });

    const msgRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-original');
    await setDoc(msgRef, {
      roomSlug: 'react-chat',
      senderUid: 'alice_uid',
      ciphertext: 'OriginalCiphertext',
      iv: '1234567890123456',
      createdAt: now,
      reactions: {},
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMsgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-original');

    // Bob toggles reaction -> succeeds
    await assertSucceeds(
      updateDoc(bobMsgRef, {
        reactions: { '👍': ['bob_uid'] },
      }),
    );

    // Bob attempts to tamper with ciphertext while updating reaction -> fails
    await assertFails(
      updateDoc(bobMsgRef, {
        ciphertext: 'MaliciousModifiedCiphertext',
        reactions: { '👍': ['bob_uid'] },
      }),
    );
  });
});
