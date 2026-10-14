// =============================================================================
// VESPER E2EE MESSAGING — CONSTANTS & CONFIGURATION
// =============================================================================

import type { ArchitectureStep, ExpirationOption } from '../types';

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { id: '15m', label: '15m', fullLabel: '15 Minutes', ms: 15 * 60 * 1000, desc: 'Tactical sync' },
  { id: '1h', label: '1h', fullLabel: '1 Hour', ms: 60 * 60 * 1000, desc: 'Standard session' },
  { id: '24h', label: '24h', fullLabel: '24 Hours', ms: 24 * 60 * 60 * 1000, desc: 'Day-long link' },
  { id: '7d', label: '7d', fullLabel: '7 Days', ms: 7 * 24 * 60 * 60 * 1000, desc: 'Extended window' },
  { id: 'manual', label: 'Burn on Revoke', fullLabel: 'Until Revoked', ms: null, desc: 'Manual burn' },
];

export const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Quick Reactions': ['👍', '❤️', '🔥', '✨', '👀', '🚀', '💯', '🙏'],
  'Expressions': ['😀', '😂', '🥹', '😎', '🤔', '🫡', '🤫', '🤯', '🥳', '😴', '🫠', '👻'],
  'Security & Tech': ['🔒', '🛡️', '🔑', '⚡', '💻', '📡', '🧬', '⏳', '🗑️', '✅', '⚠️', '🚫'],
  'Gestures & Objects': ['👋', '🤝', '👏', '🙌', '✌️', '🫶', '📎', '📌', '🎉', '☕', '🌙', '☀️'],
};

export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '🔥', '✨', '👀', '🔒'];

export const SUGGESTED_SLUGS = [
  'afterhours',
  'just-us',
  'board-brief',
  'red-team',
  'zero-trace',
  'quiet-room',
];

export const ARCHITECTURE_STEPS: ArchitectureStep[] = [
  {
    step: '01',
    title: 'Client CSPRNG 256-Bit Key Generation',
    badge: 'window.crypto.subtle',
    desc: 'Your browser generates a cryptographically random 256-bit AES-GCM key in volatile memory. The raw secret is encoded into the #key= URI fragment—which browsers never include in HTTP requests.',
    code: `const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);\n// Appended strictly to client URI fragment:\n// https://vesper.link/?room=afterhours#key=9xK2mP8vQ...`,
  },
  {
    step: '02',
    title: 'Authenticated AES-256-GCM Sealing',
    badge: '96-Bit IV + 128-Bit Tag',
    desc: 'Before any message, reaction, alias, or compressed image leaves your device, it is sealed with a fresh 96-bit Initialization Vector and a 128-bit Galois/Counter Mode authentication tag.',
    code: `const iv = crypto.getRandomValues(new Uint8Array(12));\nconst ciphertext = await crypto.subtle.encrypt(\n  { name: "AES-GCM", iv, tagLength: 128 },\n  roomKey,\n  encodedPlaintext\n);`,
  },
  {
    step: '03',
    title: 'Zero-Knowledge Cloud Relay',
    badge: 'Opaque Ciphertext Only',
    desc: 'Firestore only receives the routing slug, the 96-bit IV, and the opaque Base64URL ciphertext. Without the #key fragment, the server and database administrators see only random noise.',
    code: `// Stored in Firestore (/rooms/afterhours):\n{\n  "alg": "AES-256-GCM",\n  "iv": "b8N3x_9kL0pQ2wE1",\n  "ciphertext": "7vK9mP2xR5tY8uI1oP3aS6dF9gH2jK4lZ7xC0vB..."\n}`,
  },
  {
    step: '04',
    title: 'Enforced Expiration & Instant Purge',
    badge: 'Cryptographic Shredding',
    desc: 'When the countdown expires or a participant clicks Revoke, every encrypted message and presence document for that room is permanently deleted from Firestore and the slug is tombstoned.',
    code: `await updateDoc(roomRef, { status: "revoked", revokedAt: Date.now() });\nawait Promise.all(roomDocs.map(doc => deleteDoc(doc.ref)));\n// Room immediately transitions all connected peers to Tombstone screen.`,
  },
];
