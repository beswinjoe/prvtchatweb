// =============================================================================
// PRVTCHAT — ROOM MEMBERSHIP, ROLES & CAPACITY TESTS
// =============================================================================

import { beforeEach, describe, expect, it } from 'vitest';
import {
  joinRoomAuthoritative,
  leaveRoomAuthoritative,
  transferOwnershipAuthoritative,
} from './roomManager';
import {
  appId,
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
});
