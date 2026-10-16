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
 * Callable Cloud Function: Allows authenticated users to request immediate server-side shredding
 * of a room they created or are currently revoking.
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
    const isCreator = data.creatorUid === request.auth.uid;
    const isAlreadyRevoked = data.status === 'revoked' || data.status === 'expired';
    const isExpired = data.expiresAt && Date.now() >= data.expiresAt;

    if (!isCreator && !isAlreadyRevoked && !isExpired) {
      throw new HttpsError('permission-denied', 'Only room creator can trigger immediate shredding of active rooms.');
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
    };
  },
);
