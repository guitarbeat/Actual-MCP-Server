import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { escapeRegExp } from './regex-utils.js';

describe('regex-utils', () => {
  describe('escapeRegExp', () => {
    it('should return the original string if there are no special characters', () => {
      expect(escapeRegExp('abc123')).toBe('abc123');
      expect(escapeRegExp('hello world')).toBe('hello world');
    });

    it('should escape specific regex special characters', () => {
      expect(escapeRegExp('.')).toBe('\\.');
      expect(escapeRegExp('*')).toBe('\\*');
      expect(escapeRegExp('+')).toBe('\\+');
      expect(escapeRegExp('?')).toBe('\\?');
      expect(escapeRegExp('^')).toBe('\\^');
      expect(escapeRegExp('$')).toBe('\\$');
      expect(escapeRegExp('{')).toBe('\\{');
      expect(escapeRegExp('}')).toBe('\\}');
      expect(escapeRegExp('(')).toBe('\\(');
      expect(escapeRegExp(')')).toBe('\\)');
      expect(escapeRegExp('|')).toBe('\\|');
      expect(escapeRegExp('[')).toBe('\\[');
      expect(escapeRegExp(']')).toBe('\\]');
      expect(escapeRegExp('\\')).toBe('\\\\');
    });

    it('should escape a combination of characters', () => {
      expect(escapeRegExp('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
        'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o',
      );
    });

    it('should properly escape string when used in a RegExp', () => {
      // The original string we want to match exactly
      const original = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o';
      const escaped = escapeRegExp(original);

      // Create a RegExp that strictly matches only the exact original string
      const regex = new RegExp(`^${escaped}$`);

      // Should match the exact original
      expect(regex.test(original)).toBe(true);

      // Should not match a modified version
      const modified = 'aXb*c+d?e^f$g{h}i(j)k|l[m]n\\o';
      expect(regex.test(modified)).toBe(false);
    });

    it('should correctly handle all possible strings (property-based test)', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const escaped = escapeRegExp(s);
          const regex = new RegExp(`^${escaped}$`);
          return regex.test(s);
        }),
      );
    });
  });
});
