import { describe, expect, it } from 'vitest';
import { parseDateRange } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns an empty object when no arguments are provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('parses a valid start date', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('parses a valid end date', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('parses both valid start and end dates', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws when start date is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseDateRange(123)).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws when start date is invalid format', () => {
      expect(() => parseDateRange('01-01-2023')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
      expect(() => parseDateRange('invalid')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
      expect(() => parseDateRange('2023-13-01')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws when end date is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseDateRange(undefined, 123)).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws when end date is invalid format', () => {
      expect(() => parseDateRange(undefined, '01-01-2023')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
      expect(() => parseDateRange(undefined, 'invalid')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
      expect(() => parseDateRange(undefined, '2023-13-01')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws when start date is after end date', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow(
        'startDate cannot be after endDate',
      );
    });
  });
});
