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

describe('Validators', () => {
  describe('validateUUID', () => {
    it('returns true for valid UUID v4', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns false for invalid UUID', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(validateUUID('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(true);
    });
  });

  describe('validateDate', () => {
    it('returns true for valid YYYY-MM-DD dates', () => {
      expect(validateDate('2023-01-01')).toBe(true);
      expect(validateDate('2023-12-31')).toBe(true);
      expect(validateDate('2024-02-29')).toBe(true); // Leap year
    });

    it('returns false for invalid dates formats', () => {
      expect(validateDate('01-01-2023')).toBe(false);
      expect(validateDate('2023/01/01')).toBe(false);
      expect(validateDate('2023-1-1')).toBe(false);
      expect(validateDate('invalid-date')).toBe(false);
      expect(validateDate('')).toBe(false);
    });

    it('returns false for invalid calendar dates', () => {
      expect(validateDate('2023-02-29')).toBe(false); // Not a leap year
      expect(validateDate('2023-04-31')).toBe(false); // April has 30 days
      expect(validateDate('2023-13-01')).toBe(false); // Invalid month
      expect(validateDate('2023-00-15')).toBe(false); // Invalid month
      expect(validateDate('2023-01-32')).toBe(false); // Invalid day
      expect(validateDate('2023-01-00')).toBe(false); // Invalid day
    });

    it('trims whitespace before validating', () => {
      expect(validateDate('  2023-01-01  ')).toBe(true);
    });
  });

  describe('validateAmount', () => {
    it('returns true for positive integers', () => {
      expect(validateAmount(1)).toBe(true);
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(999999)).toBe(true);
    });

    it('returns false for zero, negative numbers, and floats', () => {
      expect(validateAmount(0)).toBe(false); // Should be positive
      expect(validateAmount(-100)).toBe(false);
      expect(validateAmount(100.5)).toBe(false); // Should be integer
    });
  });

  describe('validateMonth', () => {
    it('returns true for valid YYYY-MM formats', () => {
      expect(validateMonth('2023-01')).toBe(true);
      expect(validateMonth('2023-12')).toBe(true);
    });

    it('returns false for invalid formats', () => {
      expect(validateMonth('2023-1')).toBe(false);
      expect(validateMonth('23-01')).toBe(false);
      expect(validateMonth('2023/01')).toBe(false);
      expect(validateMonth('01-2023')).toBe(false);
      expect(validateMonth('2023-13')).toBe(false); // Invalid month number
      expect(validateMonth('2023-00')).toBe(false); // Invalid month number
      expect(validateMonth('')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(validateMonth('  2023-01  ')).toBe(true);
    });
  });

  describe('assertUuid', () => {
    it('returns the parsed valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(assertUuid(validUuid, 'testId')).toBe(validUuid);
    });

    it('throws custom error if value is null or undefined', () => {
      expect(() => assertUuid(null, 'testId')).toThrow(
        'testId is required and must be a valid UUID',
      );
      expect(() => assertUuid(undefined, 'testId')).toThrow(
        'testId is required and must be a valid UUID',
      );
    });

    it('throws custom error if value is empty string or only whitespace', () => {
      expect(() => assertUuid('', 'testId')).toThrow('testId is required and must be a valid UUID');
      expect(() => assertUuid('   ', 'testId')).toThrow(
        'testId is required and must be a valid UUID',
      );
    });

    it('throws custom error if value is not a string', () => {
      // The validator internally relies on Zod parsing the value.
      // If a number is provided, ZodSchema.parse will throw ZodError, caught and mapped to our custom error.
      expect(() => assertUuid(123 as any, 'testId')).toThrow('testId must be a valid UUID');
    });

    it('throws custom error if value is an invalid UUID string', () => {
      expect(() => assertUuid('invalid-uuid', 'testId')).toThrow('testId must be a valid UUID');
    });
  });

  describe('assertMonth', () => {
    it('returns the parsed valid month', () => {
      expect(assertMonth('2023-05', 'testMonth')).toBe('2023-05');
    });

    it('throws custom error if value is null or undefined', () => {
      expect(() => assertMonth(null, 'testMonth')).toThrow(
        'testMonth is required and must be in YYYY-MM format',
      );
      expect(() => assertMonth(undefined, 'testMonth')).toThrow(
        'testMonth is required and must be in YYYY-MM format',
      );
    });

    it('throws custom error if value is empty string or whitespace', () => {
      expect(() => assertMonth('', 'testMonth')).toThrow(
        'testMonth is required and must be in YYYY-MM format',
      );
      expect(() => assertMonth('   ', 'testMonth')).toThrow(
        'testMonth is required and must be in YYYY-MM format',
      );
    });

    it('throws custom error if value is not a string', () => {
      expect(() => assertMonth(123 as any, 'testMonth')).toThrow(
        'testMonth must be in YYYY-MM format',
      );
    });

    it('throws custom error if value is an invalid month format', () => {
      expect(() => assertMonth('2023-13', 'testMonth')).toThrow(
        'testMonth must be in YYYY-MM format',
      );
      expect(() => assertMonth('invalid', 'testMonth')).toThrow(
        'testMonth must be in YYYY-MM format',
      );
    });
  });

  describe('assertPositiveIntegerCents', () => {
    it('returns the parsed valid amount', () => {
      expect(assertPositiveIntegerCents(100, 'testAmount')).toBe(100);
      expect(assertPositiveIntegerCents(999, 'testAmount')).toBe(999);
    });

    it('throws custom error if value is null, undefined, or NaN', () => {
      expect(() => assertPositiveIntegerCents(null, 'testAmount')).toThrow(
        'testAmount is required and must be a positive integer amount in cents',
      );
      expect(() => assertPositiveIntegerCents(undefined, 'testAmount')).toThrow(
        'testAmount is required and must be a positive integer amount in cents',
      );
      expect(() => assertPositiveIntegerCents(NaN, 'testAmount')).toThrow(
        'testAmount is required and must be a positive integer amount in cents',
      );
    });

    it('throws custom error if value is not a number', () => {
      expect(() => assertPositiveIntegerCents('100' as any, 'testAmount')).toThrow(
        'testAmount is required and must be a positive integer amount in cents',
      );
    });

    it('throws custom error if value is zero or negative', () => {
      expect(() => assertPositiveIntegerCents(0, 'testAmount')).toThrow(
        'testAmount must be a positive integer amount in cents',
      );
      expect(() => assertPositiveIntegerCents(-100, 'testAmount')).toThrow(
        'testAmount must be a positive integer amount in cents',
      );
    });

    it('throws custom error if value is not an integer', () => {
      expect(() => assertPositiveIntegerCents(100.5, 'testAmount')).toThrow(
        'testAmount must be a positive integer amount in cents',
      );
    });
  });
});
