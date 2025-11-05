/**
 * Format currency amounts for display
 *
 * @param amount - Amount in cents (or null/undefined)
 * @returns Formatted currency string in USD format, or 'N/A' if amount is null/undefined
 */
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';

  // Convert from cents to dollars
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}
