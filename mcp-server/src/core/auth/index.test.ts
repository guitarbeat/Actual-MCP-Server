import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret', 'secret')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('very-long-secret-key-12345', 'very-long-secret-key-12345')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeStringEqual('secret', 'wrong')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secre')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secret1')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeStringEqual('abcd', 'abc')).toBe(false);
    expect(timingSafeStringEqual('', 'a')).toBe(false);
  });

  it('should handle unicode strings correctly', () => {
    expect(timingSafeStringEqual('🔒', '🔒')).toBe(true);
    expect(timingSafeStringEqual('🔒', '🔑')).toBe(false);
  });
});
