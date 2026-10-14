// =============================================================================
// VESPER E2EE MESSAGING — TYPE DEFINITIONS
// =============================================================================

/** Encrypted payload as stored in Firestore */
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
  id: string;
  label: string;
  fullLabel: string;
  ms: number | null;
  desc: string;
}

/** Firestore room document */
export interface RoomData {
  slug: string;
  creatorUid: string;
  createdAt: number;
  expiresAt: number | null;
  ttlLabel: string;
  status: 'active' | 'revoked' | 'expired';
  allowPeerRevoke: boolean;
  keyCommitment: string;
  encryptionCipher: string;
  revokedAt?: number;
  revokedBy?: string;
}

/** Raw Firestore message record (still encrypted) */
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

/** Hero preview demo message */
export interface HeroDemoMessage {
  id: string;
  sender: string;
  role: 'me' | 'peer';
  text: string;
  time: string;
  iv: string;
  ciphertext: string;
}

/** Demo key object used in the hero preview */
export interface HeroDemoKey {
  cryptoKey: CryptoKey;
  keyString: string;
  fingerprint: string;
}

/** Live workbench encryption output */
export interface WorkbenchPacket {
  keyFragment: string;
  fullKey: string;
  fingerprint: string;
  iv: string;
  ciphertext: string;
}

/** Architecture explainer step */
export interface ArchitectureStep {
  step: string;
  title: string;
  badge: string;
  desc: string;
  code: string;
}

/** Security test result */
export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
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

/** Participant color palette */
export interface ParticipantPalette {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

/** Navigation view state */
export type AppView = 'landing' | 'chat' | 'expired';

/** Reason why a room is no longer available */
export type ExpiredReason = 'revoked' | 'expired' | 'not_found' | 'invalid_key';

/** Burn simulator state */
export type BurnState = 'active' | 'shredded';

/** Hero preview perspective tab */
export type PreviewTab = 'decrypted' | 'server' | 'split';
