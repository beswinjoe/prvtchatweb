// =============================================================================
// PRVTCHAT — AUTHORITATIVE ROOM MEMBERSHIP, ROLES & PRIVILEGE MANAGER
// =============================================================================

import type { RoomData, RoomMember, RoomRole, User } from '../types';
import {
  appId,
  callCloudFunction,
  collection,
  db,
  doc,
  type DocumentSnapshot,
  getDoc,
  onSnapshot,
  runTransaction,
  type Transaction,
  updateDoc,
} from './firebase';

export interface JoinRoomResult {
  success: boolean;
  role: RoomRole;
  memberCount: number;
  alreadyMember?: boolean;
  error?: string;
}

export interface LeaveRoomResult {
  success: boolean;
  memberCount?: number;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  previousOwnerUid?: string;
  newOwnerUid?: string;
  error?: string;
}

export interface RevokeResult {
  success: boolean;
  error?: string;
  messagesDeleted?: number;
  presenceDeleted?: number;
  membersDeleted?: number;
}

export interface RemoveMemberResult {
  success: boolean;
  removedUid?: string;
  memberCount?: number;
  error?: string;
}

/**
 * Trusted, race-safe join flow enforcing the 12-member capacity limit.
 */
export async function joinRoomAuthoritative(
  roomSlug: string,
  user: User,
  displayName = 'Participant',
  database = db,
): Promise<JoinRoomResult> {
  if (!user || !user.uid) {
    return { success: false, role: 'member', memberCount: 0, error: 'User must be authenticated.' };
  }
  if (!roomSlug || typeof roomSlug !== 'string') {
    return { success: false, role: 'member', memberCount: 0, error: 'Valid room slug is required.' };
  }

  // 1. In-Memory Mock / Test Environment
  if ((database as any)?._isMock) {
    try {
      const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
      const memberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', user.uid);

      return await runTransaction(database, async (tx: Transaction) => {
        const roomSnap = await tx.get<RoomData>(roomRef);
        if (!roomSnap.exists()) {
          throw new Error('Conversation room does not exist.');
        }

        const roomData = roomSnap.data()!;
        const now = Date.now();

        if (roomData.status !== 'active') {
          throw new Error('Conversation is no longer active.');
        }

        if (roomData.expiresAt && now >= roomData.expiresAt) {
          throw new Error('Conversation has expired.');
        }

        const memberSnap = await tx.get<RoomMember>(memberRef);
        const isAlreadyActive = memberSnap.exists() && memberSnap.data()?.status === 'active';

        if (isAlreadyActive) {
          return {
            success: true,
            role: memberSnap.data()?.role || 'member',
            memberCount: roomData.memberCount || 1,
            alreadyMember: true,
          };
        }

        const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
        if (currentCount >= 12) {
          throw new Error('Room capacity reached (12/12 active participants).');
        }

        const newCount = currentCount + 1;
        const callerRole: RoomRole =
          (roomData.ownerUid || roomData.creatorUid) === user.uid ? 'owner' : 'member';

        tx.update(roomRef, {
          memberCount: newCount,
          updatedAt: now,
        });

        tx.set(
          memberRef,
          {
            uid: user.uid,
            role: callerRole,
            status: 'active',
            displayName: displayName.slice(0, 32) || 'Participant',
            joinedAt: memberSnap.exists() ? memberSnap.data()?.joinedAt || now : now,
            updatedAt: now,
          },
          { merge: true },
        );

        return {
          success: true,
          role: callerRole,
          memberCount: newCount,
          alreadyMember: false,
        };
      });
    } catch (err: unknown) {
      return {
        success: false,
        role: 'member',
        memberCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Production: Trusted Cloud Function (strictly NO client-side fallback)
  const cfRes = await callCloudFunction<
    { appId: string; roomSlug: string; displayName: string },
    { success: boolean; role: RoomRole; memberCount: number; alreadyMember?: boolean }
  >('joinRoom', {
    appId,
    roomSlug,
    displayName,
  });

  if (cfRes.success && cfRes.data) {
    return {
      success: true,
      role: cfRes.data.role,
      memberCount: cfRes.data.memberCount,
      alreadyMember: cfRes.data.alreadyMember,
    };
  }

  return {
    success: false,
    role: 'member',
    memberCount: 0,
    error: cfRes.error || 'Failed to join conversation room on server.',
  };
}

/**
 * Trusted, safe room departure releasing capacity.
 * Fails safely and reports real outcome without swallowing errors or insecure fallback.
 */
export async function leaveRoomAuthoritative(
  roomSlug: string,
  user: User,
  database = db,
): Promise<LeaveRoomResult> {
  if (!user || !user.uid) return { success: true };
  if (!roomSlug) return { success: false, error: 'Valid room slug is required.' };

  // 1. In-Memory Mock / Test Environment
  if ((database as any)?._isMock) {
    try {
      const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
      const memberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', user.uid);

      return await runTransaction(database, async (tx: Transaction) => {
        const roomSnap = await tx.get<RoomData>(roomRef);
        if (!roomSnap.exists()) return { success: true, memberCount: 0 };

        const memberSnap = await tx.get<RoomMember>(memberRef);
        if (!memberSnap.exists() || memberSnap.data()?.status !== 'active') {
          return { success: true, memberCount: roomSnap.data()?.memberCount || 1 };
        }

        const roomData = roomSnap.data()!;
        const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
        const newCount = Math.max(1, currentCount - 1);
        const now = Date.now();

        tx.update(roomRef, {
          memberCount: newCount,
          updatedAt: now,
        });

        tx.update(memberRef, {
          status: 'departed',
          departedAt: now,
          updatedAt: now,
        });

        return { success: true, memberCount: newCount };
      });
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 2. Production: Trusted Cloud Function (strictly NO client-side fallback)
  const cfRes = await callCloudFunction<{ appId: string; roomSlug: string }, { success: boolean; memberCount?: number }>(
    'leaveRoom',
    { appId, roomSlug },
  );

  if (cfRes.success) {
    return { success: true, memberCount: cfRes.data?.memberCount };
  }

  return {
    success: false,
    error: cfRes.error || 'Failed to leave conversation room on server.',
  };
}

/**
 * Atomically transfers room ownership to another active participant.
 * Prevents non-owners, self-transfers, and departed/nonexistent recipients.
 */
export async function transferOwnershipAuthoritative(
  roomSlug: string,
  currentUser: User,
  newOwnerUid: string,
  database = db,
): Promise<TransferResult> {
  if (!currentUser || !currentUser.uid) {
    return { success: false, error: 'Caller must be authenticated.' };
  }
  if (!newOwnerUid || currentUser.uid === newOwnerUid) {
    return { success: false, error: 'Cannot transfer ownership to yourself.' };
  }
  if (!roomSlug) {
    return { success: false, error: 'Valid room slug is required.' };
  }

  // 1. In-Memory Mock / Test Environment
  if ((database as any)?._isMock) {
    try {
      const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
      const oldOwnerMemberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', currentUser.uid);
      const newOwnerMemberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', newOwnerUid);

      return await runTransaction(database, async (tx: Transaction) => {
        const roomSnap = await tx.get<RoomData>(roomRef);
        if (!roomSnap.exists()) {
          throw new Error('Conversation room does not exist.');
        }

        const roomData = roomSnap.data()!;
        const currentOwner = roomData.ownerUid || roomData.creatorUid;

        if (currentOwner !== currentUser.uid) {
          throw new Error('Only the current room owner can transfer ownership.');
        }

        if (roomData.status !== 'active') {
          throw new Error('Cannot transfer ownership of an inactive or revoked room.');
        }

        if (roomData.expiresAt && Date.now() >= roomData.expiresAt) {
          throw new Error('Cannot transfer ownership of an expired room.');
        }

        const newOwnerSnap = await tx.get<RoomMember>(newOwnerMemberRef);
        if (!newOwnerSnap.exists() || newOwnerSnap.data()?.status !== 'active') {
          throw new Error('Recipient is not an active participant in this conversation.');
        }

        const now = Date.now();

        // 1. Update room document owner
        tx.update(roomRef, {
          ownerUid: newOwnerUid,
          ownershipTransferredAt: now,
          updatedAt: now,
        });

        // 2. Promote recipient to owner role
        tx.update(newOwnerMemberRef, {
          role: 'owner',
          updatedAt: now,
        });

        // 3. Demote previous owner to member role
        tx.update(oldOwnerMemberRef, {
          role: 'member',
          updatedAt: now,
        });

        return {
          success: true,
          previousOwnerUid: currentUser.uid,
          newOwnerUid,
        };
      });
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Production: Trusted Cloud Function (strictly NO client-side fallback)
  const cfRes = await callCloudFunction<
    { appId: string; roomSlug: string; newOwnerUid: string },
    { success: boolean; previousOwnerUid: string; newOwnerUid: string }
  >('transferOwnership', {
    appId,
    roomSlug,
    newOwnerUid,
  });

  if (cfRes.success && cfRes.data) {
    return {
      success: true,
      previousOwnerUid: cfRes.data.previousOwnerUid,
      newOwnerUid: cfRes.data.newOwnerUid,
    };
  }

  return {
    success: false,
    error: cfRes.error || 'Failed to transfer ownership on server.',
  };
}

/**
 * Authoritatively revokes and shreds a room.
 * Strictly verifies caller identity against the room owner record.
 */
export async function revokeRoomAuthoritative(
  roomSlug: string,
  currentUser: User,
  database = db,
): Promise<RevokeResult> {
  if (!currentUser || !currentUser.uid) {
    return { success: false, error: 'Caller must be authenticated.' };
  }
  if (!roomSlug) {
    return { success: false, error: 'Valid room slug is required.' };
  }

  // 1. In-Memory Mock / Test Environment
  if ((database as any)?._isMock) {
    try {
      const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
      const roomSnap = await getDoc<RoomData>(roomRef);
      if (!roomSnap || !roomSnap.exists()) {
        return { success: false, error: 'Room does not exist.' };
      }
      const data = roomSnap.data() as RoomData;
      const authoritativeOwner = data.ownerUid || data.creatorUid;
      if (authoritativeOwner !== currentUser.uid) {
        return { success: false, error: 'Only the authoritative room owner can revoke or destroy this room.' };
      }

      await updateDoc(roomRef, {
        status: 'revoked',
        revokedAt: Date.now(),
        revokedBy: currentUser.uid,
      });

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 2. Production: Trusted Cloud Function (strictly NO client-side fallback)
  const cfRes = await callCloudFunction<
    { appId: string; roomSlug: string },
    { success: boolean; messagesDeleted?: number; presenceDeleted?: number; membersDeleted?: number }
  >('revokeRoom', {
    appId,
    roomSlug,
  });

  if (cfRes.success) {
    return {
      success: true,
      messagesDeleted: cfRes.data?.messagesDeleted,
      presenceDeleted: cfRes.data?.presenceDeleted,
      membersDeleted: cfRes.data?.membersDeleted,
    };
  }

  return {
    success: false,
    error: cfRes.error || 'Failed to revoke room on server.',
  };
}

/**
 * Authoritatively removes an ordinary participant from a room.
 * Restricted strictly to the authoritative room owner.
 */
export async function removeMemberAuthoritative(
  roomSlug: string,
  currentUser: User,
  targetUid: string,
  database = db,
): Promise<RemoveMemberResult> {
  if (!currentUser || !currentUser.uid) {
    return { success: false, error: 'Caller must be authenticated.' };
  }
  if (!targetUid || currentUser.uid === targetUid) {
    return { success: false, error: 'Owner cannot remove themselves.' };
  }
  if (!roomSlug) {
    return { success: false, error: 'Valid room slug is required.' };
  }

  // 1. In-Memory Mock / Test Environment
  if ((database as any)?._isMock) {
    try {
      const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
      const memberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', targetUid);

      return await runTransaction(database, async (tx: Transaction) => {
        const roomSnap = await tx.get<RoomData>(roomRef);
        if (!roomSnap.exists()) throw new Error('Conversation room does not exist.');

        const roomData = roomSnap.data()!;
        const currentOwner = roomData.ownerUid || roomData.creatorUid;
        if (currentOwner !== currentUser.uid) {
          throw new Error('Only the authoritative room owner can remove members.');
        }

        const memberSnap = await tx.get<RoomMember>(memberRef);
        if (!memberSnap.exists() || memberSnap.data()?.status !== 'active') {
          throw new Error('Target participant is not active in this room.');
        }

        const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
        const newCount = Math.max(1, currentCount - 1);
        const now = Date.now();

        tx.update(roomRef, { memberCount: newCount, updatedAt: now });
        tx.update(memberRef, { status: 'removed', removedAt: now, removedBy: currentUser.uid, updatedAt: now });

        return { success: true, removedUid: targetUid, memberCount: newCount };
      });
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 2. Production: Trusted Cloud Function (strictly NO client-side fallback)
  const cfRes = await callCloudFunction<
    { appId: string; roomSlug: string; targetUid: string },
    { success: boolean; removedUid: string; memberCount: number }
  >('removeMember', {
    appId,
    roomSlug,
    targetUid,
  });

  if (cfRes.success && cfRes.data) {
    return {
      success: true,
      removedUid: cfRes.data.removedUid,
      memberCount: cfRes.data.memberCount,
    };
  }

  return {
    success: false,
    error: cfRes.error || 'Failed to remove member on server.',
  };
}

/**
 * Listens to active room members in real-time.
 */
export function listenToRoomMembers(
  roomSlug: string,
  onUpdate: (members: RoomMember[]) => void,
): () => void {
  const membersCol = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members');

  return onSnapshot(
    membersCol,
    (snap) => {
      const active: RoomMember[] = [];
      snap.forEach((d: DocumentSnapshot) => {
        const data = d.data() as RoomMember | undefined;
        if (data && data.status === 'active') {
          active.push({
            ...data,
            uid: d.id,
          });
        }
      });
      onUpdate(active);
    },
    () => {
      onUpdate([]);
    },
  );
}
