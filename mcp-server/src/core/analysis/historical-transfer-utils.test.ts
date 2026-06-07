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
    it('converts a standard YYYY-MM-DD date string to a number', () => {
      expect(toActualDbDate('2023-10-15')).toBe(20231015);
    });

    it('handles dates with single-digit months and days if zero-padded', () => {
      expect(toActualDbDate('2023-05-05')).toBe(20230505);
    });

    it('handles dates at the end of the year', () => {
      expect(toActualDbDate('1999-12-31')).toBe(19991231);
    });

    it('handles dates at the beginning of the year', () => {
      expect(toActualDbDate('2000-01-01')).toBe(20000101);
    });

    it('returns NaN for an invalid date string format', () => {
      expect(toActualDbDate('invalid')).toBeNaN();
    });

    it('returns NaN for an empty string', () => {
      expect(toActualDbDate('')).toBeNaN();
    });
  });
});
