import { describe, expect, it, vi } from 'vitest';
import { parseDateRange, parseAccountFilter, parseCategoryFilter } from './argument-parser.js';

vi.mock('./validators.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./validators.js')>();
  return {
    ...actual,
    // We'll use the real validateDate for integration, or we can just mock it.
    // Actually, let's just use the real one since validateDate is pure.
  };
});

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns an empty object when no arguments are provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('returns startDate when a valid start date is provided', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('returns endDate when a valid end date is provided', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('returns both dates when valid start and end dates are provided', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws an error if startDate is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => parseDateRange(123)).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws an error if startDate is an invalid date string', () => {
      expect(() => parseDateRange('invalid-date')).toThrow(
        'startDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws an error if endDate is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => parseDateRange(undefined, 123)).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws an error if endDate is an invalid date string', () => {
      expect(() => parseDateRange(undefined, 'invalid-date')).toThrow(
        'endDate must be a valid date in YYYY-MM-DD format',
      );
    });

    it('throws an error if startDate is after endDate', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow(
        'startDate cannot be after endDate',
      );
    });
  });

  describe('parseAccountFilter', () => {
    it('returns an empty object when no accountId is provided', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('returns accountId when a valid string is provided', () => {
      expect(parseAccountFilter('account-123')).toEqual({ accountId: 'account-123' });
    });

    it('throws an error if accountId is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => parseAccountFilter(123)).toThrow('accountId must be a non-empty string');
    });

    it('throws an error if accountId is an empty string', () => {
      expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('returns an empty object when no arguments are provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('returns categoryId when a valid categoryId is provided', () => {
      expect(parseCategoryFilter('cat-123')).toEqual({ categoryId: 'cat-123' });
    });

    it('returns categoryName when a valid categoryName is provided', () => {
      expect(parseCategoryFilter(undefined, 'Groceries')).toEqual({ categoryName: 'Groceries' });
    });

    it('throws an error if both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('cat-123', 'Groceries')).toThrow(
        'Cannot specify both categoryId and categoryName',
      );
    });

    it('throws an error if categoryId is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => parseCategoryFilter(123)).toThrow('categoryId must be a non-empty string');
    });

    it('throws an error if categoryId is an empty string', () => {
      expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws an error if categoryName is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => parseCategoryFilter(undefined, 123)).toThrow(
        'categoryName must be a non-empty string',
      );
    });

    it('throws an error if categoryName is an empty string', () => {
      expect(() => parseCategoryFilter(undefined, '   ')).toThrow(
        'categoryName must be a non-empty string',
      );
    });
  });
});
