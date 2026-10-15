import { describe, expect, it } from 'vitest';
import { MAX_LIFETIME_MS } from './constants';
import {
  calculateExpiresAt,
  formatTimeRemaining,
  isRoomActive,
  isRoomExpired,
  isRoomRevoked,
} from './expiry';
import type { RoomData } from '../types';

describe('Expiration & Revocation Logic', () => {
  const baseTime = 1700000000000;

  it('calculates 2 hours expiration correctly', () => {
    const expiresAt = calculateExpiresAt(baseTime, '2h');
    expect(expiresAt - baseTime).toBe(2 * 60 * 60 * 1000);
  });

  it('calculates 24 hours expiration correctly', () => {
    const expiresAt = calculateExpiresAt(baseTime, '24h');
    expect(expiresAt - baseTime).toBe(24 * 60 * 60 * 1000);
  });

  it('calculates 3 days expiration correctly', () => {
    const expiresAt = calculateExpiresAt(baseTime, '3d');
    expect(expiresAt - baseTime).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('calculates 7 days expiration correctly', () => {
    const expiresAt = calculateExpiresAt(baseTime, '7d');
    expect(expiresAt - baseTime).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('strictly clamps any attempt to exceed 7 days to MAX_LIFETIME_MS', () => {
    // If a manipulated parameter is passed
    const expiresAt = calculateExpiresAt(baseTime, '30d');
    // Falls back to default or clamps to <= MAX_LIFETIME_MS
    expect(expiresAt - baseTime).toBeLessThanOrEqual(MAX_LIFETIME_MS);
  });

  it('detects active, expired, and revoked room states accurately', () => {
    const activeRoom: RoomData = {
      slug: 'test-room',
      creatorUid: 'user-1',
      createdAt: baseTime,
      expiresAt: baseTime + 24 * 60 * 60 * 1000,
      ttlLabel: '24 hours',
      status: 'active',
      allowPeerRevoke: true,
      keyCommitment: 'commitment-1',
      encryptionCipher: 'AES-256-GCM',
    };

    expect(isRoomExpired(activeRoom, baseTime + 1000)).toBe(false);
    expect(isRoomRevoked(activeRoom)).toBe(false);
    expect(isRoomActive(activeRoom, baseTime + 1000)).toBe(true);

    // After expiration timestamp
    expect(isRoomExpired(activeRoom, baseTime + 25 * 60 * 60 * 1000)).toBe(true);
    expect(isRoomActive(activeRoom, baseTime + 25 * 60 * 60 * 1000)).toBe(false);

    // When marked revoked
    const revokedRoom: RoomData = {
      ...activeRoom,
      status: 'revoked',
      revokedAt: baseTime + 5000,
    };
    expect(isRoomRevoked(revokedRoom)).toBe(true);
    expect(isRoomActive(revokedRoom, baseTime + 1000)).toBe(false);
  });

  it('formats time remaining accurately', () => {
    const expiresAt = baseTime + 3600 * 1000; // 1 hour left
    expect(formatTimeRemaining(expiresAt, baseTime)).toBe('1h 0m left');
    expect(formatTimeRemaining(baseTime - 1000, baseTime)).toBe('Expired');
  });
});
