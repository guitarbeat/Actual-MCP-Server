import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, getDateRange, getDateRangeForMonths } from './date-formatter.js';

describe('Date Formatter', () => {
  beforeEach(() => {
    // Mock system time to a specific date: 2024-05-15T12:00:00Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('should return empty string for null or undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should return the string itself if passed a string', () => {
      expect(formatDate('2023-01-01')).toBe('2023-01-01');
    });

    it('should format a Date object as YYYY-MM-DD', () => {
      const date = new Date('2024-05-15T12:00:00Z');
      expect(formatDate(date)).toBe('2024-05-15');
    });

    it('should handle single-digit months and days correctly', () => {
      const date = new Date('2024-01-05T12:00:00Z');
      expect(formatDate(date)).toBe('2024-01-05');
    });
  });

  describe('getDateRange', () => {
    it('should use provided startDate and endDate', () => {
      const result = getDateRange('2024-01-01', '2024-01-31');
      expect(result).toEqual({ startDate: '2024-01-01', endDate: '2024-01-31' });
    });

    it('should default endDate to today if not provided', () => {
      const result = getDateRange('2024-01-01');
      expect(result).toEqual({ startDate: '2024-01-01', endDate: '2024-05-15' });
    });

    it('should default startDate to 3 months ago if not provided', () => {
      // 3 months prior to 2024-05-15 is 2024-02-15
      const result = getDateRange(undefined, '2024-06-01');
      expect(result).toEqual({ startDate: '2024-02-15', endDate: '2024-06-01' });
    });

    it('should default both to 3 months ago and today if neither provided', () => {
      const result = getDateRange();
      expect(result).toEqual({ startDate: '2024-02-15', endDate: '2024-05-15' });
    });
  });

  describe('getDateRangeForMonths', () => {
    it('should return correct range for 1 month', () => {
      // Current month: May 2024
      // 1 month means start of May to end of May
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({ start: '2024-05-01', end: '2024-05-31' });
    });

    it('should return correct range for 3 months', () => {
      // 3 months means start of March to end of May
      const result = getDateRangeForMonths(3);
      expect(result).toEqual({ start: '2024-03-01', end: '2024-05-31' });
    });

    it('should return correct range across years', () => {
      // 6 months from May 2024 means start of December 2023 to end of May 2024
      const result = getDateRangeForMonths(6);
      expect(result).toEqual({ start: '2023-12-01', end: '2024-05-31' });
    });
  });
});
