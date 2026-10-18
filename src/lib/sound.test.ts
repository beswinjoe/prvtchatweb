import { describe, expect, it } from 'vitest';
import { soundManager } from './sound';

describe('SoundEffects Manager', () => {
  it('should initialize with sound enabled by default', () => {
    expect(soundManager.isEnabled()).toBe(true);
  });

  it('should toggle sound enabled state', () => {
    const initial = soundManager.isEnabled();
    const toggled = soundManager.toggle();
    expect(toggled).toBe(!initial);
    expect(soundManager.isEnabled()).toBe(!initial);

    // Toggle back
    soundManager.toggle();
    expect(soundManager.isEnabled()).toBe(initial);
  });

  it('should safely handle playback calls in headless test environment', () => {
    expect(() => {
      soundManager.playSent();
      soundManager.playReceived();
      soundManager.playAction();
    }).not.toThrow();
  });
});
