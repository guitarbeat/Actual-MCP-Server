import { describe, expect, it } from 'vitest';
import { parseCategoryFilter, parseDateRange, parseAccountFilter } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns empty object if no dates are specified', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('returns valid startDate', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('returns valid endDate', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('returns both valid dates', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws error if startDate is invalid format', () => {
      expect(() => parseDateRange('invalid')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error if endDate is invalid format', () => {
      expect(() => parseDateRange(undefined, 'invalid')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error if startDate is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseDateRange(123)).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error if endDate is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseDateRange(undefined, 123)).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error if startDate is after endDate', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow(
        'startDate cannot be after endDate',
      );
    });
  });

  describe('parseAccountFilter', () => {
    it('returns empty object if accountId is not specified', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('returns accountId if valid string is specified', () => {
      expect(parseAccountFilter('some-id')).toEqual({ accountId: 'some-id' });
    });

    it('throws error if accountId is empty string', () => {
      expect(() => parseAccountFilter(' ')).toThrow('accountId must be a non-empty string');
    });

    it('throws error if accountId is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseAccountFilter(123)).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('throws an error if both categoryId and categoryName are specified', () => {
      expect(() => parseCategoryFilter('some-id', 'some-name')).toThrow(
        'Cannot specify both categoryId and categoryName',
      );
    });

    it('returns empty object if neither is specified', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('returns categoryId if only categoryId is specified', () => {
      expect(parseCategoryFilter('some-id')).toEqual({ categoryId: 'some-id' });
    });

    it('returns categoryName if only categoryName is specified', () => {
      expect(parseCategoryFilter(undefined, 'some-name')).toEqual({ categoryName: 'some-name' });
    });

    it('throws error if categoryId is empty string', () => {
      expect(() => parseCategoryFilter(' ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws error if categoryName is empty string', () => {
      expect(() => parseCategoryFilter(undefined, ' ')).toThrow(
        'categoryName must be a non-empty string',
      );
    });

    it('throws error if categoryId is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseCategoryFilter(123)).toThrow('categoryId must be a non-empty string');
    });

    it('throws error if categoryName is not a string', () => {
      // @ts-expect-error - testing invalid input
      expect(() => parseCategoryFilter(undefined, 123)).toThrow(
        'categoryName must be a non-empty string',
      );
    });
  });
});
