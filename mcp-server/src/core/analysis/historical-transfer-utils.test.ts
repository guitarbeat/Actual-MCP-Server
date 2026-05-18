import { describe, expect, it } from 'vitest';
import { shiftDateByDays } from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('shiftDateByDays', () => {
    it('shifts the date forward correctly', () => {
      const result = shiftDateByDays('2023-10-15', 5);
      expect(result).toBe('2023-10-20');
    });

    it('shifts the date backward correctly', () => {
      const result = shiftDateByDays('2023-10-15', -5);
      expect(result).toBe('2023-10-10');
    });

    it('handles month boundaries correctly', () => {
      const result = shiftDateByDays('2023-10-30', 3);
      expect(result).toBe('2023-11-02');
    });

    it('handles year boundaries correctly', () => {
      const result = shiftDateByDays('2023-12-30', 3);
      expect(result).toBe('2024-01-02');
    });

    it('throws an error for a malformed date', () => {
      expect(() => {
        shiftDateByDays('not-a-date', 1);
      }).toThrow('Invalid date "not-a-date" supplied for historical transfer matching.');
    });

    it('throws an error for an empty string', () => {
      expect(() => {
        shiftDateByDays('', 1);
      }).toThrow('Invalid date "" supplied for historical transfer matching.');
    });
  });
});
