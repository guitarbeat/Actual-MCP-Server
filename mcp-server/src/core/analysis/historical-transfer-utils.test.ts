import { describe, it, expect } from 'vitest';
import {
  HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR,
  buildHistoricalTransferCandidateId,
  parseHistoricalTransferCandidateId,
  shiftDateByDays,
  toActualDbDate,
  getDateDiffInDays,
  getTransferLikeMatch,
} from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('buildHistoricalTransferCandidateId', () => {
    it('should join and alphabetically sort transaction IDs', () => {
      const id1 = 't-abc';
      const id2 = 't-xyz';
      const result = buildHistoricalTransferCandidateId(id2, id1);
      expect(result).toBe(`t-abc${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}t-xyz`);
    });

    it('should handle identical transaction IDs', () => {
      const id1 = 't-abc';
      const id2 = 't-abc';
      const result = buildHistoricalTransferCandidateId(id1, id2);
      expect(result).toBe(`t-abc${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}t-abc`);
    });
  });

  describe('parseHistoricalTransferCandidateId', () => {
    it('should split a valid candidate ID into two parts', () => {
      const candidateId = `t-abc${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}t-xyz`;
      const result = parseHistoricalTransferCandidateId(candidateId);
      expect(result).toEqual(['t-abc', 't-xyz']);
    });

    it('should trim parts during split', () => {
      const candidateId = ` t-abc ${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR} t-xyz `;
      const result = parseHistoricalTransferCandidateId(candidateId);
      expect(result).toEqual(['t-abc', 't-xyz']);
    });

    it('should throw an error for invalid candidate ID with less than two parts', () => {
      const candidateId = 't-abc';
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrowError(
        /Invalid historical transfer candidate ID/,
      );
    });

    it('should throw an error for invalid candidate ID with more than two parts', () => {
      const candidateId = `t-1${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}t-2${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}t-3`;
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrowError(
        /Invalid historical transfer candidate ID/,
      );
    });
  });

  describe('shiftDateByDays', () => {
    it('should shift date forward by positive days', () => {
      const result = shiftDateByDays('2023-10-15', 5);
      expect(result).toBe('2023-10-20');
    });

    it('should shift date backward by negative days', () => {
      const result = shiftDateByDays('2023-10-15', -5);
      expect(result).toBe('2023-10-10');
    });

    it('should handle shifting across months', () => {
      const result = shiftDateByDays('2023-10-30', 2);
      expect(result).toBe('2023-11-01');
    });

    it('should handle shifting across leap years', () => {
      const result = shiftDateByDays('2024-02-28', 1);
      expect(result).toBe('2024-02-29');
    });

    it('should throw an error for invalid date string', () => {
      expect(() => shiftDateByDays('invalid-date', 1)).toThrowError(
        /Invalid date "invalid-date" supplied for historical transfer matching./,
      );
    });
  });

  describe('toActualDbDate', () => {
    it('should convert YYYY-MM-DD to an integer YYYYMMDD', () => {
      const result = toActualDbDate('2023-10-15');
      expect(result).toBe(20231015);
    });
  });

  describe('getDateDiffInDays', () => {
    it('should return positive diff for first date before second date', () => {
      const result = getDateDiffInDays('2023-10-10', '2023-10-15');
      expect(result).toBe(5);
    });

    it('should return positive diff for first date after second date', () => {
      const result = getDateDiffInDays('2023-10-15', '2023-10-10');
      expect(result).toBe(5);
    });

    it('should return 0 for identical dates', () => {
      const result = getDateDiffInDays('2023-10-15', '2023-10-15');
      expect(result).toBe(0);
    });

    it('should return correct diff across months', () => {
      const result = getDateDiffInDays('2023-10-30', '2023-11-01');
      expect(result).toBe(2);
    });

    it('should return correct diff across leap years', () => {
      const result = getDateDiffInDays('2024-02-28', '2024-03-01');
      expect(result).toBe(2); // 2024 is leap year
    });

    it('should throw an error if first date is invalid', () => {
      expect(() => getDateDiffInDays('invalid-date', '2023-10-15')).toThrowError(
        /Invalid dates "invalid-date" and "2023-10-15" supplied for historical transfer matching./,
      );
    });

    it('should throw an error if second date is invalid', () => {
      expect(() => getDateDiffInDays('2023-10-15', 'invalid-date')).toThrowError(
        /Invalid dates "2023-10-15" and "invalid-date" supplied for historical transfer matching./,
      );
    });
  });

  describe('getTransferLikeMatch', () => {
    it('should return null for empty string', () => {
      const result = getTransferLikeMatch('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace string', () => {
      const result = getTransferLikeMatch('   ');
      expect(result).toBeNull();
    });

    it('should return null for non-matching string', () => {
      const result = getTransferLikeMatch('Grocery Store');
      expect(result).toBeNull();
    });

    it('should match pattern ignoring case', () => {
      const result = getTransferLikeMatch('Venmo transaction');
      expect(result).toEqual({
        key: 'venmo',
        reason:
          'Venmo activity often mixes spending with peer transfers, so this cluster still needs manual review.',
      });
    });

    it('should match pattern within word boundaries', () => {
      const result = getTransferLikeMatch('Transfer from savings');
      expect(result).toEqual({
        key: 'transfer',
        reason:
          'Transfer wording suggests an account move, but no strict unique inverse match was found.',
      });
    });

    it('should return null for partial word match if bounded', () => {
      const result = getTransferLikeMatch('Transfering'); // pattern is \btransfer\b
      expect(result).toBeNull();
    });

    it('should match apple cash', () => {
      const result = getTransferLikeMatch('Apple Cash');
      expect(result).toEqual({
        key: 'apple-cash',
        reason:
          'Apple Cash activity often represents transfers between accounts or people, so this cluster still needs manual review.',
      });
    });
  });
});
