import { describe, expect, it } from 'vitest';
import { escapeRegExp } from './regex-utils.js';

describe('escapeRegExp', () => {
  it('returns an empty string unchanged', () => {
    expect(escapeRegExp('')).toBe('');
  });

  it('leaves strings without special chars unchanged', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
    expect(escapeRegExp('abc123')).toBe('abc123');
  });

  it('escapes all special regex characters', () => {
    const specials = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'];
    for (const char of specials) {
      const result = escapeRegExp(char);
      expect(result).toBe(`\\${char}`);
    }
  });

  it('escapes a string containing multiple special chars', () => {
    expect(escapeRegExp('a.b*c+d')).toBe('a\\.b\\*c\\+d');
  });

  it('escapes a string with mixed normal and special chars', () => {
    const escaped = escapeRegExp('hello (world) $1.00');
    expect(escaped).toBe('hello \\(world\\) \\$1\\.00');
    // escaped string should be usable as a literal regex pattern
    const regex = new RegExp(escaped);
    expect(regex.test('hello (world) $1.00')).toBe(true);
    expect(regex.test('hello Xworld Y $100')).toBe(false);
  });

  it('double-escapes an already-escaped string', () => {
    expect(escapeRegExp('\\.')).toBe('\\\\\\.');
  });
});
