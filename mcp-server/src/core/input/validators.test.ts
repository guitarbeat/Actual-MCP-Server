import { describe, expect, it } from 'vitest';
import {
  assertMonth,
  assertPositiveIntegerCents,
  assertUuid,
  validateAmount,
  validateDate,
  validateMonth,
  validateUUID,
} from './validators.js';

describe('validators', () => {
  describe('validateUUID', () => {
    it('returns true for a valid UUID', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns true for a valid UUID with whitespace', () => {
      expect(validateUUID('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(true);
    });

    it('returns false for an invalid UUID', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('returns true for a valid date', () => {
      expect(validateDate('2023-10-15')).toBe(true);
      expect(validateDate('2024-02-29')).toBe(true); // Leap year
    });

    it('returns true for a valid date with whitespace', () => {
      expect(validateDate('  2023-10-15  ')).toBe(true);
    });

    it('returns false for an invalid date format', () => {
      expect(validateDate('10-15-2023')).toBe(false);
      expect(validateDate('2023/10/15')).toBe(false);
      expect(validateDate('2023-1-5')).toBe(false);
    });

    it('returns false for non-existent dates', () => {
      expect(validateDate('2023-02-29')).toBe(false); // Not a leap year
      expect(validateDate('2023-04-31')).toBe(false); // April has 30 days
      expect(validateDate('2023-13-01')).toBe(false); // Invalid month
      expect(validateDate('2023-00-01')).toBe(false); // Invalid month
      expect(validateDate('2023-01-00')).toBe(false); // Invalid day
      expect(validateDate('2023-01-32')).toBe(false); // Invalid day
    });
  });

  describe('validateAmount', () => {
    it('returns true for a positive integer', () => {
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(1)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(validateAmount(0)).toBe(false);
    });

    it('returns false for negative numbers', () => {
      expect(validateAmount(-100)).toBe(false);
    });

    it('returns false for floats', () => {
      expect(validateAmount(100.5)).toBe(false);
    });
  });

  describe('validateMonth', () => {
    it('returns true for a valid month', () => {
      expect(validateMonth('2023-10')).toBe(true);
      expect(validateMonth('2024-02')).toBe(true);
    });

    it('returns true for a valid month with whitespace', () => {
      expect(validateMonth('  2023-10  ')).toBe(true);
    });

    it('returns false for an invalid month format', () => {
      expect(validateMonth('10-2023')).toBe(false);
      expect(validateMonth('2023/10')).toBe(false);
      expect(validateMonth('2023-1')).toBe(false);
    });

    it('returns false for invalid months', () => {
      expect(validateMonth('2023-13')).toBe(false);
      expect(validateMonth('2023-00')).toBe(false);
    });
  });

  describe('assertUuid', () => {
    it('returns the UUID if it is valid', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(assertUuid(validUuid, 'userId')).toBe(validUuid);
    });

    it('throws an error if value is null or undefined', () => {
      expect(() => assertUuid(null, 'userId')).toThrow('userId is required and must be a valid UUID');
      expect(() => assertUuid(undefined, 'userId')).toThrow('userId is required and must be a valid UUID');
    });

    it('throws an error if value is an empty string or only whitespace', () => {
      expect(() => assertUuid('', 'userId')).toThrow('userId is required and must be a valid UUID');
      expect(() => assertUuid('   ', 'userId')).toThrow('userId is required and must be a valid UUID');
    });

    it('throws an error if value is not a valid UUID', () => {
      expect(() => assertUuid('invalid-uuid', 'userId')).toThrow('userId must be a valid UUID');
    });

    it('throws an error if value is not a string type', () => {
      expect(() => assertUuid(123, 'userId')).toThrow('userId must be a valid UUID');
    });
  });

  describe('assertMonth', () => {
    it('returns the month if it is valid', () => {
      expect(assertMonth('2023-10', 'billingMonth')).toBe('2023-10');
    });

    it('throws an error if value is null or undefined', () => {
      expect(() => assertMonth(null, 'billingMonth')).toThrow('billingMonth is required and must be in YYYY-MM format');
      expect(() => assertMonth(undefined, 'billingMonth')).toThrow('billingMonth is required and must be in YYYY-MM format');
    });

    it('throws an error if value is an empty string or only whitespace', () => {
      expect(() => assertMonth('', 'billingMonth')).toThrow('billingMonth is required and must be in YYYY-MM format');
      expect(() => assertMonth('   ', 'billingMonth')).toThrow('billingMonth is required and must be in YYYY-MM format');
    });

    it('throws an error if value is not a valid YYYY-MM format', () => {
      expect(() => assertMonth('10-2023', 'billingMonth')).toThrow('billingMonth must be in YYYY-MM format');
      expect(() => assertMonth('2023-13', 'billingMonth')).toThrow('billingMonth must be in YYYY-MM format');
    });

    it('throws an error if value is not a string type', () => {
      expect(() => assertMonth(123, 'billingMonth')).toThrow('billingMonth must be in YYYY-MM format');
    });
  });

  describe('assertPositiveIntegerCents', () => {
    it('returns the amount if it is a valid positive integer', () => {
      expect(assertPositiveIntegerCents(100, 'price')).toBe(100);
    });

    it('throws an error if value is null or undefined', () => {
      expect(() => assertPositiveIntegerCents(null, 'price')).toThrow('price is required and must be a positive integer amount in cents');
      expect(() => assertPositiveIntegerCents(undefined, 'price')).toThrow('price is required and must be a positive integer amount in cents');
    });

    it('throws an error if value is not a number', () => {
      expect(() => assertPositiveIntegerCents('100', 'price')).toThrow('price is required and must be a positive integer amount in cents');
      expect(() => assertPositiveIntegerCents(NaN, 'price')).toThrow('price is required and must be a positive integer amount in cents');
    });

    it('throws an error if value is zero', () => {
      expect(() => assertPositiveIntegerCents(0, 'price')).toThrow('price must be a positive integer amount in cents');
    });

    it('throws an error if value is negative', () => {
      expect(() => assertPositiveIntegerCents(-100, 'price')).toThrow('price must be a positive integer amount in cents');
    });

    it('throws an error if value is a float', () => {
      expect(() => assertPositiveIntegerCents(100.5, 'price')).toThrow('price must be a positive integer amount in cents');
    });
  });
});
