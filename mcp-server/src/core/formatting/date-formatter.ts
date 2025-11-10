/**
 * Format a date as YYYY-MM-DD
 *
 * @param date - Date to format (Date object, string, or null/undefined)
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if date is null/undefined
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get date range parameters with defaults
 *
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @returns Object with startDate and endDate strings (defaults to 3 months ago to today)
 */
export function getDateRange(startDate?: string, endDate?: string): { startDate: string; endDate: string } {
  const today = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(today.getMonth() - 3); // 3 months ago by default

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
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1); // first day of N months ago
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
