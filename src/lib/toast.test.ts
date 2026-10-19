import { describe, expect, it } from 'vitest';
import { ToastContext, useToast } from './toast';

describe('Toast Module', () => {
  it('should export ToastContext and useToast hook', () => {
    expect(ToastContext).toBeDefined();
    expect(typeof useToast).toBe('function');
  });
});
