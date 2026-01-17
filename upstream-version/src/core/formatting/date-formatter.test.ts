import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as utils from '../../utils.js';
import { formatDate, getDateRange, getDateRangeForMonths } from './date-formatter.js';

describe('date-formatter', () => {
  describe('formatDate', () => {
    it('should format Date object as YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-03-15');
    });

    it('should return string date unchanged', () => {
      const dateString = '2024-03-15';
      const result = formatDate(dateString);
      expect(result).toBe('2024-03-15');
    });

    it('should return empty string for null', () => {
      const result = formatDate(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = formatDate(undefined);
      expect(result).toBe('');
    });

    it('should handle edge case dates correctly', () => {
      // Leap year date
      const leapYear = new Date('2024-02-29T00:00:00Z');
      expect(formatDate(leapYear)).toBe('2024-02-29');

      // Year boundary
      const yearEnd = new Date('2023-12-31T23:59:59Z');
      expect(formatDate(yearEnd)).toBe('2023-12-31');

      // Year start
      const yearStart = new Date('2024-01-01T00:00:00Z');
      expect(formatDate(yearStart)).toBe('2024-01-01');
    });

    it('should handle dates with time components', () => {
      const dateWithTime = new Date('2024-06-15T14:30:45.123Z');
      const result = formatDate(dateWithTime);
      expect(result).toBe('2024-06-15');
    });
  });

  describe('getDateRange', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock current date to 2024-06-15
      mockDate = new Date('2024-06-15T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return provided start and end dates', () => {
      const result = getDateRange('2024-01-01', '2024-12-31');
      expect(result).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });

    it('should default to 3 months ago when no start date provided', () => {
      const result = getDateRange(undefined, '2024-06-15');
      expect(result.startDate).toBe('2024-03-15');
      expect(result.endDate).toBe('2024-06-15');
    });

    it('should default to today when no end date provided', () => {
      const result = getDateRange('2024-01-01', undefined);
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-06-15');
    });

    it('should default both dates when neither provided', () => {
      const result = getDateRange();
      expect(result.startDate).toBe('2024-03-15');
      expect(result.endDate).toBe('2024-06-15');
    });

    it('should handle month boundary correctly', () => {
      // Set date to end of month
      vi.setSystemTime(new Date('2024-03-31T12:00:00Z'));
      const result = getDateRange();
      expect(result.startDate).toBe('2023-12-31');
      expect(result.endDate).toBe('2024-03-31');
    });

    it('should handle year boundary correctly', () => {
      // Set date to January
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      const result = getDateRange();
      expect(result.startDate).toBe('2023-10-15');
      expect(result.endDate).toBe('2024-01-15');
    });
  });

  describe('getDateRangeForMonths', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock current date to 2024-06-15
      mockDate = new Date('2024-06-15T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return date range for 1 month', () => {
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({
        start: '2024-06-01',
        end: '2024-06-30',
      });
    });

    it('should return date range for 3 months', () => {
      const result = getDateRangeForMonths(3);
      expect(result).toEqual({
        start: '2024-04-01',
        end: '2024-06-30',
      });
    });

    it('should return date range for 6 months', () => {
      const result = getDateRangeForMonths(6);
      expect(result).toEqual({
        start: '2024-01-01',
        end: '2024-06-30',
      });
    });

    it('should return date range for 12 months', () => {
      const result = getDateRangeForMonths(12);
      expect(result).toEqual({
        start: '2023-07-01',
        end: '2024-06-30',
      });
    });

    it('should handle year boundary correctly', () => {
      // Set date to January
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      const result = getDateRangeForMonths(3);
      expect(result).toEqual({
        start: '2023-11-01',
        end: '2024-01-31',
      });
    });

    it('should handle February correctly', () => {
      // Set date to February in non-leap year
      vi.setSystemTime(new Date('2023-02-15T12:00:00Z'));
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({
        start: '2023-02-01',
        end: '2023-02-28',
      });
    });

    it('should handle February in leap year correctly', () => {
      // Set date to February in leap year
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({
        start: '2024-02-01',
        end: '2024-02-29',
      });
    });

    it('should handle months with 31 days correctly', () => {
      // Set date to March (31 days)
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({
        start: '2024-03-01',
        end: '2024-03-31',
      });
    });

    it('should handle months with 30 days correctly', () => {
      // Set date to April (30 days)
      vi.setSystemTime(new Date('2024-04-15T12:00:00Z'));
      const result = getDateRangeForMonths(1);
      expect(result).toEqual({
        start: '2024-04-01',
        end: '2024-04-30',
      });
    });
  });

  describe('backward compatibility through utils.ts', () => {
    it('should export formatDate from utils.ts', () => {
      expect(utils.formatDate).toBeDefined();
      const date = new Date('2024-03-15T10:30:00Z');
      expect(utils.formatDate(date)).toBe('2024-03-15');
    });

    it('should export getDateRange from utils.ts', () => {
      expect(utils.getDateRange).toBeDefined();
      const result = utils.getDateRange('2024-01-01', '2024-12-31');
      expect(result).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });

    it('should export getDateRangeForMonths from utils.ts', () => {
      expect(utils.getDateRangeForMonths).toBeDefined();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      const result = utils.getDateRangeForMonths(3);
      expect(result).toEqual({
        start: '2024-04-01',
        end: '2024-06-30',
      });
      vi.useRealTimers();
    });
  });
});
