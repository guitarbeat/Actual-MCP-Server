import { describe, it, expect } from 'vitest';
import { formatAmount } from './amount-formatter.js';
import * as utils from '../../utils.js';

describe('amount-formatter', () => {
  describe('formatAmount', () => {
    it('should format positive amounts correctly', () => {
      const result = formatAmount(12345);
      expect(result).toBe('$123.45');
    });

    it('should format negative amounts correctly', () => {
      const result = formatAmount(-12345);
      expect(result).toBe('-$123.45');
    });

    it('should format zero correctly', () => {
      const result = formatAmount(0);
      expect(result).toBe('$0.00');
    });

    it('should return N/A for undefined', () => {
      const result = formatAmount(undefined);
      expect(result).toBe('N/A');
    });

    it('should return N/A for null', () => {
      const result = formatAmount(null);
      expect(result).toBe('N/A');
    });

    it('should handle large amounts correctly', () => {
      const result = formatAmount(123456789);
      expect(result).toBe('$1,234,567.89');
    });

    it('should handle small amounts correctly', () => {
      const result = formatAmount(1);
      expect(result).toBe('$0.01');
    });

    it('should handle amounts with no decimal places', () => {
      const result = formatAmount(10000);
      expect(result).toBe('$100.00');
    });

    it('should handle amounts requiring rounding', () => {
      // Note: amounts are in cents, so this shouldn't happen in practice
      // but testing the formatter behavior
      const result = formatAmount(12345);
      expect(result).toBe('$123.45');
    });

    it('should format negative large amounts correctly', () => {
      const result = formatAmount(-987654321);
      expect(result).toBe('-$9,876,543.21');
    });

    it('should handle fractional cents correctly', () => {
      // Edge case: if somehow a fractional cent value is passed
      const result = formatAmount(12345.67);
      expect(result).toBe('$123.46'); // Should round
    });

    it('should format typical transaction amounts', () => {
      // $50.00
      expect(formatAmount(5000)).toBe('$50.00');

      // $1,234.56
      expect(formatAmount(123456)).toBe('$1,234.56');

      // $0.99
      expect(formatAmount(99)).toBe('$0.99');
    });
  });

  describe('backward compatibility through utils.ts', () => {
    it('should export formatAmount from utils.ts', () => {
      expect(utils.formatAmount).toBeDefined();
      expect(utils.formatAmount(12345)).toBe('$123.45');
      expect(utils.formatAmount(null)).toBe('N/A');
    });
  });
});
