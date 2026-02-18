// Shared validators for input data

import { z } from 'zod';

/**
 * Zod schema for UUID v4 validation.
 */
export const UUIDSchema = z.string().uuid();

/**
 * Zod schema for YYYY-MM-DD date validation with additional date validity check.
 */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .refine(
    (date) => {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      // Verify the date components match (catches invalid dates like Feb 30)
      return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    },
    { message: 'Invalid date' },
  );

/**
 * Zod schema for YYYY-MM month validation.
 */
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/**
 * Zod schema for positive integer amount in cents.
 */
export const PositiveIntegerCentsSchema = z.number().int().positive();

/**
 * Validate if a string is a valid UUID.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid UUID, false otherwise.
 */
export function validateUUID(value: string): boolean {
  return UUIDSchema.safeParse(value.trim()).success;
}

/**
 * Validate if a string is a valid date in YYYY-MM-DD format.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid date, false otherwise.
 */
export function validateDate(value: string): boolean {
  return DateSchema.safeParse(value.trim()).success;
}

/**
 * Validate if a number is a valid amount in cents (positive integer).
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid amount, false otherwise.
 */
export function validateAmount(value: number): boolean {
  return PositiveIntegerCentsSchema.safeParse(value).success;
}

/**
 * Validate if a string is a valid month in YYYY-MM format.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid month, false otherwise.
 */
export function validateMonth(value: string): boolean {
  return MonthSchema.safeParse(value.trim()).success;
}

/**
 * Ensure the provided value is a valid UUID string.
 *
 * @param value - The value to validate.
 * @param fieldName - The human-readable field name for error messaging.
 * @returns The validated UUID string.
 * @throws Error when the value is missing, not a string, or not a UUID.
 */
export function assertUuid(value: unknown, fieldName: string): string {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${fieldName} is required and must be a valid UUID`);
  }

  try {
    return UUIDSchema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`${fieldName} must be a valid UUID`);
    }
    throw error;
  }
}

/**
 * Ensure the provided value is a YYYY-MM formatted month string.
 *
 * @param value - The value to validate.
 * @param fieldName - The human-readable field name for error messaging.
 * @returns The validated month string.
 * @throws Error when the value is missing, not a string, or not formatted as YYYY-MM.
 */
export function assertMonth(value: unknown, fieldName: string): string {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${fieldName} is required and must be in YYYY-MM format`);
  }

  try {
    return MonthSchema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`${fieldName} must be in YYYY-MM format`);
    }
    throw error;
  }
}

/**
 * Ensure the provided value is a positive integer amount expressed in cents.
 *
 * @param value - The value to validate.
 * @param fieldName - The human-readable field name for error messaging.
 * @returns The validated amount as a number.
 * @throws Error when the value is missing, not a number, not an integer, or not positive.
 */
export function assertPositiveIntegerCents(value: unknown, fieldName: string): number {
  if (value === null || value === undefined || typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${fieldName} is required and must be a positive integer amount in cents`);
  }

  try {
    return PositiveIntegerCentsSchema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`${fieldName} must be a positive integer amount in cents`);
    }
    throw error;
  }
}
