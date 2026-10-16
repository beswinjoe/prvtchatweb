// =============================================================================
// PRVTCHAT E2EE MESSAGING — UTILITY HELPERS
// =============================================================================

import type { ParticipantPalette, SlugValidation } from '../types';

const ADJECTIVES = [
  'silent', 'calm', 'hidden', 'azure', 'amber', 'swift', 'lunar', 'solar',
  'coastal', 'golden', 'frosty', 'rustic', 'serene', 'velvet', 'misty', 'shadow',
  'iron', 'cedar', 'nordic', 'alpine', 'arctic', 'brave', 'quiet', 'gentle',
];

const NOUNS = [
  'harbor', 'summit', 'breeze', 'valley', 'meadow', 'island', 'canyon', 'forest',
  'beacon', 'aurora', 'stream', 'horizon', 'glacier', 'shield', 'oasis', 'cove',
  'ridge', 'sanctuary', 'cascade', 'monarch', 'passage', 'spire', 'grove', 'haven',
];

/**
 * Generates a collision-resistant, cryptographically secure random room slug.
 * Format: [adjective]-[noun]-[6 secure random alphanumeric chars]
 */
export function generateSecureRoomSlug(): string {
  const cryptoObj =
    typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : typeof globalThis !== 'undefined' && globalThis.crypto
      ? (globalThis.crypto as Crypto)
      : null;

  const adjIndex = cryptoObj
    ? cryptoObj.getRandomValues(new Uint32Array(1))[0] % ADJECTIVES.length
    : Math.floor(Math.random() * ADJECTIVES.length);
  const nounIndex = cryptoObj
    ? cryptoObj.getRandomValues(new Uint32Array(1))[0] % NOUNS.length
    : Math.floor(Math.random() * NOUNS.length);

  const adj = ADJECTIVES[adjIndex];
  const noun = NOUNS[nounIndex];

  let randomSuffix = '';
  if (cryptoObj) {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(4));
    for (let i = 0; i < bytes.length; i++) {
      randomSuffix += bytes[i].toString(36).padStart(2, '0');
    }
    randomSuffix = randomSuffix.slice(0, 6);
  } else {
    randomSuffix = Math.random().toString(36).substring(2, 8);
  }

  return `${adj}-${noun}-${randomSuffix}`;
}

/**
 * Sanitizes user input into a URL-friendly slug.
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
}

/**
 * Validates slug format and length.
 */
export function validateSlug(slug: string): SlugValidation {
  if (!slug || slug.length < 3) {
    return { valid: false, reason: 'Slug must be at least 3 characters long.' };
  }
  if (slug.length > 36) {
    return { valid: false, reason: 'Slug must be 36 characters or fewer.' };
  }
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(slug)) {
    return { valid: false, reason: 'Use lowercase letters, numbers, hyphens, or underscores.' };
  }
  return { valid: true, reason: 'Valid custom URL slug.' };
}

/**
 * Formats milliseconds remaining into human readable string.
 */
export function formatTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return 'Burn on revoke';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

/**
 * Formats millisecond timestamp into localized time string.
 */
export function formatTimestamp(ms?: number | null): string {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

/**
 * Computes deterministic avatar palette for a participant UID.
 */
export function getParticipantColor(uid?: string): ParticipantPalette {
  const palettes: ParticipantPalette[] = [
    { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
    { bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-500' },
    { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
    { bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
    { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
    { bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  ];
  let hash = 0;
  const str = uid || 'anon';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
}
