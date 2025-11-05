import { describe, it, expect } from 'vitest';
import {
  validateUUID,
  validateDate,
  validateAmount,
  validateMonth,
  assertUuid,
  assertMonth,
  assertPositiveIntegerCents,
} from './validators.js';

describe('validateUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
    expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
    expect(validateUUID('')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(validateUUID(' 550e8400-e29b-41d4-a716-446655440000 ')).toBe(true);
  });
});

describe('validateDate', () => {
  it('should return true for valid dates', () => {
    expect(validateDate('2024-01-15')).toBe(true);
    expect(validateDate('2024-12-31')).toBe(true);
    expect(validateDate('2024-02-29')).toBe(true); // Leap year
  });

  it('should return false for invalid dates', () => {
    expect(validateDate('2024-13-01')).toBe(false); // Invalid month
    expect(validateDate('2024-02-30')).toBe(false); // Invalid day
    expect(validateDate('2023-02-29')).toBe(false); // Not a leap year
    expect(validateDate('not-a-date')).toBe(false);
    expect(validateDate('2024/01/15')).toBe(false); // Wrong format
    expect(validateDate('')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(validateDate(' 2024-01-15 ')).toBe(true);
  });
});

describe('validateAmount', () => {
  it('should return true for valid amounts', () => {
    expect(validateAmount(100)).toBe(true);
    expect(validateAmount(1)).toBe(true);
    expect(validateAmount(999999)).toBe(true);
  });

  it('should return false for invalid amounts', () => {
    expect(validateAmount(0)).toBe(false); // Not positive
    expect(validateAmount(-100)).toBe(false); // Negative
    expect(validateAmount(10.5)).toBe(false); // Not an integer
    expect(validateAmount(NaN)).toBe(false);
  });
});

describe('validateMonth', () => {
  it('should return true for valid months', () => {
    expect(validateMonth('2024-01')).toBe(true);
    expect(validateMonth('2024-12')).toBe(true);
    expect(validateMonth('2023-06')).toBe(true);
  });

  it('should return false for invalid months', () => {
    expect(validateMonth('2024-13')).toBe(false); // Invalid month
    expect(validateMonth('2024-00')).toBe(false); // Invalid month
    expect(validateMonth('24-01')).toBe(false); // Wrong year format
    expect(validateMonth('2024-1')).toBe(false); // Missing leading zero
    expect(validateMonth('not-a-month')).toBe(false);
    expect(validateMonth('')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(validateMonth(' 2024-01 ')).toBe(true);
  });
});

describe('assertUuid', () => {
  it('should return valid UUID for correct input', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(assertUuid(uuid, 'testId')).toBe(uuid);
  });

  it('should throw error for invalid UUID', () => {
    expect(() => assertUuid('not-a-uuid', 'testId')).toThrow('testId must be a valid UUID');
    expect(() => assertUuid('', 'testId')).toThrow('testId is required and must be a valid UUID');
    expect(() => assertUuid(null, 'testId')).toThrow('testId is required and must be a valid UUID');
    expect(() => assertUuid(undefined, 'testId')).toThrow('testId is required and must be a valid UUID');
  });
});

describe('assertMonth', () => {
  it('should return valid month for correct input', () => {
    expect(assertMonth('2024-01', 'month')).toBe('2024-01');
  });

  it('should throw error for invalid month', () => {
    expect(() => assertMonth('2024-13', 'month')).toThrow('month must be in YYYY-MM format');
    expect(() => assertMonth('', 'month')).toThrow('month is required and must be in YYYY-MM format');
    expect(() => assertMonth(null, 'month')).toThrow('month is required and must be in YYYY-MM format');
  });
});

describe('assertPositiveIntegerCents', () => {
  it('should return valid amount for correct input', () => {
    expect(assertPositiveIntegerCents(100, 'amount')).toBe(100);
  });

  it('should throw error for invalid amount', () => {
    expect(() => assertPositiveIntegerCents(0, 'amount')).toThrow('amount must be a positive integer amount in cents');
    expect(() => assertPositiveIntegerCents(-100, 'amount')).toThrow(
      'amount must be a positive integer amount in cents'
    );
    expect(() => assertPositiveIntegerCents(10.5, 'amount')).toThrow(
      'amount must be a positive integer amount in cents'
    );
    expect(() => assertPositiveIntegerCents(NaN, 'amount')).toThrow(
      'amount is required and must be a positive integer amount in cents'
    );
  });
});
