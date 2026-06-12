import { describe, expect, it } from 'vitest';
import {
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

    it('handles leap years correctly', () => {
      expect(shiftDateByDays('2024-02-28', 1)).toBe('2024-02-29');
    });

    it('throws an error for an invalid date string', () => {
      expect(() => shiftDateByDays('invalid-date', 1)).toThrowError(
        'Invalid date "invalid-date" supplied for historical transfer matching.',
      );
    });
  });

  describe('getDateDiffInDays', () => {
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
