// =============================================================================
// PRVTCHAT — AUTHORITATIVE ROOM MEMBERSHIP & ROLE MANAGER
// =============================================================================

import type { RoomData, RoomMember, RoomRole, User } from '../types';
import {
  appId,
  callCloudFunction,
  collection,
  db,
  doc,
  type DocumentSnapshot,
  onSnapshot,
  runTransaction,
  type Transaction,
} from './firebase';

export interface JoinRoomResult {
  success: boolean;
  role: RoomRole;
  memberCount: number;
  alreadyMember?: boolean;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  previousOwnerUid?: string;
  newOwnerUid?: string;
  error?: string;
}

/**
 * Trusted, race-safe join flow enforcing the 12-member capacity limit.
 * Uses Cloud Functions if online/deployed, with client-side Firestore transaction fallback.
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

  // 1. Attempt server-side trusted Cloud Function if not using mock db
  if (!(database as any)?._isMock) {
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
  }

  // 2. Fallback / offline / direct Firestore transaction
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      role: 'member',
      memberCount: 0,
      error: errorMsg,
    };
  }
}

/**
 * Trusted, safe room departure releasing capacity.
 */
export async function leaveRoomAuthoritative(
  roomSlug: string,
  user: User,
  database = db,
): Promise<{ success: boolean; error?: string }> {
  if (!user || !user.uid) return { success: true };

  // 1. Attempt Cloud Function if not using mock db
  if (!(database as any)?._isMock) {
    const cfRes = await callCloudFunction<{ appId: string; roomSlug: string }, { success: boolean }>(
      'leaveRoom',
      { appId, roomSlug },
    );
    if (cfRes.success) return { success: true };
  }

  // 2. Direct Firestore transaction fallback
  try {
    const roomRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug);
    const memberRef = doc(database, 'artifacts', appId, 'public', 'data', 'rooms', roomSlug, 'members', user.uid);

    return await runTransaction(database, async (tx: Transaction) => {
      const roomSnap = await tx.get<RoomData>(roomRef);
      if (!roomSnap.exists()) return { success: true };

      const memberSnap = await tx.get<RoomMember>(memberRef);
      if (!memberSnap.exists() || memberSnap.data()?.status !== 'active') {
        return { success: true };
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

      return { success: true };
    });
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
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

  // 1. Attempt Cloud Function if not using mock db
  if (!(database as any)?._isMock) {
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
  }

  // 2. Direct Firestore transaction fallback
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errorMsg,
    };
  }
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
