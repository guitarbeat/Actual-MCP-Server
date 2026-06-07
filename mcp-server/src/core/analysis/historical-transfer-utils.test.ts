import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  buildHistoricalTransferCandidateId,
} from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('buildHistoricalTransferCandidateId', () => {
    it('sorts and joins two transaction IDs with double colons', () => {
      expect(buildHistoricalTransferCandidateId('A', 'B')).toBe('A::B');
      expect(buildHistoricalTransferCandidateId('B', 'A')).toBe('A::B');
    });

    it('works with UUIDs', () => {
      const id1 = '123e4567-e89b-12d3-a456-426614174000';
      const id2 = '987e6543-e21b-34c5-b678-426614174000';
      // '123...' comes before '987...' lexicographically
      expect(buildHistoricalTransferCandidateId(id1, id2)).toBe(`${id1}::${id2}`);
      expect(buildHistoricalTransferCandidateId(id2, id1)).toBe(`${id1}::${id2}`);
    });

    it('handles identical IDs', () => {
      expect(buildHistoricalTransferCandidateId('A', 'A')).toBe('A::A');
    });

    it('handles empty strings', () => {
      expect(buildHistoricalTransferCandidateId('', '')).toBe('::');
      expect(buildHistoricalTransferCandidateId('A', '')).toBe('::A');
      expect(buildHistoricalTransferCandidateId('', 'B')).toBe('::B');
    });
  });

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
});
