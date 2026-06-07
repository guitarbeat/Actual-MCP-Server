import { describe, expect, it } from 'vitest';
import { getTransferLikeMatch, getDateDiffInDays } from './historical-transfer-utils.js';

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

  describe('getDateDiffInDays', () => {
    it('throws an error for invalid first date', () => {
      expect(() => getDateDiffInDays('invalid-date', '2023-01-02')).toThrowError(
        'Invalid dates "invalid-date" and "2023-01-02" supplied for historical transfer matching.',
      );
    });

    it('throws an error for invalid second date', () => {
      expect(() => getDateDiffInDays('2023-01-01', 'not-a-date')).toThrowError(
        'Invalid dates "2023-01-01" and "not-a-date" supplied for historical transfer matching.',
      );
    });

    it('throws an error for both invalid dates', () => {
      expect(() => getDateDiffInDays('invalid-date', 'not-a-date')).toThrowError(
        'Invalid dates "invalid-date" and "not-a-date" supplied for historical transfer matching.',
      );
    });

    it('returns 0 for the same date', () => {
      expect(getDateDiffInDays('2023-01-01', '2023-01-01')).toBe(0);
    });

    it('returns the correct difference in days for positive diff', () => {
      expect(getDateDiffInDays('2023-01-01', '2023-01-05')).toBe(4);
    });

    it('returns the correct absolute difference in days for negative diff', () => {
      expect(getDateDiffInDays('2023-01-05', '2023-01-01')).toBe(4);
    });
  });
});
