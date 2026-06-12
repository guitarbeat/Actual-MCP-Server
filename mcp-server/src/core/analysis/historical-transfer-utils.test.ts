import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  buildHistoricalTransferCandidateId,
  parseHistoricalTransferCandidateId,
  shiftDateByDays,
  toActualDbDate,
  getDateDiffInDays,
} from './historical-transfer-utils.js';

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

  describe('buildHistoricalTransferCandidateId', () => {
    it('builds a sorted candidate ID from two transaction IDs', () => {
      expect(buildHistoricalTransferCandidateId('b-id', 'a-id')).toBe('a-id::b-id');
    });
  });

  describe('parseHistoricalTransferCandidateId', () => {
    it('parses a candidate ID into two transaction IDs', () => {
      expect(parseHistoricalTransferCandidateId('a-id::b-id')).toEqual(['a-id', 'b-id']);
    });

    it('throws an error if candidate ID is invalid', () => {
      expect(() => parseHistoricalTransferCandidateId('invalid-id')).toThrowError(
        /Invalid historical transfer candidate ID/,
      );
    });
  });

  describe('shiftDateByDays', () => {
    it('shifts a date string by a given number of days', () => {
      expect(shiftDateByDays('2023-01-01', 5)).toBe('2023-01-06');
    });

    it('handles shifting backward', () => {
      expect(shiftDateByDays('2023-01-06', -5)).toBe('2023-01-01');
    });

    it('throws an error for invalid date strings', () => {
      expect(() => shiftDateByDays('invalid-date', 5)).toThrowError(/Invalid date/);
    });
  });

  describe('toActualDbDate', () => {
    it('converts a date string to a number format', () => {
      expect(toActualDbDate('2023-01-01')).toBe(20230101);
    });
  });

  describe('getDateDiffInDays', () => {
    it('calculates the difference in days between two date strings', () => {
      expect(getDateDiffInDays('2023-01-01', '2023-01-06')).toBe(5);
    });

    it('returns the absolute difference regardless of order', () => {
      expect(getDateDiffInDays('2023-01-06', '2023-01-01')).toBe(5);
    });

    it('throws an error for invalid date strings', () => {
      expect(() => getDateDiffInDays('invalid-date', '2023-01-06')).toThrowError(/Invalid dates/);
    });
  });
});
