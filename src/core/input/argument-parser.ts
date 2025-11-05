// Shared argument parsing utilities

import { validateDate } from './validators.js';

/**
 * Represents a date range with optional start and end dates.
 */
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Represents an account filter.
 */
export interface AccountFilter {
  accountId?: string;
}

/**
 * Represents a category filter.
 */
export interface CategoryFilter {
  categoryId?: string;
  categoryName?: string;
}

/**
 * Parse and validate a date range from optional start and end date strings.
 *
 * @param start - Optional start date in YYYY-MM-DD format.
 * @param end - Optional end date in YYYY-MM-DD format.
 * @returns A DateRange object with validated dates.
 * @throws Error if dates are provided but invalid, or if start date is after end date.
 */
export function parseDateRange(start?: string, end?: string): DateRange {
  const result: DateRange = {};

  if (start !== undefined) {
    if (typeof start !== 'string' || !validateDate(start)) {
      throw new Error('startDate must be a valid date in YYYY-MM-DD format');
    }
    result.startDate = start;
  }

  if (end !== undefined) {
    if (typeof end !== 'string' || !validateDate(end)) {
      throw new Error('endDate must be a valid date in YYYY-MM-DD format');
    }
    result.endDate = end;
  }

  // Validate that start is not after end
  if (result.startDate && result.endDate) {
    const startTime = new Date(result.startDate).getTime();
    const endTime = new Date(result.endDate).getTime();
    if (startTime > endTime) {
      throw new Error('startDate cannot be after endDate');
    }
  }

  return result;
}

/**
 * Parse and validate an account filter from an optional account ID.
 *
 * @param accountId - Optional account ID string.
 * @returns An AccountFilter object.
 * @throws Error if accountId is provided but not a valid string.
 */
export function parseAccountFilter(accountId?: string): AccountFilter {
  const result: AccountFilter = {};

  if (accountId !== undefined) {
    if (typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('accountId must be a non-empty string');
    }
    result.accountId = accountId;
  }

  return result;
}

/**
 * Parse and validate a category filter from optional category ID or name.
 *
 * @param categoryId - Optional category ID string.
 * @param categoryName - Optional category name string.
 * @returns A CategoryFilter object.
 * @throws Error if both categoryId and categoryName are provided, or if values are invalid.
 */
export function parseCategoryFilter(categoryId?: string, categoryName?: string): CategoryFilter {
  const result: CategoryFilter = {};

  if (categoryId !== undefined && categoryName !== undefined) {
    throw new Error('Cannot specify both categoryId and categoryName');
  }

  if (categoryId !== undefined) {
    if (typeof categoryId !== 'string' || categoryId.trim() === '') {
      throw new Error('categoryId must be a non-empty string');
    }
    result.categoryId = categoryId;
  }

  if (categoryName !== undefined) {
    if (typeof categoryName !== 'string' || categoryName.trim() === '') {
      throw new Error('categoryName must be a non-empty string');
    }
    result.categoryName = categoryName;
  }

  return result;
}
