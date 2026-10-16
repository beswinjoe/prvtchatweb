import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  async function seedRoom(
    slug: string,
    options: { status?: 'active' | 'revoked' | 'expired'; members?: Array<{ uid: string; status?: 'active' | 'departed' }> } = {},
  ) {
    const now = Date.now();
    const status = options.status ?? 'active';
    const members = options.members ?? [{ uid: 'alice_uid' }, { uid: 'bob_uid' }];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', slug), {
        slug,
        status,
        createdAt: now - 1000,
        expiresAt: now + 60 * 60 * 1000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: members.filter((member) => (member.status ?? 'active') === 'active').length,
        maxMembers: 12,
        keyCommitment: 'commitment_hash_abc123',
        allowPeerRevoke: false,
      });

      for (const member of members) {
        await setDoc(
          doc(adminDb, 'artifacts', appId, 'public', 'data', 'rooms', slug, 'members', member.uid),
          {
            uid: member.uid,
            role: member.uid === 'alice_uid' ? 'owner' : 'member',
            status: member.status ?? 'active',
            joinedAt: now - 500,
            displayName: member.uid,
          },
        );
      }
    });
  }

  it('blocks unauthenticated reads and writes to rooms', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
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
        memberCount: 1,
        maxMembers: 12,
        keyCommitment: 'commitment',
      }),
    );
  });

  it('allows a user to create their own valid room and initial owner membership', async () => {
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'alice-room');

    await assertSucceeds(
      setDoc(roomRef, {
        slug: 'alice-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 24 * 3600 * 1000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 1,
        maxMembers: 12,
        allowPeerRevoke: false,
        keyCommitment: 'commitment_hash_abc123',
        encryptionCipher: 'AES-256-GCM',
      }),
    );

    await assertSucceeds(
      setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'alice-room', 'members', 'alice_uid'), {
        uid: 'alice_uid',
        role: 'owner',
        status: 'active',
        displayName: 'Alice',
        joinedAt: now,
        updatedAt: now,
      }),
    );
  });

  it('rejects room creation exceeding the seven-day expiry ceiling', async () => {
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    await assertFails(
      setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'long-room'), {
        slug: 'long-room',
        status: 'active',
        createdAt: now,
        expiresAt: now + 8 * 24 * 3600 * 1000,
        creatorUid: 'alice_uid',
        ownerUid: 'alice_uid',
        memberCount: 1,
        maxMembers: 12,
        keyCommitment: 'commitment_hash_abc123',
      }),
    );
  });

  it('rejects spoofed creator and owner IDs', async () => {
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const now = Date.now();
    for (const [slug, creatorUid, ownerUid] of [
      ['spoof-creator', 'bob_uid', 'alice_uid'],
      ['spoof-owner', 'alice_uid', 'bob_uid'],
    ]) {
      await assertFails(
        setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', slug), {
          slug,
          status: 'active',
          createdAt: now,
          expiresAt: now + 3600000,
          creatorUid,
          ownerUid,
          memberCount: 1,
          maxMembers: 12,
          keyCommitment: 'commitment_hash_abc123',
        }),
      );
    }
  });

  it('allows only the owner to revoke an active room', async () => {
    await seedRoom('revoke-room');
    const now = Date.now();
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    const aliceRoomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revoke-room');
    const bobRoomRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'revoke-room');

    await assertFails(updateDoc(bobRoomRef, { status: 'revoked', revokedBy: 'bob_uid', revokedAt: now }));
    await assertFails(updateDoc(aliceRoomRef, { status: 'revoked', revokedBy: 'alice_uid', revokedAt: now, memberCount: 1 }));
    await assertSucceeds(updateDoc(aliceRoomRef, { status: 'revoked', revokedBy: 'alice_uid', revokedAt: now }));
  });

  it('rejects client-side membership creation, member updates, capacity changes, and ownership transfer', async () => {
    await seedRoom('authoritative-room');
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    const charlieDb = testEnv.authenticatedContext('charlie_uid').firestore();
    const roomRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'authoritative-room');
    const bobMemberRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'rooms', 'authoritative-room', 'members', 'bob_uid');
    const charlieMemberRef = doc(charlieDb, 'artifacts', appId, 'public', 'data', 'rooms', 'authoritative-room', 'members', 'charlie_uid');

    await assertFails(setDoc(charlieMemberRef, {
      uid: 'charlie_uid', role: 'member', status: 'active', joinedAt: Date.now(),
    }));
    await assertFails(updateDoc(bobMemberRef, { status: 'departed', departedAt: Date.now(), updatedAt: Date.now() }));
    await assertFails(updateDoc(roomRef, { memberCount: 12, updatedAt: Date.now() }));
    await assertFails(updateDoc(roomRef, {
      ownerUid: 'bob_uid', ownershipTransferredAt: Date.now(), updatedAt: Date.now(),
    }));
    await assertFails(deleteDoc(bobMemberRef));
  });

  it('allows active members to send messages but rejects non-members and spoofed senders', async () => {
    await seedRoom('message-room');
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    const charlieDb = testEnv.authenticatedContext('charlie_uid').firestore();
    const now = Date.now();
    const message = {
      roomSlug: 'message-room',
      senderUid: 'bob_uid',
      ciphertext: 'AQIDBAUG...',
      iv: '1234567890123456',
      createdAt: now,
    };

    await assertSucceeds(setDoc(doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'bob-message'), message));
    await assertFails(setDoc(doc(charlieDb, 'artifacts', appId, 'public', 'data', 'messages', 'charlie-message'), {
      ...message, senderUid: 'charlie_uid',
    }));
    await assertFails(getDoc(doc(charlieDb, 'artifacts', appId, 'public', 'data', 'messages', 'bob-message')));
    await assertFails(setDoc(doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'spoofed-message'), {
      ...message, senderUid: 'alice_uid',
    }));
  });

  it('rejects messages from departed members', async () => {
    await seedRoom('departed-room', {
      members: [{ uid: 'alice_uid' }, { uid: 'bob_uid', status: 'departed' }],
    });
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    await assertFails(
      setDoc(doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'after-departure'), {
        roomSlug: 'departed-room',
        senderUid: 'bob_uid',
        ciphertext: 'EncryptedPayload',
        iv: '1234567890123456',
        createdAt: Date.now(),
      }),
    );
  });

  it('rejects messages in revoked rooms', async () => {
    await seedRoom('revoked-room', { status: 'revoked' });
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'messages', 'late-message'), {
        roomSlug: 'revoked-room',
        senderUid: 'alice_uid',
        ciphertext: 'EncryptedPayload',
        iv: '1234567890123456',
        createdAt: Date.now(),
      }),
    );
  });

  it('allows reaction-only updates but prevents ciphertext tampering', async () => {
    await seedRoom('reaction-room');
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    const messageRef = doc(aliceDb, 'artifacts', appId, 'public', 'data', 'messages', 'original-message');
    const bobMessageRef = doc(bobDb, 'artifacts', appId, 'public', 'data', 'messages', 'original-message');

    await setDoc(messageRef, {
      roomSlug: 'reaction-room',
      senderUid: 'alice_uid',
      ciphertext: 'OriginalCiphertext',
      iv: '1234567890123456',
      createdAt: Date.now(),
      reactions: {},
    });

    await assertSucceeds(updateDoc(bobMessageRef, { reactions: { thumbs_up: ['bob_uid'] } }));
    await assertFails(updateDoc(bobMessageRef, {
      ciphertext: 'TamperedCiphertext',
      reactions: { thumbs_up: ['bob_uid'] },
    }));
  });

  it('allows active members to write their own presence but rejects non-members', async () => {
    await seedRoom('presence-room');
    const bobDb = testEnv.authenticatedContext('bob_uid').firestore();
    const charlieDb = testEnv.authenticatedContext('charlie_uid').firestore();
    const now = Date.now();

    await assertSucceeds(setDoc(doc(bobDb, 'artifacts', appId, 'public', 'data', 'presence', 'presence-room_bob_uid'), {
      roomSlug: 'presence-room', uid: 'bob_uid', lastSeen: now,
    }));
    await assertFails(setDoc(doc(charlieDb, 'artifacts', appId, 'public', 'data', 'presence', 'presence-room_charlie_uid'), {
      roomSlug: 'presence-room', uid: 'charlie_uid', lastSeen: now,
    }));
  });

  it('does not allow clients to delete an active room', async () => {
    await seedRoom('undeletable-active-room');
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    await assertFails(deleteDoc(doc(aliceDb, 'artifacts', appId, 'public', 'data', 'rooms', 'undeletable-active-room')));
  });
});
