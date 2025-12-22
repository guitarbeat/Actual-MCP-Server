import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('auth', () => {
  describe('timingSafeStringEqual', () => {
    it('should return true for identical strings', () => {
      const token = 'my-secret-token';
      expect(timingSafeStringEqual(token, token)).toBe(true);
    });

    it('should return false for different strings of same length', () => {
      const token1 = 'my-secret-token';
      const token2 = 'my-secret-tokem';
      expect(timingSafeStringEqual(token1, token2)).toBe(false);
    });

    it('should return false for different strings of different length', () => {
      const token1 = 'my-secret-token';
      const token2 = 'my-secret-token-extra';
      expect(timingSafeStringEqual(token1, token2)).toBe(false);
    });

    it('should return false for empty strings compared to non-empty', () => {
      expect(timingSafeStringEqual('', 'secret')).toBe(false);
    });

    it('should return true for two empty strings', () => {
      expect(timingSafeStringEqual('', '')).toBe(true);
    });

    it('should handle unicode characters correctly', () => {
      expect(timingSafeStringEqual('🔑', '🔑')).toBe(true);
      expect(timingSafeStringEqual('🔑', '🔒')).toBe(false);
    });
  });
});
