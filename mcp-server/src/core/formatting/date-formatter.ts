import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

/**
 * Format a date as YYYY-MM-DD
 * Uses UTC date components to match the original toISOString behavior.
 *
 * @param date - Date to format (Date object, string, or null/undefined)
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if date is null/undefined
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const d = new Date(date);
  // Extract UTC components to match original toISOString().split('T')[0] behavior
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range parameters with defaults
 *
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @returns Object with startDate and endDate strings (defaults to 3 months ago to today)
 */
export function getDateRange(
  startDate?: string,
  endDate?: string,
): { startDate: string; endDate: string } {
  const today = new Date();
  const defaultStartDate = subMonths(today, 3); // 3 months ago by default

  return {
    startDate: startDate || formatDate(defaultStartDate),
    endDate: endDate || formatDate(today),
  };
}

/**
 * Calculate start/end date strings for the N most recent months
 *
 * @param months - Number of months to include in the range
 * @returns Object with start and end date strings in YYYY-MM-DD format
 */
export function getDateRangeForMonths(months: number): {
  start: string;
  end: string;
} {
  const end = endOfMonth(new Date()); // last day of current month
  const start = startOfMonth(subMonths(end, months - 1)); // first day of N months ago

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
