import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { escapeRegExp } from './regex-utils.js';

describe('escapeRegExp', () => {
  it('does not modify strings without special regex characters', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
    expect(escapeRegExp('12345')).toBe('12345');
    expect(escapeRegExp('')).toBe('');
    expect(escapeRegExp('abc_def-ghi')).toBe('abc_def-ghi');
  });

  it('escapes all special regex characters individually', () => {
    const specialChars = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'];
    for (const char of specialChars) {
      expect(escapeRegExp(char)).toBe(`\\${char}`);
    }
  });

  it('escapes multiple special characters in a string', () => {
    expect(escapeRegExp('hello.*world')).toBe('hello\\.\\*world');
    expect(escapeRegExp('^start+end$')).toBe('\\^start\\+end\\$');
    expect(escapeRegExp('(test|value)')).toBe('\\(test\\|value\\)');
    expect(escapeRegExp('[a-z]?')).toBe('\\[a-z\\]\\?');
    expect(escapeRegExp('C:\\path\\to\\file')).toBe('C:\\\\path\\\\to\\\\file');
  });

  it('preserves formatting spaces and newlines', () => {
    expect(escapeRegExp('a\nb\tc')).toBe('a\nb\tc');
  });

  it('property test: any string can be safely used as a literal regex match', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const escaped = escapeRegExp(str);
        // The escaped string, when used to create a RegExp,
        // should exactly match the original string.
        const regex = new RegExp(`^${escaped}$`);
        expect(regex.test(str)).toBe(true);
      }),
    );
  });
});
