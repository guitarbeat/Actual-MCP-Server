import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('Auth Utils', () => {
  describe('timingSafeStringEqual', () => {
    it('should return true for identical strings', () => {
      const secret = 'super-secret-token';
      expect(timingSafeStringEqual(secret, secret)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeStringEqual('abc', 'def')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(timingSafeStringEqual('abc', 'abcd')).toBe(false);
    });

    it('should return false for empty string vs non-empty', () => {
      expect(timingSafeStringEqual('', 'abc')).toBe(false);
    });

    it('should return true for two empty strings', () => {
      expect(timingSafeStringEqual('', '')).toBe(true);
    });

    it('should handle unicode characters', () => {
        expect(timingSafeStringEqual('🔒', '🔒')).toBe(true);
        expect(timingSafeStringEqual('🔒', '🔓')).toBe(false);
    });
  });
});
