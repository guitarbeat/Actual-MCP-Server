import { describe, expect, it } from 'vitest';
import {
  getTransferLikeMatch,
  parseHistoricalTransferCandidateId,
  HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR,
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
    it('successfully parses a valid candidate ID', () => {
      const id1 = 'uuid-1';
      const id2 = 'uuid-2';
      const candidateId = `${id1}${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}${id2}`;
      expect(parseHistoricalTransferCandidateId(candidateId)).toEqual([id1, id2]);
    });

    it('trims whitespace from parts', () => {
      const id1 = ' uuid-1 ';
      const id2 = '  uuid-2  ';
      const candidateId = `${id1}${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}${id2}`;
      expect(parseHistoricalTransferCandidateId(candidateId)).toEqual(['uuid-1', 'uuid-2']);
    });

    it('throws an error for an empty string', () => {
      expect(() => parseHistoricalTransferCandidateId('')).toThrow(
        `Invalid historical transfer candidate ID: "". Expected format: "[id1]${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}[id2]"`,
      );
    });

    it('throws an error when there is only one part', () => {
      expect(() => parseHistoricalTransferCandidateId('uuid-1')).toThrow(
        `Invalid historical transfer candidate ID: "uuid-1". Expected format: "[id1]${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}[id2]"`,
      );
    });

    it('throws an error when there are more than two parts', () => {
      const candidateId = `uuid-1${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}uuid-2${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}uuid-3`;
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrow(
        `Invalid historical transfer candidate ID: "${candidateId}". Expected format: "[id1]${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}[id2]"`,
      );
    });

    it('throws an error when parts are empty after trimming', () => {
      const candidateId = `  ${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}  `;
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrow(
        `Invalid historical transfer candidate ID: "${candidateId}". Expected format: "[id1]${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}[id2]"`,
      );
    });
  });
});
