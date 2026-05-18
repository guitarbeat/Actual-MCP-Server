import { describe, it, expect } from 'vitest';
import { parseDateRange, parseAccountFilter, parseCategoryFilter } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns empty object when no arguments are provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('returns parsed start date', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('returns parsed end date', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('returns parsed start and end dates', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({ startDate: '2023-01-01', endDate: '2023-12-31' });
    });

    describe('error paths', () => {
      it('throws when start date is invalid string format', () => {
        expect(() => parseDateRange('invalid')).toThrow('startDate must be a valid date in YYYY-MM-DD format');
        expect(() => parseDateRange('2023/01/01')).toThrow('startDate must be a valid date in YYYY-MM-DD format');
        expect(() => parseDateRange('01-01-2023')).toThrow('startDate must be a valid date in YYYY-MM-DD format');
      });

      it('throws when start date is not a string', () => {
        // @ts-expect-error Testing invalid types
        expect(() => parseDateRange(123)).toThrow('startDate must be a valid date in YYYY-MM-DD format');
        // @ts-expect-error Testing invalid types
        expect(() => parseDateRange({})).toThrow('startDate must be a valid date in YYYY-MM-DD format');
      });

      it('throws when end date is invalid string format', () => {
        expect(() => parseDateRange(undefined, 'invalid')).toThrow('endDate must be a valid date in YYYY-MM-DD format');
      });

      it('throws when end date is not a string', () => {
        // @ts-expect-error Testing invalid types
        expect(() => parseDateRange(undefined, 123)).toThrow('endDate must be a valid date in YYYY-MM-DD format');
      });

      it('throws when start date is after end date', () => {
        expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow('startDate cannot be after endDate');
      });
    });
  });

  describe('parseAccountFilter', () => {
    it('returns empty object when no arguments are provided', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('returns parsed account ID', () => {
      expect(parseAccountFilter('account-123')).toEqual({ accountId: 'account-123' });
    });

    it('throws when accountId is not a string', () => {
      // @ts-expect-error Testing invalid types
      expect(() => parseAccountFilter(123)).toThrow('accountId must be a non-empty string');
    });

    it('throws when accountId is an empty string', () => {
      expect(() => parseAccountFilter('')).toThrow('accountId must be a non-empty string');
      expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('returns empty object when no arguments are provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('returns parsed category ID', () => {
      expect(parseCategoryFilter('category-123')).toEqual({ categoryId: 'category-123' });
    });

    it('returns parsed category name', () => {
      expect(parseCategoryFilter(undefined, 'Groceries')).toEqual({ categoryName: 'Groceries' });
    });

    it('throws when both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('cat-123', 'Groceries')).toThrow('Cannot specify both categoryId and categoryName');
    });

    it('throws when categoryId is invalid', () => {
      // @ts-expect-error Testing invalid types
      expect(() => parseCategoryFilter(123)).toThrow('categoryId must be a non-empty string');
      expect(() => parseCategoryFilter('')).toThrow('categoryId must be a non-empty string');
      expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws when categoryName is invalid', () => {
      // @ts-expect-error Testing invalid types
      expect(() => parseCategoryFilter(undefined, 123)).toThrow('categoryName must be a non-empty string');
      expect(() => parseCategoryFilter(undefined, '')).toThrow('categoryName must be a non-empty string');
      expect(() => parseCategoryFilter(undefined, '   ')).toThrow('categoryName must be a non-empty string');
    });
  });
});
