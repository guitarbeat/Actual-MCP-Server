import { describe, it, expect } from 'vitest';
import { escapeRegExp } from './regex-utils.js';

describe('regex-utils', () => {
  describe('escapeRegExp', () => {
    it('should escape all regex special characters', () => {
      const specialChars = '.*+?^${}()|[]\\';
      const escaped = escapeRegExp(specialChars);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should not escape normal characters', () => {
      const normalString = 'hello world 123';
      const escaped = escapeRegExp(normalString);
      expect(escaped).toBe('hello world 123');
    });

    it('should handle mixed strings', () => {
      const mixed = 'hello.world?';
      const escaped = escapeRegExp(mixed);
      expect(escaped).toBe('hello\\.world\\?');
    });

    it('should handle empty strings', () => {
      expect(escapeRegExp('')).toBe('');
    });

    it('should create safe literal matchers when used in RegExp', () => {
      const literalToMatch = 'user@domain.com (test) [value] {xyz} $5.00^';
      const escaped = escapeRegExp(literalToMatch);
      const regex = new RegExp(`^${escaped}$`);

      expect(regex.test(literalToMatch)).toBe(true);

      // Without escaping, '.' acts as a wildcard, so this would match if unescaped
      const similarButDifferent = 'user@domainXcom (test) [value] {xyz} $5.00^';
      expect(regex.test(similarButDifferent)).toBe(false);
    });
  });
});
