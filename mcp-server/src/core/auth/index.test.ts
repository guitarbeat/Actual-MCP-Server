import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './index.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret-token', 'secret-token')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('abc', 'abc')).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    expect(timingSafeStringEqual('secret-token', 'secret-toke1')).toBe(false);
    expect(timingSafeStringEqual('abc', 'abd')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('secret', 'secret-token')).toBe(false);
    expect(timingSafeStringEqual('secret-token', 'secret')).toBe(false);
    expect(timingSafeStringEqual('', 'a')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    expect(timingSafeStringEqual(undefined, 'secret')).toBe(false);
    expect(timingSafeStringEqual('secret', undefined)).toBe(false);
    expect(timingSafeStringEqual(null, 'secret')).toBe(false);
    expect(timingSafeStringEqual('secret', null)).toBe(false);
    expect(timingSafeStringEqual(undefined, undefined)).toBe(false);
  });
});
