import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toActualDbDate } from './historical-transfer-utils.js';

describe('historical-transfer-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toActualDbDate', () => {
    it('should convert standard YYYY-MM-DD date to YYYYMMDD integer', () => {
      expect(toActualDbDate('2023-10-25')).toBe(20231025);
    });

    it('should convert single-digit month and day correctly', () => {
      expect(toActualDbDate('2024-01-05')).toBe(20240105);
    });

    it('should handle date strings without hyphens', () => {
      expect(toActualDbDate('20231025')).toBe(20231025);
    });

    it('should return NaN for non-numeric date strings', () => {
      expect(toActualDbDate('invalid-date')).toBeNaN();
      expect(toActualDbDate('YYYY-MM-DD')).toBeNaN();
    });

    it('should correctly parse strings with multiple hyphens', () => {
      expect(toActualDbDate('20-23-10-25')).toBe(20231025);
    });
  });
});
