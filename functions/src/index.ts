import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { shredRoom } from './cleanup';

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled Cloud Function that runs every 15 minutes to shred expired or revoked rooms.
 * Protects database privacy even if all clients disconnect or go offline.
 */
export const scheduledRoomCleanup = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const now = Date.now();
    const targetAppId = process.env.APP_ID || 'prvtchat-ephemeral-e2ee';

    console.log(`[scheduledRoomCleanup] Starting room shredding sweep at ${new Date(now).toISOString()} for appId: ${targetAppId}`);

    const roomsCol = db
      .collection('artifacts')
      .doc(targetAppId)
      .collection('public')
      .doc('data')
      .collection('rooms');

    // Sweep 1: Expired rooms (ordered by expiration date)
    const expiredSnap = await roomsCol
      .where('expiresAt', '<=', now)
      .orderBy('expiresAt', 'asc')
      .limit(100)
      .get();

    // Sweep 2: Revoked rooms
    const revokedSnap = await roomsCol
      .where('status', '==', 'revoked')
      .limit(100)
      .get();

    // Sweep 3: Stalled shredding rooms
    const stalledSnap = await roomsCol
      .where('status', '==', 'shredding')
      .limit(50)
      .get();

    const slugsToClean = new Set<string>();
    expiredSnap.docs.forEach((doc) => slugsToClean.add(doc.id));
    revokedSnap.docs.forEach((doc) => slugsToClean.add(doc.id));
    stalledSnap.docs.forEach((doc) => slugsToClean.add(doc.id));

    console.log(`[scheduledRoomCleanup] Found ${slugsToClean.size} rooms marked for permanent shredding.`);

    let totalMessagesShredded = 0;
    let totalPresenceShredded = 0;

    for (const slug of slugsToClean) {
      const res = await shredRoom(db, targetAppId, slug);
      if (res.success) {
        totalMessagesShredded += res.messagesDeleted;
        totalPresenceShredded += res.presenceDeleted;
        console.log(`[scheduledRoomCleanup] Successfully shredded /${slug} (${res.messagesDeleted} msgs, ${res.presenceDeleted} presence).`);
      } else {
        console.error(`[scheduledRoomCleanup] Failed shredding /${slug}:`, res.error);
      }
    }

    console.log(`[scheduledRoomCleanup] Finished sweep: ${slugsToClean.size} rooms, ${totalMessagesShredded} messages, ${totalPresenceShredded} presence records shredded.`);
  },
);

/**
 * Callable Cloud Function: Authoritative room revocation and immediate shredding.
 * Strictly restricted to the authoritative room owner.
 */
export const revokeRoom = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to revoke room.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug parameter is required.');
    }

    const callerUid = request.auth.uid;
    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) {
      throw new HttpsError('not-found', 'Room does not exist or has already been shredded.');
    }

    const data = roomDoc.data() || {};
    const authoritativeOwner = data.ownerUid || data.creatorUid;

    if (authoritativeOwner !== callerUid) {
      throw new HttpsError('permission-denied', 'Only the authoritative room owner can revoke or destroy this room.');
    }

    const now = Date.now();

    // Mark room revoked first to immediately stop new messages/joins
    await roomRef.set(
      {
        status: 'revoked',
        revokedAt: now,
        revokedBy: callerUid,
        updatedAt: now,
      },
      { merge: true },
    );

    // Perform permanent server-side shredding
    const result = await shredRoom(db, appId, roomSlug);
    if (!result.success) {
      throw new HttpsError('internal', `Failed to shred room: ${result.error}`);
    }

    return {
      success: true,
      roomSlug,
      messagesDeleted: result.messagesDeleted,
      presenceDeleted: result.presenceDeleted,
      membersDeleted: result.membersDeleted || 0,
    };
  },
);

/**
 * Callable Cloud Function: Allows authoritative room owner to trigger immediate server-side shredding
 * of an expired or revoked room.
 */
export const cleanupRoom = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to request room shredding.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug parameter is required.');
    }

    const callerUid = request.auth.uid;
    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) {
      return { success: true, message: 'Room document does not exist or has already been shredded.' };
    }

    const data = roomDoc.data() || {};
    const isOwner = (data.ownerUid || data.creatorUid) === callerUid;

    if (!isOwner) {
      throw new HttpsError('permission-denied', 'Only the authoritative room owner can trigger room shredding.');
    }

    const result = await shredRoom(db, appId, roomSlug);
    if (!result.success) {
      throw new HttpsError('internal', `Failed to shred room: ${result.error}`);
    }

    return {
      success: true,
      roomSlug,
      messagesDeleted: result.messagesDeleted,
      presenceDeleted: result.presenceDeleted,
      membersDeleted: result.membersDeleted || 0,
    };
  },
);

/**
 * Callable Cloud Function: Atomic, race-safe room joining enforcing the 12-member capacity limit.
 */
export const joinRoom = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to join room.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug, displayName = 'Participant' } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug parameter is required.');
    }

    const callerUid = request.auth.uid;
    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const memberRef = roomRef.collection('members').doc(callerUid);

    return db.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) {
        throw new HttpsError('not-found', 'Conversation room does not exist.');
      }

      const roomData = roomDoc.data() || {};
      const now = Date.now();

      if (roomData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Conversation is no longer active.');
      }

      if (roomData.expiresAt && now >= roomData.expiresAt) {
        throw new HttpsError('failed-precondition', 'Conversation has expired.');
      }

      const memberDoc = await transaction.get(memberRef);
      const isAlreadyActive = memberDoc.exists && memberDoc.data()?.status === 'active';

      if (isAlreadyActive) {
        // Idempotent re-join by active participant
        return {
          success: true,
          role: memberDoc.data()?.role || 'member',
          memberCount: roomData.memberCount || 1,
          alreadyMember: true,
        };
      }

      // Check capacity ceiling: max 12 active participants
      const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
      if (currentCount >= 12) {
        throw new HttpsError(
          'resource-exhausted',
          'Room has reached its maximum capacity of 12 active participants.',
        );
      }

      const newMemberCount = currentCount + 1;
      const callerRole = (roomData.ownerUid || roomData.creatorUid) === callerUid ? 'owner' : 'member';

      transaction.update(roomRef, {
        memberCount: newMemberCount,
        updatedAt: now,
      });

      transaction.set(
        memberRef,
        {
          uid: callerUid,
          role: callerRole,
          status: 'active',
          displayName: String(displayName).slice(0, 32) || 'Participant',
          joinedAt: memberDoc.exists ? memberDoc.data()?.joinedAt || now : now,
          updatedAt: now,
        },
        { merge: true },
      );

      return {
        success: true,
        role: callerRole,
        memberCount: newMemberCount,
        alreadyMember: false,
      };
    });
  },
);

/**
 * Callable Cloud Function: Atomic departure from a room, safely releasing capacity.
 */
export const leaveRoom = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to leave room.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug parameter is required.');
    }

    const callerUid = request.auth.uid;
    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const memberRef = roomRef.collection('members').doc(callerUid);
    const presenceRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('presence')
      .doc(`${roomSlug}_${callerUid}`);

    return db.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) return { success: true, memberCount: 0 };

      const memberDoc = await transaction.get(memberRef);
      if (!memberDoc.exists || memberDoc.data()?.status !== 'active') {
        return { success: true, memberCount: roomDoc.data()?.memberCount || 1 };
      }

      const roomData = roomDoc.data() || {};
      const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
      const newCount = Math.max(1, currentCount - 1);
      const now = Date.now();

      transaction.update(roomRef, {
        memberCount: newCount,
        updatedAt: now,
      });

      transaction.update(memberRef, {
        status: 'departed',
        departedAt: now,
        updatedAt: now,
      });

      transaction.delete(presenceRef);

      return { success: true, memberCount: newCount };
    });
  },
);

/**
 * Callable Cloud Function: Atomic ownership transfer from current owner to an active member.
 */
export const transferOwnership = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to transfer ownership.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug, newOwnerUid } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string' || !newOwnerUid || typeof newOwnerUid !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug and newOwnerUid are required.');
    }

    const callerUid = request.auth.uid;
    if (callerUid === newOwnerUid) {
      throw new HttpsError('invalid-argument', 'Cannot transfer ownership to yourself.');
    }

    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const oldOwnerMemberRef = roomRef.collection('members').doc(callerUid);
    const newOwnerMemberRef = roomRef.collection('members').doc(newOwnerUid);

    return db.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) {
        throw new HttpsError('not-found', 'Conversation room does not exist.');
      }

      const roomData = roomDoc.data() || {};
      const currentOwner = roomData.ownerUid || roomData.creatorUid;

      if (currentOwner !== callerUid) {
        throw new HttpsError('permission-denied', 'Only the current room owner can transfer ownership.');
      }

      if (roomData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Cannot transfer ownership of an inactive or revoked room.');
      }

      if (roomData.expiresAt && Date.now() >= roomData.expiresAt) {
        throw new HttpsError('failed-precondition', 'Cannot transfer ownership of an expired room.');
      }

      const newOwnerDoc = await transaction.get(newOwnerMemberRef);
      if (!newOwnerDoc.exists || newOwnerDoc.data()?.status !== 'active') {
        throw new HttpsError(
          'failed-precondition',
          'Target recipient is not an active participant in this room.',
        );
      }

      const now = Date.now();

      // 1. Update room authoritative owner
      transaction.update(roomRef, {
        ownerUid: newOwnerUid,
        ownershipTransferredAt: now,
        updatedAt: now,
      });

      // 2. Promote recipient to 'owner'
      transaction.update(newOwnerMemberRef, {
        role: 'owner',
        updatedAt: now,
      });

      // 3. Demote former owner to 'member'
      transaction.update(oldOwnerMemberRef, {
        role: 'member',
        updatedAt: now,
      });

      return {
        success: true,
        previousOwnerUid: callerUid,
        newOwnerUid,
      };
    });
  },
);

/**
 * Callable Cloud Function: Allows authoritative room owner to remove an ordinary participant.
 */
export const removeMember = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to remove members.');
    }

    const { appId = 'prvtchat-ephemeral-e2ee', roomSlug, targetUid } = request.data || {};
    if (!roomSlug || typeof roomSlug !== 'string' || !targetUid || typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid roomSlug and targetUid are required.');
    }

    const callerUid = request.auth.uid;
    if (callerUid === targetUid) {
      throw new HttpsError('invalid-argument', 'Owner cannot remove themselves. Transfer ownership or destroy room.');
    }

    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    const targetMemberRef = roomRef.collection('members').doc(targetUid);
    const presenceRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('presence')
      .doc(`${roomSlug}_${targetUid}`);

    return db.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) {
        throw new HttpsError('not-found', 'Conversation room does not exist.');
      }

      const roomData = roomDoc.data() || {};
      const currentOwner = roomData.ownerUid || roomData.creatorUid;

      if (currentOwner !== callerUid) {
        throw new HttpsError('permission-denied', 'Only the authoritative room owner can remove members.');
      }

      if (roomData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Cannot remove members from an inactive room.');
      }

      const targetDoc = await transaction.get(targetMemberRef);
      if (!targetDoc.exists || targetDoc.data()?.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Target participant is not active in this room.');
      }

      const currentCount = typeof roomData.memberCount === 'number' ? roomData.memberCount : 1;
      const newCount = Math.max(1, currentCount - 1);
      const now = Date.now();

      transaction.update(roomRef, {
        memberCount: newCount,
        updatedAt: now,
      });

      transaction.update(targetMemberRef, {
        status: 'removed',
        removedAt: now,
        removedBy: callerUid,
        updatedAt: now,
      });

      transaction.delete(presenceRef);

      return {
        success: true,
        removedUid: targetUid,
        memberCount: newCount,
      };
    });
  },
);
