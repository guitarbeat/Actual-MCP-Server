import { describe, expect, it } from 'vitest';
import {
  parseDateRange,
  parseAccountFilter,
  parseCategoryFilter,
} from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns empty object when no dates are provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('returns parsed start date', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('returns parsed end date', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('returns both parsed dates', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws error for invalid start date format', () => {
      expect(() => parseDateRange('01-01-2023')).toThrow('startDate must be a valid date in YYYY-MM-DD format');
      expect(() => parseDateRange(123 as unknown as string)).toThrow('startDate must be a valid date in YYYY-MM-DD format');
    });

    it('throws error for invalid end date format', () => {
      expect(() => parseDateRange(undefined, '12-31-2023')).toThrow('endDate must be a valid date in YYYY-MM-DD format');
      expect(() => parseDateRange(undefined, 123 as unknown as string)).toThrow('endDate must be a valid date in YYYY-MM-DD format');
    });

    it('throws error if start date is after end date', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow('startDate cannot be after endDate');
    });
  });

  describe('parseAccountFilter', () => {
    it('returns empty object when no accountId is provided', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('returns parsed account filter', () => {
      expect(parseAccountFilter('test-account-id')).toEqual({ accountId: 'test-account-id' });
    });

    it('throws error if accountId is empty string', () => {
      expect(() => parseAccountFilter('')).toThrow('accountId must be a non-empty string');
      expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
    });

    it('throws error if accountId is not a string', () => {
      expect(() => parseAccountFilter(123 as unknown as string)).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('returns empty object when neither categoryId nor categoryName is provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('returns parsed filter with categoryId', () => {
      expect(parseCategoryFilter('test-category-id')).toEqual({ categoryId: 'test-category-id' });
    });

    it('returns parsed filter with categoryName', () => {
      expect(parseCategoryFilter(undefined, 'Food')).toEqual({ categoryName: 'Food' });
    });

    it('throws error if both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('test-category-id', 'Food')).toThrow('Cannot specify both categoryId and categoryName');
    });

    it('throws error if categoryId is empty string', () => {
      expect(() => parseCategoryFilter('')).toThrow('categoryId must be a non-empty string');
      expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws error if categoryId is not a string', () => {
      expect(() => parseCategoryFilter(123 as unknown as string)).toThrow('categoryId must be a non-empty string');
    });

    it('throws error if categoryName is empty string', () => {
      expect(() => parseCategoryFilter(undefined, '')).toThrow('categoryName must be a non-empty string');
      expect(() => parseCategoryFilter(undefined, '   ')).toThrow('categoryName must be a non-empty string');
    });

    it('throws error if categoryName is not a string', () => {
      expect(() => parseCategoryFilter(undefined, 123 as unknown as string)).toThrow('categoryName must be a non-empty string');
    });
  });
});
