import { describe, expect, it } from 'vitest';
import {
  buildHistoricalTransferCandidateId,
  HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR,
} from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('buildHistoricalTransferCandidateId', () => {
    it('should join two transaction IDs using the separator in alphabetical order', () => {
      const id1 = 'a-transaction';
      const id2 = 'b-transaction';

      const result = buildHistoricalTransferCandidateId(id1, id2);

      expect(result).toBe(`a-transaction${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}b-transaction`);
    });

    it('should result in the same candidate ID regardless of parameter order', () => {
      const id1 = 'z-transaction';
      const id2 = 'a-transaction';

      const result1 = buildHistoricalTransferCandidateId(id1, id2);
      const result2 = buildHistoricalTransferCandidateId(id2, id1);

      expect(result1).toBe(`a-transaction${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}z-transaction`);
      expect(result1).toBe(result2);
    });

    it('should handle identical transaction IDs', () => {
      const id = 'same-transaction';

      const result = buildHistoricalTransferCandidateId(id, id);

      expect(result).toBe(
        `same-transaction${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}same-transaction`,
      );
    });

    it('should handle numeric-looking strings correctly (lexicographical sorting)', () => {
      // "10" comes before "2" lexicographically
      const id1 = '10-transaction';
      const id2 = '2-transaction';

      const result = buildHistoricalTransferCandidateId(id1, id2);

      expect(result).toBe(`10-transaction${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}2-transaction`);
    });

    it('should handle UUIDs correctly', () => {
      const id1 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const id2 = '550e8400-e29b-41d4-a716-446655440000';

      const result = buildHistoricalTransferCandidateId(id1, id2);

      expect(result).toBe(
        `550e8400-e29b-41d4-a716-446655440000${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}f47ac10b-58cc-4372-a567-0e02b2c3d479`,
      );
    });

    it('should handle empty strings', () => {
      const id1 = '';
      const id2 = 'some-transaction';

      const result = buildHistoricalTransferCandidateId(id1, id2);

      expect(result).toBe(`${HISTORICAL_TRANSFER_CANDIDATE_SEPARATOR}some-transaction`);
    });
  });
});
