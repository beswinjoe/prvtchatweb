// =============================================================================
// PRVTCHAT — ROOM MEMBERSHIP, ROLES & CAPACITY TESTS
// =============================================================================

import { beforeEach, describe, expect, it } from 'vitest';
import {
  joinRoomAuthoritative,
  leaveRoomAuthoritative,
  removeMemberAuthoritative,
  revokeRoomAuthoritative,
  transferOwnershipAuthoritative,
} from './roomManager';
import {
  appId,
  clearMockStore,
  createMockDb,
  doc,
  getDoc,
  setDoc,
  type User,
} from './firebase';
import type { RoomData, RoomMember } from '../types';

describe('Room Ownership, Roles, and 12-Member Capacity Suite', () => {
  const roomSlug = 'capacity-test-room';
  const now = Date.now();
  const alice: User = { uid: 'alice_owner', displayName: 'Alice' };
  const bob: User = { uid: 'bob_member', displayName: 'Bob' };
  const charlie: User = { uid: 'charlie_member', displayName: 'Charlie' };
  const testDb = createMockDb();

  beforeEach(async () => {
    clearMockStore();
    // Seed test room with Alice as authoritative owner
    const roomRef = doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
    const initialRoom: RoomData = {
      slug: roomSlug,
      ownerUid: alice.uid,
      creatorUid: alice.uid,
      createdAt: now,
      expiresAt: now + 3600000,
      ttlLabel: '1 hour',
      status: 'active',
      memberCount: 1,
      maxMembers: 12,
      allowPeerRevoke: false,
      keyCommitment: 'commitment_test_abc',
      encryptionCipher: 'AES-256-GCM',
    };
    await setDoc(roomRef, initialRoom);

    // Seed Alice as owner member doc
    const aliceMemberRef = doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', alice.uid);
    await setDoc(aliceMemberRef, {
      uid: alice.uid,
      role: 'owner',
      status: 'active',
      displayName: 'Alice',
      joinedAt: now,
      updatedAt: now,
    });
  });

  it('verifies creator becomes initial authoritative owner', async () => {
    const roomRef = doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
    const snap = await getDoc<RoomData>(roomRef);
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.ownerUid).toBe(alice.uid);
    expect(snap.data()?.memberCount).toBe(1);

    const memSnap = await getDoc<RoomMember>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', alice.uid),
    );
    expect(memSnap.data()?.role).toBe('owner');
    expect(memSnap.data()?.status).toBe('active');
  });

  it('allows joining up to 12 participants and rejects the thirteenth participant', async () => {
    // 1 participant already in (Alice). Join 11 more participants (total = 12)
    for (let i = 2; i <= 12; i++) {
      const user: User = { uid: `user_${i}`, displayName: `Participant ${i}` };
      const res = await joinRoomAuthoritative(roomSlug, user, `Participant ${i}`, testDb as any);
      expect(res.success).toBe(true);
      expect(res.role).toBe('member');
      expect(res.memberCount).toBe(i);
    }

    // Verify room has exactly 12 active participants
    const roomSnap = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(roomSnap.data()?.memberCount).toBe(12);

    // 13th participant attempts to join -> MUST BE REJECTED
    const user13: User = { uid: 'user_13', displayName: 'Thirteenth User' };
    const rejectRes = await joinRoomAuthoritative(roomSlug, user13, 'Thirteenth User', testDb as any);
    expect(rejectRes.success).toBe(false);
    expect(rejectRes.error).toContain('12');
  });

  it('is idempotent on duplicate join by active participant (does not consume extra slot)', async () => {
    // Bob joins first time (count becomes 2)
    const res1 = await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    expect(res1.success).toBe(true);
    expect(res1.memberCount).toBe(2);

    // Bob re-joins (reconnect, refresh, or duplicate event)
    const res2 = await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    expect(res2.success).toBe(true);
    expect(res2.alreadyMember).toBe(true);
    expect(res2.memberCount).toBe(2); // Still 2, no extra slot consumed
  });

  it('releases capacity when a member leaves, allowing new participants to join', async () => {
    // Fill room to 12
    for (let i = 2; i <= 12; i++) {
      await joinRoomAuthoritative(roomSlug, { uid: `u_${i}` }, `User ${i}`, testDb as any);
    }

    // 13th is rejected
    const rejectRes = await joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any);
    expect(rejectRes.success).toBe(false);

    // Member 12 leaves
    const leaveRes = await leaveRoomAuthoritative(roomSlug, { uid: 'u_12' }, testDb as any);
    expect(leaveRes.success).toBe(true);

    // Now Charlie joins -> succeeds into released slot
    const joinRes = await joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any);
    expect(joinRes.success).toBe(true);
    expect(joinRes.memberCount).toBe(12);
  });

  it('allows authoritative owner to transfer ownership to an active member', async () => {
    // Bob joins as member
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);

    // Alice transfers ownership to Bob
    const transferRes = await transferOwnershipAuthoritative(roomSlug, alice, bob.uid, testDb as any);
    expect(transferRes.success).toBe(true);
    expect(transferRes.newOwnerUid).toBe(bob.uid);

    // Room doc updated with Bob as authoritative owner
    const roomSnap = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(roomSnap.data()?.ownerUid).toBe(bob.uid);

    // Bob's role is now 'owner'
    const bobSnap = await getDoc<RoomMember>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', bob.uid),
    );
    expect(bobSnap.data()?.role).toBe('owner');

    // Alice's role is now demoted to 'member'
    const aliceSnap = await getDoc<RoomMember>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', alice.uid),
    );
    expect(aliceSnap.data()?.role).toBe('member');
  });

  it('rejects ownership transfer by non-owners', async () => {
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    await joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any);

    // Bob (regular member) tries to transfer ownership to Charlie -> REJECTED
    const res = await transferOwnershipAuthoritative(roomSlug, bob, charlie.uid, testDb as any);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Only the current room owner');
  });

  it('rejects self-transfer and transfer to non-existent or departed members', async () => {
    // Alice self-transfer -> REJECTED
    const selfRes = await transferOwnershipAuthoritative(roomSlug, alice, alice.uid, testDb as any);
    expect(selfRes.success).toBe(false);

    // Transfer to non-member -> REJECTED
    const nonMemberRes = await transferOwnershipAuthoritative(roomSlug, alice, 'ghost_user', testDb as any);
    expect(nonMemberRes.success).toBe(false);

    // Bob joins then leaves -> departed
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    await leaveRoomAuthoritative(roomSlug, bob, testDb as any);

    // Transfer to departed Bob -> REJECTED
    const departedRes = await transferOwnershipAuthoritative(roomSlug, alice, bob.uid, testDb as any);
    expect(departedRes.success).toBe(false);
  });

  it('allows ONLY authoritative owner to revoke room and rejects non-owner revocation', async () => {
    // Bob joins as member
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);

    // Non-owner (Bob) attempts to revoke room -> REJECTED
    const bobRevokeRes = await revokeRoomAuthoritative(roomSlug, bob, testDb as any);
    expect(bobRevokeRes.success).toBe(false);
    expect(bobRevokeRes.error).toContain('Only the authoritative room owner');

    // Verify room is still active
    const snapBefore = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(snapBefore.data()?.status).toBe('active');

    // Authoritative owner (Alice) revokes room -> SUCCEEDS
    const aliceRevokeRes = await revokeRoomAuthoritative(roomSlug, alice, testDb as any);
    expect(aliceRevokeRes.success).toBe(true);

    // Verify room status is now 'revoked'
    const snapAfter = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(snapAfter.data()?.status).toBe('revoked');
  });

  it('allows owner to remove an ordinary participant and denies non-owner from removing members', async () => {
    // Bob and Charlie join
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    await joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any);

    // Non-owner (Bob) attempts to remove Charlie -> REJECTED
    const bobRemoveRes = await removeMemberAuthoritative(roomSlug, bob, charlie.uid, testDb as any);
    expect(bobRemoveRes.success).toBe(false);
    expect(bobRemoveRes.error).toContain('Only the authoritative room owner');

    // Owner cannot remove themselves
    const selfRemoveRes = await removeMemberAuthoritative(roomSlug, alice, alice.uid, testDb as any);
    expect(selfRemoveRes.success).toBe(false);

    // Owner (Alice) removes Charlie -> SUCCEEDS
    const aliceRemoveRes = await removeMemberAuthoritative(roomSlug, alice, charlie.uid, testDb as any);
    expect(aliceRemoveRes.success).toBe(true);
    expect(aliceRemoveRes.removedUid).toBe(charlie.uid);

    // Charlie's member status is now 'removed'
    const charlieSnap = await getDoc<RoomMember>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', charlie.uid),
    );
    expect(charlieSnap.data()?.status).toBe('removed');

    // Room memberCount decremented
    const roomSnap = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(roomSnap.data()?.memberCount).toBe(2);
  });

  it('enforces 12-member cap under concurrent simultaneous joins', async () => {
    // Fill to 11 members (Alice + 10 members)
    for (let i = 2; i <= 11; i++) {
      await joinRoomAuthoritative(roomSlug, { uid: `u_${i}` }, `User ${i}`, testDb as any);
    }

    // Room is at 11 members
    const snap11 = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(snap11.data()?.memberCount).toBe(11);

    // Two users (Bob and Charlie) attempt to join concurrently for the single remaining slot
    const [join1, join2] = await Promise.all([
      joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any),
      joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any),
    ]);

    // Exactly one must succeed and one must be rejected with capacity error
    const successCount = [join1, join2].filter((r) => r.success).length;
    const rejectedCount = [join1, join2].filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(1);

    // Final room count must NEVER exceed 12
    const finalSnap = await getDoc<RoomData>(
      doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug),
    );
    expect(finalSnap.data()?.memberCount).toBe(12);
  });

  it('strips former owner of all owner-only privileges after ownership transfer', async () => {
    // Bob and Charlie join
    await joinRoomAuthoritative(roomSlug, bob, 'Bob', testDb as any);
    await joinRoomAuthoritative(roomSlug, charlie, 'Charlie', testDb as any);

    // Alice transfers ownership to Bob
    const transferRes = await transferOwnershipAuthoritative(roomSlug, alice, bob.uid, testDb as any);
    expect(transferRes.success).toBe(true);

    // Former owner (Alice) attempts to remove Charlie -> REJECTED
    const aliceRemoveRes = await removeMemberAuthoritative(roomSlug, alice, charlie.uid, testDb as any);
    expect(aliceRemoveRes.success).toBe(false);
    expect(aliceRemoveRes.error).toContain('Only the authoritative room owner');

    // Former owner (Alice) attempts to revoke room -> REJECTED
    const aliceRevokeRes = await revokeRoomAuthoritative(roomSlug, alice, testDb as any);
    expect(aliceRevokeRes.success).toBe(false);
    expect(aliceRevokeRes.error).toContain('Only the authoritative room owner');

    // Former owner (Alice) attempts to transfer ownership again -> REJECTED
    const aliceTransferAgain = await transferOwnershipAuthoritative(roomSlug, alice, charlie.uid, testDb as any);
    expect(aliceTransferAgain.success).toBe(false);
    expect(aliceTransferAgain.error).toContain('Only the current room owner');

    // New owner (Bob) can successfully remove Charlie
    const bobRemoveRes = await removeMemberAuthoritative(roomSlug, bob, charlie.uid, testDb as any);
    expect(bobRemoveRes.success).toBe(true);

    // New owner (Bob) can successfully revoke room
    const bobRevokeRes = await revokeRoomAuthoritative(roomSlug, bob, testDb as any);
    expect(bobRevokeRes.success).toBe(true);
  });

  it('rejects joining expired and revoked rooms', async () => {
    const expiredSlug = 'expired-test-room';
    const revokedSlug = 'revoked-test-room';

    // Seed expired room
    await setDoc(doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', expiredSlug), {
      slug: expiredSlug,
      ownerUid: alice.uid,
      creatorUid: alice.uid,
      createdAt: now - 7200000,
      expiresAt: now - 3600000,
      status: 'active',
      memberCount: 1,
    });

    // Seed revoked room
    await setDoc(doc(testDb, 'artifacts', appId, 'public', 'data', 'rooms', revokedSlug), {
      slug: revokedSlug,
      ownerUid: alice.uid,
      creatorUid: alice.uid,
      createdAt: now - 3600000,
      expiresAt: now + 3600000,
      status: 'revoked',
      memberCount: 1,
    });

    // Attempting to join expired room -> REJECTED
    const expiredJoin = await joinRoomAuthoritative(expiredSlug, bob, 'Bob', testDb as any);
    expect(expiredJoin.success).toBe(false);
    expect(expiredJoin.error).toContain('Conversation has expired');

    // Attempting to join revoked room -> REJECTED
    const revokedJoin = await joinRoomAuthoritative(revokedSlug, bob, 'Bob', testDb as any);
    expect(revokedJoin.success).toBe(false);
    expect(revokedJoin.error).toContain('Conversation is no longer active');
  });

  it('fails safely and reports errors truthfully when operations encounter invalid or unauthenticated parameters', async () => {
    // Unauthenticated user -> rejected
    const unauthUser: User = { uid: '' };
    const joinRes = await joinRoomAuthoritative('any-slug', unauthUser, 'Bob', testDb as any);
    expect(joinRes.success).toBe(false);
    expect(joinRes.error).toContain('User must be authenticated');

    // Invalid slug -> rejected
    const invalidSlugJoin = await joinRoomAuthoritative('', bob, 'Bob', testDb as any);
    expect(invalidSlugJoin.success).toBe(false);
    expect(invalidSlugJoin.error).toContain('Valid room slug is required');

    // Non-existent room -> rejected
    const ghostJoin = await joinRoomAuthoritative('ghost-slug-999', bob, 'Bob', testDb as any);
    expect(ghostJoin.success).toBe(false);
    expect(ghostJoin.error).toContain('Conversation room does not exist');

    // Unauthenticated leave -> handled cleanly
    const unauthLeave = await leaveRoomAuthoritative('', unauthUser, testDb as any);
    expect(unauthLeave.success).toBe(true);

    // Unauthenticated transfer -> rejected
    const unauthTransfer = await transferOwnershipAuthoritative('any-slug', unauthUser, bob.uid, testDb as any);
    expect(unauthTransfer.success).toBe(false);
    expect(unauthTransfer.error).toContain('Caller must be authenticated');

    // Unauthenticated revoke -> rejected
    const unauthRevoke = await revokeRoomAuthoritative('any-slug', unauthUser, testDb as any);
    expect(unauthRevoke.success).toBe(false);
    expect(unauthRevoke.error).toContain('Caller must be authenticated');

    // Unauthenticated remove -> rejected
    const unauthRemove = await removeMemberAuthoritative('any-slug', unauthUser, bob.uid, testDb as any);
    expect(unauthRemove.success).toBe(false);
    expect(unauthRemove.error).toContain('Caller must be authenticated');
  });
});

