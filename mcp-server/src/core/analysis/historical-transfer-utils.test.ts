import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  parseHistoricalTransferCandidateId,
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
    it('parses a valid candidate ID correctly', () => {
      const result = parseHistoricalTransferCandidateId('id1::id2');
      expect(result).toEqual(['id1', 'id2']);
    });

    it('trims whitespace from the parsed parts', () => {
      const result = parseHistoricalTransferCandidateId('  id1  ::  id2  ');
      expect(result).toEqual(['id1', 'id2']);
    });

    it('throws an error if there are fewer than 2 parts', () => {
      expect(() => parseHistoricalTransferCandidateId('id1')).toThrow(
        'Invalid historical transfer candidate ID: "id1". Expected format: "[id1]::[id2]"',
      );
    });

    it('throws an error if there are more than 2 parts', () => {
      expect(() => parseHistoricalTransferCandidateId('id1::id2::id3')).toThrow(
        'Invalid historical transfer candidate ID: "id1::id2::id3". Expected format: "[id1]::[id2]"',
      );
    });

    it('throws an error if separator is missing', () => {
      expect(() => parseHistoricalTransferCandidateId('id1-id2')).toThrow(
        'Invalid historical transfer candidate ID: "id1-id2". Expected format: "[id1]::[id2]"',
      );
    });

    it('throws an error if parts are empty after trimming', () => {
      expect(() => parseHistoricalTransferCandidateId('id1::   ')).toThrow(
        'Invalid historical transfer candidate ID: "id1::   ". Expected format: "[id1]::[id2]"',
      );
    });
  });
});
