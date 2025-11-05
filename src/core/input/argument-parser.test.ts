import { describe, it, expect } from 'vitest';
import { parseDateRange, parseAccountFilter, parseCategoryFilter } from './argument-parser.js';

describe('parseDateRange', () => {
  it('should parse valid date range', () => {
    const result = parseDateRange('2024-01-01', '2024-12-31');
    expect(result).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });

  it('should handle optional start date', () => {
    const result = parseDateRange(undefined, '2024-12-31');
    expect(result).toEqual({
      endDate: '2024-12-31',
    });
  });

  it('should handle optional end date', () => {
    const result = parseDateRange('2024-01-01', undefined);
    expect(result).toEqual({
      startDate: '2024-01-01',
    });
  });

  it('should handle both dates undefined', () => {
    const result = parseDateRange(undefined, undefined);
    expect(result).toEqual({});
  });

  it('should throw error for invalid start date', () => {
    expect(() => parseDateRange('invalid-date', '2024-12-31')).toThrow(
      'startDate must be a valid date in YYYY-MM-DD format'
    );
  });

  it('should throw error for invalid end date', () => {
    expect(() => parseDateRange('2024-01-01', 'invalid-date')).toThrow(
      'endDate must be a valid date in YYYY-MM-DD format'
    );
  });

  it('should throw error when start date is after end date', () => {
    expect(() => parseDateRange('2024-12-31', '2024-01-01')).toThrow('startDate cannot be after endDate');
  });
});

describe('parseAccountFilter', () => {
  it('should parse valid account ID', () => {
    const result = parseAccountFilter('account-123');
    expect(result).toEqual({
      accountId: 'account-123',
    });
  });

  it('should handle undefined account ID', () => {
    const result = parseAccountFilter(undefined);
    expect(result).toEqual({});
  });

  it('should throw error for empty string', () => {
    expect(() => parseAccountFilter('')).toThrow('accountId must be a non-empty string');
    expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
  });
});

describe('parseCategoryFilter', () => {
  it('should parse category ID', () => {
    const result = parseCategoryFilter('category-123', undefined);
    expect(result).toEqual({
      categoryId: 'category-123',
    });
  });

  it('should parse category name', () => {
    const result = parseCategoryFilter(undefined, 'Groceries');
    expect(result).toEqual({
      categoryName: 'Groceries',
    });
  });

  it('should handle both undefined', () => {
    const result = parseCategoryFilter(undefined, undefined);
    expect(result).toEqual({});
  });

  it('should throw error when both are provided', () => {
    expect(() => parseCategoryFilter('category-123', 'Groceries')).toThrow(
      'Cannot specify both categoryId and categoryName'
    );
  });

  it('should throw error for empty category ID', () => {
    expect(() => parseCategoryFilter('', undefined)).toThrow('categoryId must be a non-empty string');
  });

  it('should throw error for empty category name', () => {
    expect(() => parseCategoryFilter(undefined, '')).toThrow('categoryName must be a non-empty string');
  });
});
