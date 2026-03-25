import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, getDateRange, getDateRangeForMonths } from './date-formatter.js';

describe('date-formatter', () => {
  describe('formatDate', () => {
    it('returns empty string for null or undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('returns original string if string is provided', () => {
      expect(formatDate('2023-01-01')).toBe('2023-01-01');
      expect(formatDate('invalid date')).toBe('invalid date');
    });

    it('formats a Date object to YYYY-MM-DD using UTC components', () => {
      // Create a date that would be different in local time vs UTC if not handled correctly
      // 2023-05-15T00:00:00.000Z
      const date = new Date(Date.UTC(2023, 4, 15));
      expect(formatDate(date)).toBe('2023-05-15');
    });

    it('formats a Date object with single digit month and day correctly', () => {
      const date = new Date(Date.UTC(2023, 0, 5));
      expect(formatDate(date)).toBe('2023-01-05');
    });

    it('handles invalid Date objects by returning NaN-NaN-NaN', () => {
      // Depending on strictness, we check its current behavior
      const invalidDate = new Date('invalid');
      expect(formatDate(invalidDate)).toBe('NaN-NaN-NaN');
    });
  });

  describe('getDateRange', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set system time to 2023-10-15T12:00:00Z
      vi.setSystemTime(new Date(Date.UTC(2023, 9, 15, 12, 0, 0)));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns default range (3 months ago to today) when no arguments provided', () => {
      const range = getDateRange();
      // Today is 2023-10-15. 3 months ago is 2023-07-15
      expect(range.endDate).toBe('2023-10-15');
      expect(range.startDate).toBe('2023-07-15');
    });

    it('uses provided startDate and endDate', () => {
      const range = getDateRange('2023-01-01', '2023-12-31');
      expect(range.startDate).toBe('2023-01-01');
      expect(range.endDate).toBe('2023-12-31');
    });

    it('uses provided startDate and defaults endDate to today', () => {
      const range = getDateRange('2023-01-01');
      expect(range.startDate).toBe('2023-01-01');
      expect(range.endDate).toBe('2023-10-15');
    });

    it('uses provided endDate and defaults startDate to 3 months ago', () => {
      const range = getDateRange(undefined, '2023-12-31');
      expect(range.startDate).toBe('2023-07-15');
      expect(range.endDate).toBe('2023-12-31');
    });
  });

  describe('getDateRangeForMonths', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set system time to 2023-10-15T12:00:00Z
      vi.setSystemTime(new Date(Date.UTC(2023, 9, 15, 12, 0, 0)));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns range for 1 month (current month)', () => {
      const range = getDateRangeForMonths(1);
      // start of current month: 2023-10-01
      // end of current month: 2023-10-31
      expect(range.start).toBe('2023-10-01');
      expect(range.end).toBe('2023-10-31');
    });

    it('returns range for 3 months', () => {
      const range = getDateRangeForMonths(3);
      // current month: Oct
      // 3 months including current: Aug, Sep, Oct
      // start of Aug: 2023-08-01
      // end of Oct: 2023-10-31
      expect(range.start).toBe('2023-08-01');
      expect(range.end).toBe('2023-10-31');
    });

    it('returns range for 12 months', () => {
      const range = getDateRangeForMonths(12);
      // current month: Oct 2023
      // 12 months including current: Nov 2022 to Oct 2023
      expect(range.start).toBe('2022-11-01');
      expect(range.end).toBe('2023-10-31');
    });
  });
});
