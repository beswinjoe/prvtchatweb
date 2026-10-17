import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('Firestore Security Rules Suite', () => {
  let testEnv: RulesTestEnvironment;
  const appId = 'prvtchat-ephemeral-e2ee';
  const rulesPath = resolve(process.cwd(), 'firestore.rules');

  beforeAll(async () => {
    const rules = readFileSync(rulesPath, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'prvtchat-rules-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
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
        ownerUid: 'anon_attacker',
        memberCount: 1,
        keyCommitment: 'valid_commitment',
      }),
    );
  });

  it('allows authenticated users to create valid active rooms within 7-day bound', async () => {
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
        ownerUid: 'alice_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('allows authenticated users to query a non-existent room slug without permission denial', async () => {
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'available-slug');

    const snap = await assertSucceeds(getDoc(roomRef));
    expect(snap.exists()).toBe(false);
  });

  it('rejects room creation exceeding the 7-day hard ceiling', async () => {
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
        ownerUid: 'alice_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('rejects room creation with spoofed creatorUid or ownerUid', async () => {
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();

    // Alice tries to claim Bob is creator
    await assertFails(
      setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'spoofed-creator'), {
        slug: 'spoofed-creator',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'bob_uid',
        ownerUid: 'alice_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );

    // Alice tries to claim Bob is owner on creation
    await assertFails(
      setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'spoofed-owner'), {
        slug: 'spoofed-owner',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'bob_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('allows ONLY authoritative owner to revoke room and rejects peer revocation', async () => {
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const roomRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'secure-room');

    await setDoc(roomRef, {
      slug: 'secure-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      allowPeerRevoke: true, // Legacy flag must NOT allow Bob to revoke
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'secure-room');

    // Bob (ordinary participant) tries to revoke -> MUST BE REJECTED
    await assertFails(
      updateDoc(bobRoomRef, {
        status: 'revoked',
        revokedBy: 'bob_uid',
      }),
    );

    // Bob (non-owner) tries to delete room document -> MUST BE REJECTED
    await assertFails(deleteDoc(bobRoomRef));

    // Alice (authoritative owner) revokes -> SUCCEEDS
    await assertSucceeds(
      updateDoc(roomRef, {
        status: 'revoked',
        revokedBy: 'alice_uid',
      }),
    );

    // Alice (authoritative owner) is allowed to delete room document
    await assertSucceeds(deleteDoc(roomRef));
  });

  it('allows owner to transfer ownership to an active member, rejects non-owner transfer, and strips former owner privileges', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();

    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room');
    await setDoc(roomRef, {
      slug: 'transfer-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    // Bob tries to directly self-assign membership -> DENIED
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room', 'members', 'bob_uid');
    await assertFails(
      setDoc(bobMemberRef, {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      }),
    );

    // Bob is joined authoritatively (simulating trusted Cloud Functions Admin SDK)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    // Non-owner (Bob) attempts to transfer ownership -> FAILS
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room');
    await assertFails(
      updateDoc(bobRoomRef, {
        ownerUid: 'bob_uid',
        ownershipTransferredAt: now,
        updatedAt: now,
      }),
    );

    // Owner (Alice) transfers ownership to active member Bob -> SUCCEEDS
    await assertSucceeds(
      updateDoc(roomRef, {
        ownerUid: 'bob_uid',
        ownershipTransferredAt: now,
        updatedAt: now,
      }),
    );

    // Former owner (Alice) now attempts to revoke room -> FAILS because Bob is now owner
    await assertFails(
      updateDoc(roomRef, {
        status: 'revoked',
        revokedBy: 'alice_uid',
      }),
    );
  });

  it('enforces member-only message authorization: non-members cannot send or read messages', async () => {
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const activeRoomRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'member-room');

    await setDoc(activeRoomRef, {
      slug: 'member-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const msgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-bob');

    // Bob is not a member yet -> sending message FAILS
    await assertFails(
      setDoc(msgRef, {
        roomSlug: 'member-room',
        senderUid: 'bob_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );

    // Self-assigned membership denied
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'member-room', 'members', 'bob_uid');
    await assertFails(
      setDoc(bobMemberRef, {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      }),
    );

    // Bob is registered authoritatively via Cloud Function
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'member-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    // Now Bob is an active member -> sending message SUCCEEDS
    await assertSucceeds(
      setDoc(msgRef, {
        roomSlug: 'member-room',
        senderUid: 'bob_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );

    // Bob tries to spoof Alice as sender -> FAILS
    const spoofedMsgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-spoof');
    await assertFails(
      setDoc(spoofedMsgRef, {
        roomSlug: 'member-room',
        senderUid: 'alice_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );
  });

  it('rejects departed members from sending messages and rejects client member deletion', async () => {
    const adminDb = getEnv().authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const roomRef = doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room');

    await setDoc(roomRef, {
      slug: 'depart-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room', 'members', 'bob_uid');

    // Bob registered authoritatively
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    // Bob attempts to directly delete membership doc -> FAILS (rules enforce delete: if false)
    await assertFails(deleteDoc(bobMemberRef));

    // Bob departs cleanly
    await assertSucceeds(
      updateDoc(bobMemberRef, {
        status: 'departed',
        departedAt: now,
        updatedAt: now,
      }),
    );

    // Departed Bob tries to send message -> FAILS
    const msgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-after-depart');
    await assertFails(
      setDoc(msgRef, {
        roomSlug: 'depart-room',
        senderUid: 'bob_uid',
        ciphertext: 'AQIDBAUG...',
        iv: '1234567890123456',
        createdAt: now,
      }),
    );
  });

  it('rejects sending messages to revoked or expired rooms', async () => {
    const now = Date.now();

    // Seed revoked room using security-rules-disabled context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'dead-chat'), {
        slug: 'dead-chat',
        status: 'revoked',
        createdAt: now - 10000,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
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
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();

    await setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'react-chat'), {
      slug: 'react-chat',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    // Add Bob as active member authoritatively
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'react-chat', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    const msgRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-original');
    await setDoc(msgRef, {
      roomSlug: 'react-chat',
      senderUid: 'alice_uid',
      ciphertext: 'OriginalCiphertext',
      iv: '1234567890123456',
      createdAt: now,
      reactions: {},
    });

    const bobMsgRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'msg-original');

    // Bob toggles plain reaction -> succeeds
    await assertSucceeds(
      updateDoc(bobMsgRef, {
        reactions: { '👍': ['bob_uid'] },
      }),
    );

    // Bob toggles encrypted reaction -> succeeds
    await assertSucceeds(
      updateDoc(bobMsgRef, {
        reactionsIv: '1234567890123456',
        reactionsCiphertext: 'EncryptedPayloadBase64==',
        reactionsUpdatedAt: now + 500,
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

  it('denies client-side memberCount manipulation', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'count-chat');

    await setDoc(roomRef, {
      slug: 'count-chat',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    // Client-side memberCount mutation must be DENIED
    await assertFails(
      updateDoc(roomRef, {
        memberCount: 12,
        updatedAt: now,
      }),
    );

    // Updating count to 13 (exceeds 12-member maximum) -> FAILS
    await assertFails(
      updateDoc(roomRef, {
        memberCount: 13,
        updatedAt: now,
      }),
    );

    // Updating count to 0 (below 1) -> FAILS
    await assertFails(
      updateDoc(roomRef, {
        memberCount: 0,
        updatedAt: now,
      }),
    );
  });

  it('prevents recreating or overwriting an existing room', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'unique-slug');

    await setDoc(roomRef, {
      slug: 'unique-slug',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    // Bob tries to overwrite or recreate existing slug -> FAILS
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'unique-slug');
    await assertFails(
      setDoc(bobRoomRef, {
        slug: 'unique-slug',
        status: 'active',
        createdAt: now + 1000,
        expiresAt: now + 7200000,
        creatorUid: 'bob_uid',
        ownerUid: 'bob_uid',
        memberCount: 1,
        keyCommitment: 'bob_commitment',
      }),
    );
  });
});
