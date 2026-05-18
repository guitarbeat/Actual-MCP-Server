import { describe, expect, it } from 'vitest';
import { parseAccountFilter, parseCategoryFilter, parseDateRange } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns empty object when no dates provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('returns object with startDate when only start provided', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('returns object with endDate when only end provided', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('returns object with both dates when both provided', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws error when startDate is not a string', () => {
      expect(() => parseDateRange(123 as unknown as string)).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error when startDate is invalid format', () => {
      expect(() => parseDateRange('invalid-date')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error when endDate is not a string', () => {
      expect(() => parseDateRange('2023-01-01', 123 as unknown as string)).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error when endDate is invalid format', () => {
      expect(() => parseDateRange('2023-01-01', 'invalid-date')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws error when startDate is after endDate', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow(
        'startDate cannot be after endDate',
      );
    });
  });

  describe('parseAccountFilter', () => {
    it('returns empty object when no accountId provided', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('returns object with accountId when valid accountId provided', () => {
      expect(parseAccountFilter('account-123')).toEqual({ accountId: 'account-123' });
    });

    it('throws error when accountId is not a string', () => {
      expect(() => parseAccountFilter(123 as unknown as string)).toThrow(
        'accountId must be a non-empty string',
      );
    });

    it('throws error when accountId is an empty string', () => {
      expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('returns empty object when no filters provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('returns object with categoryId when valid categoryId provided', () => {
      expect(parseCategoryFilter('cat-123')).toEqual({ categoryId: 'cat-123' });
    });

    it('returns object with categoryName when valid categoryName provided', () => {
      expect(parseCategoryFilter(undefined, 'Groceries')).toEqual({
        categoryName: 'Groceries',
      });
    });

    it('throws error when both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('cat-123', 'Groceries')).toThrow(
        'Cannot specify both categoryId and categoryName',
      );
    });

    it('throws error when categoryId is not a string', () => {
      expect(() => parseCategoryFilter(123 as unknown as string)).toThrow(
        'categoryId must be a non-empty string',
      );
    });

    it('throws error when categoryId is an empty string', () => {
      expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws error when categoryName is not a string', () => {
      expect(() => parseCategoryFilter(undefined, 123 as unknown as string)).toThrow(
        'categoryName must be a non-empty string',
      );
    });

    it('throws error when categoryName is an empty string', () => {
      expect(() => parseCategoryFilter(undefined, '   ')).toThrow(
        'categoryName must be a non-empty string',
      );
    });
  });
});
