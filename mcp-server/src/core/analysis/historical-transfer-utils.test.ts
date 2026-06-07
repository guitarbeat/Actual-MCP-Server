import { describe, expect, it } from 'vitest';
import { getTransferLikeMatch, toActualDbDate } from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('getTransferLikeMatch', () => {
    it('returns null for an empty string', () => {
      expect(getTransferLikeMatch('')).toBeNull();
    });

    it('returns null for a string with only whitespace', () => {
      expect(getTransferLikeMatch('   ')).toBeNull();
    });

    it('returns a match for a valid transfer pattern', () => {
      // Changed to 'venmo' to match exactly without 'payment' overlapping
      const match = getTransferLikeMatch('venmo');
      expect(match).toEqual({
        key: 'venmo',
        reason: expect.any(String),
      });
    });

    it('returns null for an unmatched string', () => {
      expect(getTransferLikeMatch('grocery store')).toBeNull();
    });
  });

  describe('toActualDbDate', () => {
    it('converts a valid YYYY-MM-DD date string to a number', () => {
      expect(toActualDbDate('2023-10-25')).toBe(20231025);
    });

    it('converts a date string without hyphens', () => {
      expect(toActualDbDate('20231025')).toBe(20231025);
    });

    it('handles short formats if valid', () => {
      expect(toActualDbDate('2023-1-5')).toBe(202315);
    });

    it('returns NaN for completely invalid string formats', () => {
      expect(toActualDbDate('invalid-date')).toBeNaN();
    });

    it('returns NaN for empty strings', () => {
      expect(toActualDbDate('')).toBeNaN();
    });
  });
});
