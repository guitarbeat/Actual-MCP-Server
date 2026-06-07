import { describe, expect, it } from 'vitest';
import { getTransferLikeMatch, parseHistoricalTransferCandidateId } from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('parseHistoricalTransferCandidateId', () => {
    it('successfully parses a valid candidate ID', () => {
      expect(parseHistoricalTransferCandidateId('id1::id2')).toEqual(['id1', 'id2']);
    });

    it('throws an error if candidate ID does not have exactly two parts', () => {
      expect(() => parseHistoricalTransferCandidateId('')).toThrowError(
        /Invalid historical transfer candidate ID/
      );
      expect(() => parseHistoricalTransferCandidateId('id1')).toThrowError(
        /Invalid historical transfer candidate ID/
      );
      expect(() => parseHistoricalTransferCandidateId('id1::id2::id3')).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });

    it('ignores empty parts from extra separators', () => {
      // "id1::::id2" splits to ["id1", "", "id2"] which filters to ["id1", "id2"]
      expect(parseHistoricalTransferCandidateId('id1::::id2')).toEqual(['id1', 'id2']);
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
