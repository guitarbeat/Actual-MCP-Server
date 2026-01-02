import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('Auth Utilities', () => {
  describe('timingSafeStringEqual', () => {
    it('should return true for identical strings', () => {
      const secret = 'super-secret-token-123';
      expect(timingSafeStringEqual(secret, secret)).toBe(true);
    });

    it('should return false for different strings of same length', () => {
      const secret = 'super-secret-token-123';
      const wrong = 'super-secret-token-124';
      expect(timingSafeStringEqual(secret, wrong)).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const secret = 'super-secret-token-123';
      const wrong = 'super-secret-token';
      expect(timingSafeStringEqual(secret, wrong)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(timingSafeStringEqual('', '')).toBe(true);
      expect(timingSafeStringEqual('a', '')).toBe(false);
      expect(timingSafeStringEqual('', 'a')).toBe(false);
    });

    it('should handle unicode strings', () => {
      const secret = '🔑-secret';
      expect(timingSafeStringEqual(secret, secret)).toBe(true);
      expect(timingSafeStringEqual(secret, '🔑-wrong')).toBe(false);
    });
  });
});
