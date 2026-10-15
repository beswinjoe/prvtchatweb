// =============================================================================
// PRVTCHAT E2EE MESSAGING — TYPE DEFINITIONS
// =============================================================================

/** Encrypted payload as stored in Firestore/Relay */
export interface EncryptedPacket {
  iv: string;
  ciphertext: string;
  alg: 'AES-256-GCM';
}

/** Key metadata derived from SHA-256 of the raw key */
export interface KeyMetadata {
  fingerprint: string;
  commitment: string;
}

/** Expiration / TTL configuration option */
export interface ExpirationOption {
  id: '2h' | '24h' | '3d' | '7d';
  label: string;
  shortLabel: string;
  ms: number;
  desc: string;
}

/** Room document metadata */
export interface RoomData {
  slug: string;
  creatorUid: string;
  createdAt: number;
  expiresAt: number;
  ttlLabel: string;
  status: 'active' | 'revoked' | 'expired';
  allowPeerRevoke: boolean;
  keyCommitment: string;
  encryptionCipher: 'AES-256-GCM';
  revokedAt?: number;
  revokedBy?: string;
}

/** Raw encrypted message record stored on server / relay */
export interface EncryptedMessage {
  id: string;
  roomSlug: string;
  senderUid: string;
  createdAt: number;
  type: 'text' | 'image';
  iv: string;
  ciphertext: string;
  alg: string;
  deleted: boolean;
  deletedAt?: number;
  reactionsIv?: string;
  reactionsCiphertext?: string;
}

/** Decrypted plaintext message payload */
export interface MessagePayload {
  text: string;
  senderName: string;
  sentAt: number;
  replyTo: ReplyRef | null;
  attachment: ImageAttachment | null;
}

/** Reply reference embedded in a message payload */
export interface ReplyRef {
  id: string;
  senderName: string;
  snippet: string;
}

/** Compressed image attachment (client-side, pre-encryption) */
export interface ImageAttachment {
  dataUrl: string;
  width: number;
  height: number;
  originalName: string;
  mimeType?: string;
  approxBytes: number;
}

/** Reaction map: emoji → list of {uid, name} */
export type ReactionMap = Record<string, { uid: string; name: string }[]>;

/** Client-side decrypted message ready for rendering */
export interface DecryptedMessage {
  id: string;
  senderUid: string;
  createdAt: number;
  iv?: string;
  ciphertext?: string;
  deleted: boolean;
  decryptionFailed?: boolean;
  decrypted: MessagePayload | null;
  reactions: ReactionMap;
}

/** Raw Firestore presence record */
export interface PresenceRecord {
  id: string;
  roomSlug: string;
  uid: string;
  iv: string;
  ciphertext: string;
  isTyping: boolean;
  lastSeen: number;
}

/** Decrypted peer presence info */
export interface ActivePeer {
  uid: string;
  displayName: string;
  isTyping: boolean;
  lastSeen: number;
}

/** Slug validation result */
export interface SlugValidation {
  valid: boolean;
  reason: string;
}

/** Slug availability status */
export interface SlugStatus {
  checking: boolean;
  available: boolean;
  reason: string;
}

/** Participant avatar styling palette */
export interface ParticipantPalette {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

/** Navigation view state */
export type AppView = 'landing' | 'chat' | 'expired';

/** Reason why a room is no longer accessible */
export type ExpiredReason = 'revoked' | 'expired' | 'not_found' | 'invalid_key';
