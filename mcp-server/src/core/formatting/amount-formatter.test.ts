import { describe, expect, it } from 'vitest';
import { formatAmount } from './amount-formatter.js';

describe('formatAmount', () => {
  it('should return "N/A" when amount is null', () => {
    expect(formatAmount(null)).toBe('N/A');
  });

  it('should return "N/A" when amount is undefined', () => {
    expect(formatAmount(undefined)).toBe('N/A');
  });

  it('should correctly format positive amounts in cents', () => {
    expect(formatAmount(100)).toBe('$1.00');
    expect(formatAmount(1000)).toBe('$10.00');
    expect(formatAmount(123456)).toBe('$1,234.56');
  });

  it('should correctly format negative amounts in cents', () => {
    expect(formatAmount(-100)).toBe('-$1.00');
    expect(formatAmount(-1000)).toBe('-$10.00');
    expect(formatAmount(-123456)).toBe('-$1,234.56');
  });

  it('should correctly format zero', () => {
    expect(formatAmount(0)).toBe('$0.00');
    // `Intl.NumberFormat` format of `-0` depends on the environment and standard implementation.
    // In Node it formats `-0` as `-$0.00`. We can test that it doesn't fail.
    expect(formatAmount(-0)).toBe('-$0.00');
  });

  it('should correctly format large numbers', () => {
    expect(formatAmount(100000000)).toBe('$1,000,000.00');
  });
});
