import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './crypto.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    const token = 'secret-token-123';
    expect(timingSafeStringEqual(token, token)).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    const token1 = 'secret-token-123';
    const token2 = 'secret-token-124';
    expect(timingSafeStringEqual(token1, token2)).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    const token1 = 'secret';
    const token2 = 'secret-long';
    expect(timingSafeStringEqual(token1, token2)).toBe(false);
  });
});
