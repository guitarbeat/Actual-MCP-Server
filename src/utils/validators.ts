// ----------------------------
// INPUT VALIDATION UTILITIES
// ----------------------------

/** Regular expression for validating UUID v4 strings. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Regular expression for validating YYYY-MM formatted month strings. */
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Ensure the provided value is a valid UUID string.
 *
 * @param value - The value to validate.
 * @param fieldName - The human-readable field name for error messaging.
 * @returns The validated UUID string.
 * @throws Error when the value is missing, not a string, or not a UUID.
 */
export function assertUuid(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required and must be a valid UUID`);
  }

  if (!UUID_REGEX.test(value.trim())) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }

  return value;
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
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required and must be in YYYY-MM format`);
  }

  if (!MONTH_REGEX.test(value.trim())) {
    throw new Error(`${fieldName} must be in YYYY-MM format`);
  }

  return value;
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
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${fieldName} is required and must be a positive integer amount in cents`);
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer amount in cents`);
  }

  return value;
}
