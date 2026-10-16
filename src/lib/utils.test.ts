import { describe, expect, it } from 'vitest';
import {
  formatTimeRemaining,
  formatTimestamp,
  generateSecureRoomSlug,
  getParticipantColor,
  sanitizeSlug,
  validateSlug,
} from './utils';

describe('Utility and Slug Functions', () => {
  it('generates cryptographically secure, collision-resistant room slugs', () => {
    const slug1 = generateSecureRoomSlug();
    const slug2 = generateSecureRoomSlug();

    expect(slug1).toBeDefined();
    expect(slug2).toBeDefined();
    expect(slug1).not.toBe(slug2);
    // Format: [adj]-[noun]-[6 chars]
    expect(slug1).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{6}$/);
    expect(validateSlug(slug1).valid).toBe(true);
  });

  it('generates distinct slugs across multiple iterations', () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 50; i++) {
      slugs.add(generateSecureRoomSlug());
    }
    expect(slugs.size).toBe(50);
  });

  it('sanitizes user input safely', () => {
    expect(sanitizeSlug('Ocean Breeze!')).toBe('ocean-breeze');
    expect(sanitizeSlug('---test---slug---')).toBe('test-slug');
    expect(sanitizeSlug('chat_123$#@*!')).toBe('chat_123');
  });

  it('validates slugs with strict character and length constraints', () => {
    expect(validateSlug('ab').valid).toBe(false);
    expect(validateSlug('valid-slug-123').valid).toBe(true);
    expect(validateSlug('invalid slug').valid).toBe(false);
    expect(validateSlug('a'.repeat(40)).valid).toBe(false);
  });

  it('formats remaining time accurately', () => {
    const now = 1700000000000;
    expect(formatTimeRemaining(null, now)).toBe('Burn on revoke');
    expect(formatTimeRemaining(now - 1000, now)).toBe('Expired');
    expect(formatTimeRemaining(now + 45000, now)).toBe('45s left');
    expect(formatTimeRemaining(now + 3600000, now)).toBe('1h 0m left');
  });

  it('formats millisecond timestamps into readable time', () => {
    expect(formatTimestamp(null)).toBe('');
    expect(formatTimestamp(1718000000000)).toMatch(/\d{1,2}:\d{2}/);
  });

  it('computes deterministic participant colors based on UID', () => {
    const palette1 = getParticipantColor('user_alice');
    const palette2 = getParticipantColor('user_alice');
    const palette3 = getParticipantColor('user_bob');

    expect(palette1).toEqual(palette2);
    expect(palette1.bg).toBeDefined();
    expect(palette1.text).toBeDefined();
    expect(palette1.border).toBeDefined();
    expect(palette1.dot).toBeDefined();
    expect(palette3.bg).toBeDefined();
  });
});
