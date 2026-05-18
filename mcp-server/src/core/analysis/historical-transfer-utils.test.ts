import { describe, it, expect } from 'vitest';
import { getDateDiffInDays, shiftDateByDays } from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  describe('getDateDiffInDays', () => {
    it('throws an error for invalid firstDate', () => {
      expect(() => getDateDiffInDays('invalid-date', '2023-01-05')).toThrowError(
        'Invalid dates "invalid-date" and "2023-01-05" supplied for historical transfer matching.'
      );
    });

    it('throws an error for invalid secondDate', () => {
      expect(() => getDateDiffInDays('2023-01-01', 'not-a-date')).toThrowError(
        'Invalid dates "2023-01-01" and "not-a-date" supplied for historical transfer matching.'
      );
    });

    it('throws an error if both dates are invalid', () => {
      expect(() => getDateDiffInDays('foo', 'bar')).toThrowError(
        'Invalid dates "foo" and "bar" supplied for historical transfer matching.'
      );
    });

    it('calculates difference correctly for valid dates', () => {
      expect(getDateDiffInDays('2023-01-01', '2023-01-05')).toBe(4);
      expect(getDateDiffInDays('2023-01-05', '2023-01-01')).toBe(4);
      expect(getDateDiffInDays('2023-01-01', '2023-01-01')).toBe(0);
    });
  });

  describe('shiftDateByDays', () => {
    it('throws an error for invalid date', () => {
      expect(() => shiftDateByDays('invalid-date', 5)).toThrowError(
        'Invalid date "invalid-date" supplied for historical transfer matching.'
      );
    });

    it('shifts dates correctly', () => {
      expect(shiftDateByDays('2023-01-01', 5)).toBe('2023-01-06');
    });
  });
});
