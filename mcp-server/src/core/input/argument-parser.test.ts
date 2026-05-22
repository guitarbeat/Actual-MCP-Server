import { describe, expect, it } from 'vitest';
import { parseAccountFilter, parseCategoryFilter, parseDateRange } from './argument-parser.js';

describe('argument-parser', () => {
  describe('parseDateRange', () => {
    it('returns empty object when no dates provided', () => {
      expect(parseDateRange()).toEqual({});
    });

    it('parses valid start date', () => {
      expect(parseDateRange('2023-01-01')).toEqual({ startDate: '2023-01-01' });
    });

    it('parses valid end date', () => {
      expect(parseDateRange(undefined, '2023-12-31')).toEqual({ endDate: '2023-12-31' });
    });

    it('parses valid date range', () => {
      expect(parseDateRange('2023-01-01', '2023-12-31')).toEqual({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });

    it('throws when start date is invalid format', () => {
      expect(() => parseDateRange('2023/01/01')).toThrow('startDate must be a valid date');
    });

    it('throws when end date is invalid format', () => {
      expect(() => parseDateRange(undefined, 'invalid')).toThrow('endDate must be a valid date');
    });

    it('throws when start date is after end date', () => {
      expect(() => parseDateRange('2023-12-31', '2023-01-01')).toThrow(
        'startDate cannot be after endDate',
      );
    });
  });

  describe('parseAccountFilter', () => {
    it('returns empty object when no account id provided', () => {
      expect(parseAccountFilter()).toEqual({});
    });

    it('parses valid account id', () => {
      expect(parseAccountFilter('123')).toEqual({ accountId: '123' });
    });

    it('throws when account id is empty', () => {
      expect(() => parseAccountFilter('')).toThrow('accountId must be a non-empty string');
    });

    it('throws when account id is just whitespace', () => {
      expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
    });
  });

  describe('parseCategoryFilter', () => {
    it('returns empty object when no filter provided', () => {
      expect(parseCategoryFilter()).toEqual({});
    });

    it('parses valid category id', () => {
      expect(parseCategoryFilter('cat-1')).toEqual({ categoryId: 'cat-1' });
    });

    it('parses valid category name', () => {
      expect(parseCategoryFilter(undefined, 'Food')).toEqual({ categoryName: 'Food' });
    });

    it('throws when both categoryId and categoryName are provided', () => {
      expect(() => parseCategoryFilter('cat-1', 'Food')).toThrow(
        'Cannot specify both categoryId and categoryName',
      );
    });

    it('throws when category id is empty string', () => {
      expect(() => parseCategoryFilter('')).toThrow('categoryId must be a non-empty string');
    });

    it('throws when category id is whitespace', () => {
      expect(() => parseCategoryFilter('  ')).toThrow('categoryId must be a non-empty string');
    });

    it('throws when category name is empty string', () => {
      expect(() => parseCategoryFilter(undefined, '')).toThrow(
        'categoryName must be a non-empty string',
      );
    });

    it('throws when category name is whitespace', () => {
      expect(() => parseCategoryFilter(undefined, '  ')).toThrow(
        'categoryName must be a non-empty string',
      );
    });
  });
});
