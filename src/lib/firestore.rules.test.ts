import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

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
    const roomRef = doc(unauthDb, 'artifacts', appId, 'public', 'data', 'rooms', 'secret-room');

    await assertFails(getDoc(roomRef));
    await assertFails(
      setDoc(roomRef, {
        slug: 'secret-room',
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        creatorUid: 'attacker',
        ownerUid: 'attacker',
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('allows authenticated users to create valid active rooms within 7-day bound', async () => {
    const authDb = getEnv().authenticatedContext('user_123').firestore();
    const roomRef = doc(authDb, 'artifacts', appId, 'public', 'data', 'rooms', 'valid-room');
    const now = Date.now();

    await assertSucceeds(
      setDoc(roomRef, {
        slug: 'valid-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'user_123',
        ownerUid: 'user_123',
        memberCount: 1,
        keyCommitment: 'valid_commitment',
      }),
    );
  });

  it('allows authenticated users to query a non-existent room slug without permission denial', async () => {
    const authDb = getEnv().authenticatedContext('user_123').firestore();
    const roomRef = doc(authDb, 'artifacts', appId, 'public', 'data', 'rooms', 'non-existent-room');

    await assertSucceeds(getDoc(roomRef));
  });

  it('rejects room creation exceeding the 7-day hard ceiling', async () => {
    const authDb = getEnv().authenticatedContext('user_123').firestore();
    const roomRef = doc(authDb, 'artifacts', appId, 'public', 'data', 'rooms', 'long-room');
    const now = Date.now();
    const eightDays = 8 * 24 * 60 * 60 * 1000;

    await assertFails(
      setDoc(roomRef, {
        slug: 'long-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + eightDays,
        creatorUid: 'user_123',
        ownerUid: 'user_123',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('rejects room creation with spoofed creatorUid or ownerUid', async () => {
    const authDb = getEnv().authenticatedContext('attacker_uid').firestore();
    const roomRef = doc(authDb, 'artifacts', appId, 'public', 'data', 'rooms', 'spoofed-room');
    const now = Date.now();

    await assertFails(
      setDoc(roomRef, {
        slug: 'spoofed-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'victim_uid',
        ownerUid: 'victim_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );

    await assertFails(
      setDoc(roomRef, {
        slug: 'spoofed-room-2',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'attacker_uid',
        ownerUid: 'victim_uid',
        memberCount: 1,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('allows ONLY authoritative owner to revoke room and rejects peer revocation', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();

    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revocation-room');
    await setDoc(roomRef, {
      slug: 'revocation-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revocation-room');
    await assertFails(
      updateDoc(bobRoomRef, {
        status: 'revoked',
        revokedBy: 'bob_uid',
      }),
    );

    await assertFails(deleteDoc(bobRoomRef));

    await assertSucceeds(
      updateDoc(roomRef, {
        status: 'revoked',
        revokedBy: 'alice_uid',
      }),
    );

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

    const aliceMemberRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room', 'members', 'alice_uid');
    await setDoc(aliceMemberRef, {
      uid: 'alice_uid',
      role: 'owner',
      status: 'active',
      joinedAt: now,
    });

    // Bob tries to directly self-assign 'owner' role -> DENIED
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room', 'members', 'bob_uid');
    await assertFails(
      setDoc(bobMemberRef, {
        uid: 'bob_uid',
        role: 'owner',
        status: 'active',
        joinedAt: now,
      }),
    );

    // Bob joins legitimately via atomic coordinated batch (room counter 1 -> 2 and member doc)
    const bobJoinBatch = writeBatch(bobDb);
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room');
    bobJoinBatch.update(bobRoomRef, {
      memberCount: 2,
      updatedAt: now,
    });
    bobJoinBatch.set(bobMemberRef, {
      uid: 'bob_uid',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertSucceeds(bobJoinBatch.commit());

    // Non-owner (Bob) attempts to transfer ownership -> FAILS
    await assertFails(
      updateDoc(bobRoomRef, {
        ownerUid: 'bob_uid',
        ownershipTransferredAt: now,
        updatedAt: now,
      }),
    );

    // Owner (Alice) transfers ownership to active member Bob via coordinated batch
    const transferBatch = writeBatch(aliceDb);
    transferBatch.update(roomRef, {
      ownerUid: 'bob_uid',
      ownershipTransferredAt: now,
      updatedAt: now,
    });
    transferBatch.update(aliceMemberRef, {
      role: 'member',
      updatedAt: now,
    });
    transferBatch.update(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'transfer-room', 'members', 'bob_uid'), {
      role: 'owner',
      updatedAt: now,
    });
    await assertSucceeds(transferBatch.commit());

    // Former owner (Alice) now attempts to revoke room -> FAILS because Bob is now owner
    await assertFails(
      updateDoc(roomRef, {
        status: 'revoked',
        revokedBy: 'alice_uid',
      }),
    );

    // Former owner (Alice) now attempts to delete room -> FAILS
    await assertFails(deleteDoc(roomRef));

    // New owner (Bob) revokes room -> SUCCEEDS
    await assertSucceeds(
      updateDoc(bobRoomRef, {
        status: 'revoked',
        revokedBy: 'bob_uid',
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

    // Bob joins legitimately via atomic coordinated batch
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'member-room', 'members', 'bob_uid');
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'member-room');
    const joinBatch = writeBatch(bobDb);
    joinBatch.update(bobRoomRef, { memberCount: 2, updatedAt: now });
    joinBatch.set(bobMemberRef, {
      uid: 'bob_uid',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertSucceeds(joinBatch.commit());

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
    const now = Date.now();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room'), {
        slug: 'depart-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 2,
        keyCommitment: 'commitment_hash_abc123',
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room', 'members', 'bob_uid');

    // Bob attempts to directly delete membership doc -> FAILS (rules enforce delete: if isRoomOwner)
    await assertFails(deleteDoc(bobMemberRef));

    // Bob departs cleanly via coordinated batch (room memberCount 2 -> 1 and member status active -> departed)
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'depart-room');
    const departBatch = writeBatch(bobDb);
    departBatch.update(bobRoomRef, { memberCount: 1, updatedAt: now });
    departBatch.update(bobMemberRef, {
      status: 'departed',
      departedAt: now,
      updatedAt: now,
    });
    await assertSucceeds(departBatch.commit());

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

  it('denies client-side memberCount manipulation and counts exceeding 12', async () => {
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

    // Client-side uncoordinated memberCount mutation must be DENIED
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

  // =========================================================================
  // ADVERSARIAL ATTACK TESTS (SPARK-ONLY RULE ENFORCEMENT)
  // =========================================================================

  it('ADVERSARIAL: rejects creating membership without coordinated valid counter update', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'uncoord-room');

    await setDoc(roomRef, {
      slug: 'uncoord-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'uncoord-room', 'members', 'bob_uid');

    // Bob attempts to write membership record directly WITHOUT incrementing room counter -> REJECTED
    await assertFails(
      setDoc(bobMemberRef, {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      }),
    );
  });

  it('ADVERSARIAL: rejects counter increment without coordinated membership creation', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'uncoord-counter-room');

    await setDoc(roomRef, {
      slug: 'uncoord-counter-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'uncoord-counter-room');

    // Bob attempts to increment room counter WITHOUT creating a membership document -> REJECTED
    await assertFails(
      updateDoc(bobRoomRef, {
        memberCount: 2,
        updatedAt: now,
      }),
    );
  });

  it('ADVERSARIAL: prevents duplicate joins from incrementing counter or creating second membership', async () => {
    const now = Date.now();
    const aliceDb = getEnv().authenticatedContext('alice_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-join-room');

    await setDoc(roomRef, {
      slug: 'dup-join-room',
      status: 'active',
      createdAt: now,
      expiresAt: now + 3600000,
      creatorUid: 'alice_uid',
      ownerUid: 'alice_uid',
      memberCount: 1,
      keyCommitment: 'commitment_hash_abc123',
    });

    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-join-room');
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-join-room', 'members', 'bob_uid');

    // First join -> SUCCEEDS
    const joinBatch = writeBatch(bobDb);
    joinBatch.update(bobRoomRef, { memberCount: 2, updatedAt: now });
    joinBatch.set(bobMemberRef, {
      uid: 'bob_uid',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertSucceeds(joinBatch.commit());

    // Duplicate join: Bob attempts to increment counter again 2 -> 3 -> REJECTED
    const dupBatch = writeBatch(bobDb);
    dupBatch.update(bobRoomRef, { memberCount: 3, updatedAt: now });
    dupBatch.update(bobMemberRef, { updatedAt: now });
    await assertFails(dupBatch.commit());
  });

  it('ADVERSARIAL: prevents duplicate leaves from decrementing counter multiple times', async () => {
    const now = Date.now();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-leave-room');
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-leave-room', 'members', 'bob_uid');

    // Seed room with 2 members and active Bob
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-leave-room'), {
        slug: 'dup-leave-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 2,
        keyCommitment: 'commitment_hash_abc123',
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'dup-leave-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    // First leave: 2 -> 1 -> SUCCEEDS
    const leaveBatch = writeBatch(bobDb);
    leaveBatch.update(bobRoomRef, { memberCount: 1, updatedAt: now });
    leaveBatch.update(bobMemberRef, {
      status: 'departed',
      departedAt: now,
      updatedAt: now,
    });
    await assertSucceeds(leaveBatch.commit());

    // Second leave: Bob attempts to decrement counter again 1 -> 0 -> REJECTED
    const dupLeaveBatch = writeBatch(bobDb);
    dupLeaveBatch.update(bobRoomRef, { memberCount: 0, updatedAt: now });
    dupLeaveBatch.update(bobMemberRef, { departedAt: now + 100, updatedAt: now + 100 });
    await assertFails(dupLeaveBatch.commit());
  });

  it('ADVERSARIAL: prevents removed members from rejoining or reactivating their status', async () => {
    const now = Date.now();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'rejoin-denied-room', 'members', 'bob_uid');

    // Alice marks Bob as removed
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'rejoin-denied-room'), {
        slug: 'rejoin-denied-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 2,
        keyCommitment: 'commitment_hash_abc123',
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'rejoin-denied-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'removed',
        removedAt: now,
        removedBy: 'alice_uid',
        joinedAt: now - 1000,
      });
    });

    // Removed Bob attempts to reactivate status to 'active' -> REJECTED
    await assertFails(
      updateDoc(bobMemberRef, {
        status: 'active',
        updatedAt: now,
      }),
    );

    // Removed Bob attempts to overwrite membership document via setDoc -> REJECTED
    await assertFails(
      setDoc(bobMemberRef, {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      }),
    );
  });

  it('ADVERSARIAL: strictly enforces 12-member capacity limit under concurrent join contention', async () => {
    const now = Date.now();

    // Room is full at 11 members (1 seat left)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'cap-race-room'), {
        slug: 'cap-race-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 11,
        keyCommitment: 'commitment_hash_abc123',
      });
    });

    const user12Db = getEnv().authenticatedContext('user_12').firestore();
    const user12RoomRef = doc(user12Db, 'artifacts', appId, 'public', 'data', 'rooms', 'cap-race-room');
    const user12MemberRef = doc(user12Db, 'artifacts', appId, 'public', 'data', 'rooms', 'cap-race-room', 'members', 'user_12');

    // User 12 claims the final 12th slot -> SUCCEEDS
    const join12Batch = writeBatch(user12Db);
    join12Batch.update(user12RoomRef, { memberCount: 12, updatedAt: now });
    join12Batch.set(user12MemberRef, {
      uid: 'user_12',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertSucceeds(join12Batch.commit());

    // User 13 attempts to join: increment 12 -> 13 -> REJECTED by rules
    const user13Db = getEnv().authenticatedContext('user_13').firestore();
    const user13RoomRef = doc(user13Db, 'artifacts', appId, 'public', 'data', 'rooms', 'cap-race-room');
    const user13MemberRef = doc(user13Db, 'artifacts', appId, 'public', 'data', 'rooms', 'cap-race-room', 'members', 'user_13');

    const join13Batch = writeBatch(user13Db);
    join13Batch.update(user13RoomRef, { memberCount: 13, updatedAt: now });
    join13Batch.set(user13MemberRef, {
      uid: 'user_13',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertFails(join13Batch.commit());

    // User 13 attempts to overwrite memberCount keeping it at 12 -> REJECTED because user 13 is not an active member
    const spoof13Batch = writeBatch(user13Db);
    spoof13Batch.update(user13RoomRef, { memberCount: 12, updatedAt: now });
    spoof13Batch.set(user13MemberRef, {
      uid: 'user_13',
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    await assertFails(spoof13Batch.commit());
  });

  it('ADVERSARIAL: prevents members from changing other users roles or escalating own role to owner', async () => {
    const now = Date.now();
    const bobDb = getEnv().authenticatedContext('bob_uid').firestore();
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'priv-escalate-room', 'members', 'bob_uid');
    const aliceMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'priv-escalate-room', 'members', 'alice_uid');

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'priv-escalate-room'), {
        slug: 'priv-escalate-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 3600000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 2,
        keyCommitment: 'commitment_hash_abc123',
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'priv-escalate-room', 'members', 'alice_uid'), {
        uid: 'alice_uid',
        role: 'owner',
        status: 'active',
        joinedAt: now,
      });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', 'priv-escalate-room', 'members', 'bob_uid'), {
        uid: 'bob_uid',
        role: 'member',
        status: 'active',
        joinedAt: now,
      });
    });

    // Bob attempts to demote Alice -> REJECTED
    await assertFails(
      updateDoc(aliceMemberRef, {
        role: 'member',
        updatedAt: now,
      }),
    );

    // Bob attempts to promote himself to owner -> REJECTED
    await assertFails(
      updateDoc(bobMemberRef, {
        role: 'owner',
        updatedAt: now,
      }),
    );
  });
});
