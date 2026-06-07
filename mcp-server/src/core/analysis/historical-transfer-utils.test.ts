import { describe, expect, it } from 'vitest';
import { getTransferLikeMatch, shiftDateByDays } from './historical-transfer-utils.js';

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

  describe('shiftDateByDays', () => {
    it('shifts a date forward by the given number of days', () => {
      expect(shiftDateByDays('2023-01-01', 5)).toBe('2023-01-06');
    });

    it('shifts a date backward by the given number of days', () => {
      expect(shiftDateByDays('2023-01-10', -5)).toBe('2023-01-05');
    });

    it('handles month boundaries correctly', () => {
      expect(shiftDateByDays('2023-01-31', 1)).toBe('2023-02-01');
      expect(shiftDateByDays('2023-03-01', -1)).toBe('2023-02-28');
    });

    it('handles leap years correctly', () => {
      expect(shiftDateByDays('2024-02-28', 1)).toBe('2024-02-29');
    });

    it('throws an error for an invalid date string', () => {
      expect(() => shiftDateByDays('invalid-date', 1)).toThrowError(
        'Invalid date "invalid-date" supplied for historical transfer matching.'
      );
    });
  });
});
