import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('Auth Utilities', () => {
  describe('timingSafeStringEqual', () => {
    it('should return true for identical strings', () => {
      expect(timingSafeStringEqual('secret123', 'secret123')).toBe(true);
      expect(timingSafeStringEqual('', '')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeStringEqual('secret123', 'secret124')).toBe(false);
      expect(timingSafeStringEqual('secret123', 'wrong')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(timingSafeStringEqual('short', 'longer')).toBe(false);
      expect(timingSafeStringEqual('longer', 'short')).toBe(false);
    });

    it('should handle unicode characters correctly', () => {
      expect(timingSafeStringEqual('🔑', '🔑')).toBe(true);
      expect(timingSafeStringEqual('🔑', '🔒')).toBe(false);
    });
  });
});
