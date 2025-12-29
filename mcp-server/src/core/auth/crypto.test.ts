import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './crypto.js';

describe('timingSafeStringEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeStringEqual('secret123', 'secret123')).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    expect(timingSafeStringEqual('secret123', 'secret456')).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    expect(timingSafeStringEqual('short', 'longer')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('a', '')).toBe(false);
  });

  it('should handle unicode characters safely', () => {
    // These strings might have same char length but different byte length if not careful,
    // or just generally need robust handling.
    const s1 = '👍'; // 4 bytes
    const s2 = '👎'; // 4 bytes
    expect(timingSafeStringEqual(s1, s1)).toBe(true);
    expect(timingSafeStringEqual(s1, s2)).toBe(false);

    const s3 = 'e\u0301'; // é decomposed (2 chars, 3 bytes? depends on normalization) vs composed 'é' (1 char, 2 bytes)
    const s4 = '\u00e9'; // é composed
    // Note: Buffer.from doesn't normalize, so these might have different bytes.
    // If we want strict equality of content, we might need normalization,
    // but for tokens, exact byte match is usually desired.
    // Buffer.from('e\u0301').length is 3. Buffer.from('\u00e9').length is 2.
    expect(timingSafeStringEqual(s3, s4)).toBe(false);
  });
});
