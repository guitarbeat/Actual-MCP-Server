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
    it('should return null for empty string', () => {
      expect(getTransferLikeMatch('')).toBeNull();
    });

    it('should return null for whitespace string', () => {
      expect(getTransferLikeMatch('   ')).toBeNull();
    });

    it('should return null for non-matching patterns', () => {
      expect(getTransferLikeMatch('Grocery Store')).toBeNull();
      expect(getTransferLikeMatch('Target')).toBeNull();
      expect(getTransferLikeMatch('Some Random Label')).toBeNull();
    });

    it('should match bill payment', () => {
      const match = getTransferLikeMatch('Bill Payment');
      expect(match).not.toBeNull();
      expect(match?.key).toBe('bill-payment');
      expect(match?.reason).toBe('Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.');
    });

    it('should match venmo case-insensitively', () => {
      const match = getTransferLikeMatch('venmo money');
      expect(match).not.toBeNull();
      expect(match?.key).toBe('venmo');
    });

    it('should match zelle case-insensitively', () => {
      const match = getTransferLikeMatch('Zelle money');
      expect(match).not.toBeNull();
      expect(match?.key).toBe('zelle');
    });

    it('should match apple cash', () => {
      const match = getTransferLikeMatch('Apple Cash money');
      expect(match).not.toBeNull();
      expect(match?.key).toBe('apple-cash');
    });
  });

  describe('buildHistoricalTransferCandidateId', () => {
    it('should build deterministic ID regardless of argument order', () => {
      const id1 = buildHistoricalTransferCandidateId('A', 'B');
      const id2 = buildHistoricalTransferCandidateId('B', 'A');
      expect(id1).toBe(id2);
      expect(id1).toBe('A::B');
    });
  });

  describe('parseHistoricalTransferCandidateId', () => {
    it('should parse a valid candidate ID', () => {
      const parts = parseHistoricalTransferCandidateId('A::B');
      expect(parts).toEqual(['A', 'B']);
    });

    it('should throw for invalid ID format', () => {
      expect(() => parseHistoricalTransferCandidateId('A')).toThrowError(/Invalid historical transfer candidate ID/);
      expect(() => parseHistoricalTransferCandidateId('A::B::C')).toThrowError(/Invalid historical transfer candidate ID/);
    });
  });

  describe('shiftDateByDays', () => {
    it('should shift date backward', () => {
      expect(shiftDateByDays('2023-10-15', -2)).toBe('2023-10-13');
    });

    it('should shift date forward', () => {
      expect(shiftDateByDays('2023-10-15', 3)).toBe('2023-10-18');
    });

    it('should throw for invalid date string', () => {
      expect(() => shiftDateByDays('invalid', 2)).toThrowError(/Invalid date/);
    });
  });

  describe('toActualDbDate', () => {
    it('should convert YYYY-MM-DD to YYYYMMDD integer', () => {
      expect(toActualDbDate('2023-10-15')).toBe(20231015);
    });
  });

  describe('getDateDiffInDays', () => {
    it('should return correct absolute difference', () => {
      expect(getDateDiffInDays('2023-10-15', '2023-10-18')).toBe(3);
      expect(getDateDiffInDays('2023-10-18', '2023-10-15')).toBe(3);
    });

    it('should throw for invalid dates', () => {
      expect(() => getDateDiffInDays('invalid', '2023-10-18')).toThrowError(/Invalid dates/);
      expect(() => getDateDiffInDays('2023-10-15', 'invalid')).toThrowError(/Invalid dates/);
    });
  });
});
