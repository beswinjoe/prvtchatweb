// =============================================================================
// PRVTCHAT — CONSTANTS & CONFIGURATION
// =============================================================================

import type { ExpirationOption } from '../types';

export const MAX_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days hard ceiling

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  {
    id: '2h',
    label: '2 hours',
    shortLabel: '2h',
    ms: 2 * 60 * 60 * 1000,
    desc: 'Quick confidential sync',
  },
  {
    id: '24h',
    label: '24 hours',
    shortLabel: '24h',
    ms: 24 * 60 * 60 * 1000,
    desc: 'Standard day link (Recommended)',
  },
  {
    id: '3d',
    label: '3 days',
    shortLabel: '3d',
    ms: 3 * 24 * 60 * 60 * 1000,
    desc: 'Multi-day project review',
  },
  {
    id: '7d',
    label: '7 days',
    shortLabel: '7d',
    ms: 7 * 24 * 60 * 60 * 1000,
    desc: 'Maximum allowed retention',
  },
];

export const DEFAULT_EXPIRATION_ID = '24h';

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
  'team-sync',
  'zero-trace',
  'private-room',
];
