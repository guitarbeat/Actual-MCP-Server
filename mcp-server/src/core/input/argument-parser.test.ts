import { describe, expect, it } from 'vitest';
import { parseAccountFilter, parseCategoryFilter, parseDateRange } from './argument-parser.js';

describe('parseDateRange', () => {
  it('returns empty object when no arguments provided', () => {
    expect(parseDateRange()).toEqual({});
  });

  it('returns only startDate when only start provided', () => {
    expect(parseDateRange('2024-01-01')).toEqual({ startDate: '2024-01-01' });
  });

  it('returns only endDate when only end provided', () => {
    expect(parseDateRange(undefined, '2024-12-31')).toEqual({ endDate: '2024-12-31' });
  });

  it('returns both dates when both are valid', () => {
    expect(parseDateRange('2024-01-01', '2024-12-31')).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });

  it('accepts same start and end date', () => {
    expect(parseDateRange('2024-06-15', '2024-06-15')).toEqual({
      startDate: '2024-06-15',
      endDate: '2024-06-15',
    });
  });

  it('throws when startDate is an invalid date string', () => {
    expect(() => parseDateRange('not-a-date')).toThrow(
      'startDate must be a valid date in YYYY-MM-DD format',
    );
  });

  it('throws when endDate is an invalid date string', () => {
    expect(() => parseDateRange(undefined, 'not-a-date')).toThrow(
      'endDate must be a valid date in YYYY-MM-DD format',
    );
  });

  it('throws when startDate is after endDate', () => {
    expect(() => parseDateRange('2024-12-31', '2024-01-01')).toThrow(
      'startDate cannot be after endDate',
    );
  });

  it('throws when startDate is in wrong format (MM-DD-YYYY)', () => {
    expect(() => parseDateRange('01-01-2024')).toThrow(
      'startDate must be a valid date in YYYY-MM-DD format',
    );
  });
});

describe('parseAccountFilter', () => {
  it('returns empty object when no accountId provided', () => {
    expect(parseAccountFilter()).toEqual({});
  });

  it('returns accountId when valid string provided', () => {
    expect(parseAccountFilter('acc-123')).toEqual({ accountId: 'acc-123' });
  });

  it('throws when accountId is an empty string', () => {
    expect(() => parseAccountFilter('')).toThrow('accountId must be a non-empty string');
  });

  it('throws when accountId is a whitespace-only string', () => {
    expect(() => parseAccountFilter('   ')).toThrow('accountId must be a non-empty string');
  });
});

describe('parseCategoryFilter', () => {
  it('returns empty object when no arguments provided', () => {
    expect(parseCategoryFilter()).toEqual({});
  });

  it('returns categoryId when only categoryId provided', () => {
    expect(parseCategoryFilter('cat-123')).toEqual({ categoryId: 'cat-123' });
  });

  it('returns categoryName when only categoryName provided', () => {
    expect(parseCategoryFilter(undefined, 'Groceries')).toEqual({ categoryName: 'Groceries' });
  });

  it('throws when both categoryId and categoryName are provided', () => {
    expect(() => parseCategoryFilter('cat-123', 'Groceries')).toThrow(
      'Cannot specify both categoryId and categoryName',
    );
  });

  it('throws when categoryId is an empty string', () => {
    expect(() => parseCategoryFilter('')).toThrow('categoryId must be a non-empty string');
  });

  it('throws when categoryId is whitespace only', () => {
    expect(() => parseCategoryFilter('   ')).toThrow('categoryId must be a non-empty string');
  });

  it('throws when categoryName is an empty string', () => {
    expect(() => parseCategoryFilter(undefined, '')).toThrow(
      'categoryName must be a non-empty string',
    );
  });

  it('throws when categoryName is whitespace only', () => {
    expect(() => parseCategoryFilter(undefined, '  ')).toThrow(
      'categoryName must be a non-empty string',
    );
  });
});
