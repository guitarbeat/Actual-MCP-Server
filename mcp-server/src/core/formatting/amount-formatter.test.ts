import { describe, it, expect } from 'vitest';
import { formatAmount } from './amount-formatter.js';

describe('formatAmount', () => {
  it('should format numbers as USD currency', () => {
    expect(formatAmount(123456)).toBe('$1,234.56');
    expect(formatAmount(100)).toBe('$1.00');
    expect(formatAmount(0)).toBe('$0.00');
    expect(formatAmount(-500)).toBe('-$5.00');
  });

  it('should handle undefined and null', () => {
    expect(formatAmount(undefined)).toBe('N/A');
    expect(formatAmount(null)).toBe('N/A');
  });

  it('should handle large numbers correctly', () => {
    expect(formatAmount(100000000)).toBe('$1,000,000.00');
  });
});
