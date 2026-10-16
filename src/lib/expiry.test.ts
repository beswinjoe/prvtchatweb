import { describe, expect, it } from 'vitest';
import { MAX_LIFETIME_MS } from './constants';
import {
  calculateExpiresAt,
  formatTimeRemaining,
  getTtlLabel,
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

  it('calculates custom expiration date correctly', () => {
    const customTime = baseTime + 14 * 60 * 60 * 1000; // 14 hours
    const expiresAt = calculateExpiresAt(baseTime, 'custom', customTime);
    expect(expiresAt).toBe(customTime);
  });

  it('strictly clamps custom expiration exceeding 7 days to MAX_LIFETIME_MS', () => {
    const customTime = baseTime + 10 * 24 * 60 * 60 * 1000; // 10 days
    const expiresAt = calculateExpiresAt(baseTime, 'custom', customTime);
    expect(expiresAt - baseTime).toBe(MAX_LIFETIME_MS);
  });

  it('falls back to default 24h when custom expiresAt is missing or past', () => {
    const expiresAtNull = calculateExpiresAt(baseTime, 'custom', null);
    expect(expiresAtNull - baseTime).toBe(24 * 60 * 60 * 1000);

    const expiresAtPast = calculateExpiresAt(baseTime, 'custom', baseTime - 1000);
    expect(expiresAtPast - baseTime).toBe(24 * 60 * 60 * 1000);
  });

  it('generates accurate labels for preset and custom expiration', () => {
    expect(getTtlLabel('2h', baseTime + 2 * 3600000, baseTime)).toBe('2 hours');
    expect(getTtlLabel('24h', baseTime + 24 * 3600000, baseTime)).toBe('24 hours');
    expect(getTtlLabel('custom', baseTime + 45 * 60000, baseTime)).toBe('45m (custom)');
    expect(getTtlLabel('custom', baseTime + 12 * 3600000, baseTime)).toBe('12h (custom)');
    expect(getTtlLabel('custom', baseTime + 2 * 86400000, baseTime)).toBe('2d (custom)');
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
      ownerUid: 'user-1',
      creatorUid: 'user-1',
      createdAt: baseTime,
      expiresAt: baseTime + 24 * 60 * 60 * 1000,
      ttlLabel: '24 hours',
      status: 'active',
      memberCount: 1,
      maxMembers: 12,
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
