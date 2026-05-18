import { describe, expect, it } from 'vitest';
import {
  parseHistoricalTransferCandidateId,
  HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR,
} from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('parseHistoricalTransferCandidateId', () => {
    it('successfully parses a valid candidate ID with two parts', () => {
      const id1 = 'uuid-1';
      const id2 = 'uuid-2';
      const candidateId = `${id1}${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}${id2}`;

      const result = parseHistoricalTransferCandidateId(candidateId);

      expect(result).toEqual([id1, id2]);
    });

    it('successfully parses and trims parts of a valid candidate ID', () => {
      const id1 = '  uuid-1  ';
      const id2 = '  uuid-2  ';
      const candidateId = `${id1}${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}${id2}`;

      const result = parseHistoricalTransferCandidateId(candidateId);

      expect(result).toEqual(['uuid-1', 'uuid-2']);
    });

    it('throws an error if candidate ID is empty', () => {
      expect(() => parseHistoricalTransferCandidateId('')).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });

    it('throws an error if candidate ID has only one part', () => {
      const candidateId = 'uuid-1';
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });

    it('throws an error if candidate ID contains only the separator', () => {
      expect(() => parseHistoricalTransferCandidateId(HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR)).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });

    it('throws an error if candidate ID has more than two parts', () => {
      const candidateId = `uuid-1${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}uuid-2${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}uuid-3`;
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });

    it('throws an error if candidate ID has empty parts', () => {
      const candidateId = `uuid-1${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}  `;
      expect(() => parseHistoricalTransferCandidateId(candidateId)).toThrowError(
        /Invalid historical transfer candidate ID/
      );
    });
  });
});
