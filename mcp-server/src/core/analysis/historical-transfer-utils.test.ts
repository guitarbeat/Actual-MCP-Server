import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  buildHistoricalTransferCandidateId,
  parseHistoricalTransferCandidateId,
  shiftDateByDays,
  toActualDbDate,
  getDateDiffInDays,
  buildHistoricalTransferCandidateId,
  getDateDiffInDays,
  getTransferLikeMatch,
  parseHistoricalTransferCandidateId,
  shiftDateByDays,
  toActualDbDate,
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
  describe('parseHistoricalTransferCandidateId', () => {
    it('parses a valid candidate ID into two transaction IDs', () => {
      const result = parseHistoricalTransferCandidateId('aaa::bbb');
      expect(result).toEqual(['aaa', 'bbb']);
    });

    it('throws for a separator-only string ":::"', () => {
      expect(() => parseHistoricalTransferCandidateId(':::')).toThrow();
    });

    it('throws for an empty string', () => {
      expect(() => parseHistoricalTransferCandidateId('')).toThrow();
    });

    it('throws for a single token without separator', () => {
      expect(() => parseHistoricalTransferCandidateId('abc')).toThrow();
    });

    it('throws for three tokens "a::b::c"', () => {
      expect(() => parseHistoricalTransferCandidateId('a::b::c')).toThrow();
    });

    it('throws with a descriptive message referencing the separator', () => {
      expect(() => parseHistoricalTransferCandidateId('')).toThrow('::');
    });
  });

  describe('buildHistoricalTransferCandidateId', () => {
    it('sorts IDs lexicographically before joining', () => {
      const result = buildHistoricalTransferCandidateId('zzz', 'aaa');
      expect(result).toBe('aaa::zzz');
    });

    it('produces the same result regardless of argument order', () => {
      const a = buildHistoricalTransferCandidateId('tx-1', 'tx-2');
      const b = buildHistoricalTransferCandidateId('tx-2', 'tx-1');
      expect(a).toBe(b);
    });

    it('works with the same ID provided twice', () => {
      const result = buildHistoricalTransferCandidateId('same', 'same');
      expect(result).toBe('same::same');
    });
  });

  describe('toActualDbDate', () => {
    it('converts a date string to a number format', () => {
      expect(toActualDbDate('2023-01-01')).toBe(20230101);
    it('converts 2024-01-15 to 20240115', () => {
      expect(toActualDbDate('2024-01-15')).toBe(20240115);
    });

    it('converts 2000-01-01 to 20000101', () => {
      expect(toActualDbDate('2000-01-01')).toBe(20000101);
    });

    it('converts 1999-12-31 to 19991231', () => {
      expect(toActualDbDate('1999-12-31')).toBe(19991231);
    });
  });

  describe('shiftDateByDays', () => {
    it('shifts a date forward by positive days', () => {
      expect(shiftDateByDays('2024-01-10', 5)).toBe('2024-01-15');
    });

    it('shifts a date backward by negative days', () => {
      expect(shiftDateByDays('2024-01-15', -5)).toBe('2024-01-10');
    });

    it('crosses month boundary correctly', () => {
      expect(shiftDateByDays('2024-01-30', 3)).toBe('2024-02-02');
    });

    it('returns the same date when days is 0', () => {
      expect(shiftDateByDays('2024-06-15', 0)).toBe('2024-06-15');
    });

    it('throws for an invalid date string', () => {
      expect(() => shiftDateByDays('not-a-date', 1)).toThrow();
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
    it('returns 0 for the same date', () => {
      expect(getDateDiffInDays('2024-01-15', '2024-01-15')).toBe(0);
    });

    it('returns 3 for dates 3 days apart', () => {
      expect(getDateDiffInDays('2024-01-10', '2024-01-13')).toBe(3);
    });

    it('returns 365 for dates a year apart', () => {
      expect(getDateDiffInDays('2023-01-01', '2024-01-01')).toBe(365);
    });

    it('returns absolute value regardless of order', () => {
      expect(getDateDiffInDays('2024-01-13', '2024-01-10')).toBe(3);
    });

    it('throws for an invalid first date string', () => {
      expect(() => getDateDiffInDays('not-a-date', '2024-01-01')).toThrow();
    });

    it('throws for an invalid second date string', () => {
      expect(() => getDateDiffInDays('2024-01-01', 'bad')).toThrow();
    });
  });
});
