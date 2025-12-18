import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret', 'secret')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('a-very-long-token-string-12345', 'a-very-long-token-string-12345')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeStringEqual('secret', 'wrong')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secre')).toBe(false);
    expect(timingSafeStringEqual('secret', 'secret1')).toBe(false);
    expect(timingSafeStringEqual('a', 'b')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('short', 'longer')).toBe(false);
    expect(timingSafeStringEqual('', 'a')).toBe(false);
  });

  it('should return false for empty string vs non-empty', () => {
    expect(timingSafeStringEqual('', 'secret')).toBe(false);
    expect(timingSafeStringEqual('secret', '')).toBe(false);
  });
});
