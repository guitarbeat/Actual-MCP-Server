import { describe, expect, it } from 'vitest';
import { parseAccountFilter, parseCategoryFilter, parseDateRange } from './argument-parser.js';

describe('parseDateRange', () => {
  it('returns empty object when neither start nor end is provided', () => {
    expect(parseDateRange()).toEqual({});
    expect(parseDateRange(undefined, undefined)).toEqual({});
  });

  it('returns startDate only when only start is provided', () => {
    expect(parseDateRange('2024-01-01')).toEqual({ startDate: '2024-01-01' });
  });

  it('returns endDate only when only end is provided', () => {
    expect(parseDateRange(undefined, '2024-12-31')).toEqual({ endDate: '2024-12-31' });
  });

  it('returns both dates when both are provided', () => {
    expect(parseDateRange('2024-01-01', '2024-12-31')).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });

  it('accepts same date for start and end', () => {
    expect(parseDateRange('2024-06-15', '2024-06-15')).toEqual({
      startDate: '2024-06-15',
      endDate: '2024-06-15',
    });
  });

  it('throws when startDate is an invalid date string', () => {
    expect(() => parseDateRange('not-a-date')).toThrow();
  });

  it('throws when endDate is an invalid date string', () => {
    expect(() => parseDateRange(undefined, 'bad-date')).toThrow();
  });

  it('throws when startDate is after endDate', () => {
    expect(() => parseDateRange('2024-12-31', '2024-01-01')).toThrow(
      'startDate cannot be after endDate',
    );
  });
});

describe('parseAccountFilter', () => {
  it('returns empty object when accountId is undefined', () => {
    expect(parseAccountFilter()).toEqual({});
    expect(parseAccountFilter(undefined)).toEqual({});
  });

  it('returns accountId when a valid string is provided', () => {
    expect(parseAccountFilter('acc-123')).toEqual({ accountId: 'acc-123' });
  });

  it('throws when accountId is an empty string', () => {
    expect(() => parseAccountFilter('')).toThrow();
  });

  it('throws when accountId is a whitespace-only string', () => {
    expect(() => parseAccountFilter('   ')).toThrow();
  });
});

describe('parseCategoryFilter', () => {
  it('returns empty object when neither categoryId nor categoryName is provided', () => {
    expect(parseCategoryFilter()).toEqual({});
    expect(parseCategoryFilter(undefined, undefined)).toEqual({});
  });

  it('returns categoryId when only categoryId is provided', () => {
    expect(parseCategoryFilter('cat-123')).toEqual({ categoryId: 'cat-123' });
  });

  it('returns categoryName when only categoryName is provided', () => {
    expect(parseCategoryFilter(undefined, 'Groceries')).toEqual({ categoryName: 'Groceries' });
  });

  it('throws when both categoryId and categoryName are provided', () => {
    expect(() => parseCategoryFilter('cat-123', 'Groceries')).toThrow(
      'Cannot specify both categoryId and categoryName',
    );
  });

  it('throws when categoryId is an empty string', () => {
    expect(() => parseCategoryFilter('')).toThrow();
  });

  it('throws when categoryName is an empty string', () => {
    expect(() => parseCategoryFilter(undefined, '')).toThrow();
  });

  it('throws when categoryId is whitespace only', () => {
    expect(() => parseCategoryFilter('   ')).toThrow();
  });

  it('throws when categoryName is whitespace only', () => {
    expect(() => parseCategoryFilter(undefined, '   ')).toThrow();
  });
});
