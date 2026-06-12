import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  buildHistoricalTransferCandidateId,
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
    it('returns a joined string with the candidate separator', () => {
      expect(buildHistoricalTransferCandidateId('A', 'B')).toBe('A::B');
    });

    it('sorts the strings before joining to ensure determinism', () => {
      expect(buildHistoricalTransferCandidateId('B', 'A')).toBe('A::B');
    });

    it('works with UUIDs', () => {
      expect(
        buildHistoricalTransferCandidateId(
          'd290f1ee-6c54-4b01-90e6-d701748f0851',
          '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
        ),
      ).toBe('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed::d290f1ee-6c54-4b01-90e6-d701748f0851');
    });
  });
});
