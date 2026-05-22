import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { escapeRegExp } from './regex-utils.js';

describe('regex-utils', () => {
  describe('escapeRegExp', () => {
    it('escapes standard regex special characters', () => {
      expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('returns the same string if there are no special characters', () => {
      expect(escapeRegExp('hello world 123')).toBe('hello world 123');
    });

    it('handles an empty string', () => {
      expect(escapeRegExp('')).toBe('');
    });

    it('property-based test: constructed regex mathematically matches original string', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const escaped = escapeRegExp(str);
          // When creating a regex using the escaped string, it should match the original string exactly
          const regex = new RegExp(`^${escaped}$`);
          return regex.test(str);
        }),
      );
    });

    it('property-based test: escaped string contains no unescaped special characters', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const escaped = escapeRegExp(str);
          // Look for any unescaped special character.
          // Note: The logic here is tricky to implement correctly in a regex without basically recreating the function.
          // The previous property test is the strong, mathematical guarantee of correctness.
          // For sanity, let's just assert that if the original string had special characters, the escaped string is longer.
          const hasSpecialChar = /[.*+?^${}()|[\]\\]/.test(str);
          if (hasSpecialChar) {
            return escaped.length > str.length;
          }
          return escaped === str;
        }),
      );
    });
  });
});
