import * as admin from 'firebase-admin';

export interface CleanupResult {
  roomSlug: string;
  messagesDeleted: number;
  presenceDeleted: number;
  roomDocumentDeleted: boolean;
  success: boolean;
  error?: string;
}

const BATCH_SIZE = 400; // Safe below Firestore's 500 write-limit per batch

/**
 * Idempotent, paginated shredding of all database records associated with a room.
 */
export async function shredRoom(
  db: admin.firestore.Firestore,
  appId: string,
  roomSlug: string,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    roomSlug,
    messagesDeleted: 0,
    presenceDeleted: 0,
    roomDocumentDeleted: false,
    success: false,
  };

  try {
    const roomRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('rooms')
      .doc(roomSlug);

    // 1. Mark status as 'shredding' so no new operations can attach
    await roomRef.set(
      {
        status: 'shredding',
        shreddingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // 2. Delete messages in root messages collection
    const rootMessagesCol = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('messages');

    let moreMessages = true;
    while (moreMessages) {
      const snap = await rootMessagesCol
        .where('roomSlug', '==', roomSlug)
        .limit(BATCH_SIZE)
        .get();

      if (snap.empty) {
        moreMessages = false;
        break;
      }

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.messagesDeleted += snap.size;

      if (snap.size < BATCH_SIZE) {
        moreMessages = false;
      }
    }

    // 3. Delete messages in subcollection if present
    const subMessagesCol = roomRef.collection('messages');
    let moreSubMessages = true;
    while (moreSubMessages) {
      const snap = await subMessagesCol.limit(BATCH_SIZE).get();
      if (snap.empty) {
        moreSubMessages = false;
        break;
      }
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.messagesDeleted += snap.size;

      if (snap.size < BATCH_SIZE) {
        moreSubMessages = false;
      }
    }

    // 4. Delete root presence documents
    const rootPresenceCol = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('presence');

    let morePresence = true;
    while (morePresence) {
      const snap = await rootPresenceCol
        .where('roomSlug', '==', roomSlug)
        .limit(BATCH_SIZE)
        .get();

      if (snap.empty) {
        morePresence = false;
        break;
      }

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.presenceDeleted += snap.size;

      if (snap.size < BATCH_SIZE) {
        morePresence = false;
      }
    }

    // 5. Delete subcollection presence documents
    const subPresenceCol = roomRef.collection('presence');
    let moreSubPresence = true;
    while (moreSubPresence) {
      const snap = await subPresenceCol.limit(BATCH_SIZE).get();
      if (snap.empty) {
        moreSubPresence = false;
        break;
      }
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      result.presenceDeleted += snap.size;

      if (snap.size < BATCH_SIZE) {
        moreSubPresence = false;
      }
    }

    // 6. Delete the room document itself
    await roomRef.delete();
    result.roomDocumentDeleted = true;
    result.success = true;
  } catch (err: any) {
    result.success = false;
    result.error = err?.message || String(err);
  }

  return result;
}
