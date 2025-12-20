import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret', 'secret')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('a', 'a')).toBe(true);
    expect(timingSafeStringEqual('long-secret-token-12345', 'long-secret-token-12345')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeStringEqual('secret', 'public')).toBe(false);
    expect(timingSafeStringEqual('secret', 'Secret')).toBe(false);
    expect(timingSafeStringEqual('a', 'b')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('secret', 'secre')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secrets')).toBe(false);
    expect(timingSafeStringEqual('', 'a')).toBe(false);
  });
});
