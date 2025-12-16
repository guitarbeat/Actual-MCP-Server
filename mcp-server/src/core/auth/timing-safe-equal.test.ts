import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './timing-safe-equal';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret-token', 'secret-token')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    expect(timingSafeStringEqual('secret-token', 'secret-tokem')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('secret-token', 'secret-tokens')).toBe(false);
    expect(timingSafeStringEqual('short', 'longer-string')).toBe(false);
  });

  it('should handle unicode characters', () => {
    expect(timingSafeStringEqual('🔒', '🔒')).toBe(true);
    expect(timingSafeStringEqual('🔒', '🔑')).toBe(false);
  });
});
