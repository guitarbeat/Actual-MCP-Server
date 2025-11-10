// Shared validators for input data

/** Regular expression for validating UUID v4 strings. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Regular expression for validating YYYY-MM formatted month strings. */
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Regular expression for validating YYYY-MM-DD formatted date strings. */
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validate if a string is a valid UUID.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid UUID, false otherwise.
 */
export function validateUUID(value: string): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Validate if a string is a valid date in YYYY-MM-DD format.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid date, false otherwise.
 */
export function validateDate(value: string): boolean {
  if (typeof value !== 'string' || !DATE_REGEX.test(value.trim())) {
    return false;
  }
  // Additional check: ensure the date is actually valid (e.g., not 2024-02-30)
  const trimmed = value.trim();
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Verify the date components match (catches invalid dates like Feb 30)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Validate if a number is a valid amount in cents (positive integer).
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid amount, false otherwise.
 */
export function validateAmount(value: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && !Number.isNaN(value);
}

/**
 * Validate if a string is a valid month in YYYY-MM format.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid month, false otherwise.
 */
export function validateMonth(value: string): boolean {
  return typeof value === 'string' && MONTH_REGEX.test(value.trim());
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
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required and must be a valid UUID`);
  }

  if (!validateUUID(value)) {
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

  if (!validateMonth(value)) {
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

  if (!validateAmount(value)) {
    throw new Error(`${fieldName} must be a positive integer amount in cents`);
  }

  return value;
}
