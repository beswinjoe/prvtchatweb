// =============================================================================
// PRVTCHAT — EXPIRATION & REVOCATION UTILITIES
// =============================================================================

import { EXPIRATION_OPTIONS, MAX_LIFETIME_MS } from './constants';
import type { RoomData } from '../types';

/**
 * Calculates authoritative expiration timestamp from creation time and TTL option.
 * Strictly clamps to a maximum of 7 days (MAX_LIFETIME_MS) to prevent client manipulation.
 */
export function calculateExpiresAt(
  createdAt: number,
  ttlId: '2h' | '24h' | '3d' | '7d' | string
): number {
  const option = EXPIRATION_OPTIONS.find((o) => o.id === ttlId) || EXPIRATION_OPTIONS[1]; // default 24h
  const requestedLifetime = option.ms;
  const clampedLifetime = Math.min(requestedLifetime, MAX_LIFETIME_MS);
  return createdAt + clampedLifetime;
}

/**
 * Checks if a room has expired based on current timestamp.
 */
export function isRoomExpired(
  room: Pick<RoomData, 'expiresAt'> | null | undefined,
  now: number = Date.now()
): boolean {
  if (!room || typeof room.expiresAt !== 'number') return true;
  return now >= room.expiresAt;
}

/**
 * Checks if a room has been manually destroyed / revoked.
 */
export function isRoomRevoked(
  room: Pick<RoomData, 'status'> | null | undefined
): boolean {
  if (!room) return true;
  return room.status === 'revoked';
}

/**
 * Verifies room validity (not null, not expired, not revoked).
 */
export function isRoomActive(
  room: RoomData | null | undefined,
  now: number = Date.now()
): boolean {
  if (!room) return false;
  if (room.status !== 'active') return false;
  if (isRoomExpired(room, now)) return false;
  return true;
}

/**
 * Formats countdown time remaining in a human-friendly format.
 */
export function formatTimeRemaining(expiresAt: number | null | undefined, now: number = Date.now()): string {
  if (!expiresAt) return 'No limit';
  const diff = expiresAt - now;
  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}
