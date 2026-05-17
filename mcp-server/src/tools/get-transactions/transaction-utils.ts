import type { Transaction } from '../../core/types/domain.js';

/**
 * Filter transactions based on provided criteria
 */
export function filterTransactions(
  transactions: Transaction[],
  criteria: {
    minAmount?: number;
    maxAmount?: number;
    categoryName?: string;
    payeeName?: string;
    excludeTransfers?: boolean;
  },
): Transaction[] {
  let filtered = [...transactions];
  const { minAmount, maxAmount, categoryName, payeeName, excludeTransfers } = criteria;

  if (minAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount >= minAmount * 100);
  }
  if (maxAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
  }
  if (categoryName) {
    const lowerCategory = categoryName.toLowerCase();
    if (lowerCategory === 'uncategorized') {
      filtered = filtered.filter((t) => !t.category || t.category === null);
    } else {
      filtered = filtered.filter((t) =>
        (t.category_name || '').toLowerCase().includes(lowerCategory),
      );
    }
  }
  if (payeeName) {
    const lowerPayee = payeeName.toLowerCase();
    filtered = filtered.filter((t) => (t.payee_name || '').toLowerCase().includes(lowerPayee));
  }
  if (excludeTransfers) {
    filtered = filtered.filter((t) => !t.is_parent && !t.is_child && t.transfer_id == null);
  }

  return filtered;
}

/**
 * Build descriptive list of applied filters
 */
export function buildAppliedFilters(criteria: {
  minAmount?: number;
  maxAmount?: number;
  categoryName?: string;
  payeeName?: string;
}): string[] {
  const filters: string[] = [];
  const { minAmount, maxAmount, categoryName, payeeName } = criteria;

  if (minAmount !== undefined) filters.push(`Minimum amount: $${minAmount.toFixed(2)}`);
  if (maxAmount !== undefined) filters.push(`Maximum amount: $${maxAmount.toFixed(2)}`);
  if (categoryName) filters.push(`Category contains: "${categoryName}"`);
  if (payeeName) filters.push(`Payee contains: "${payeeName}"`);

  return filters;
}

export function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return String(left.id).localeCompare(String(right.id));
  });
}

/**
 * Generate account summary for "all" search
 */
export function generateAccountSummary(
  filtered: Transaction[],
): { accountName: string; count: number }[] {
  const accountCounts = new Map<string, number>();
  filtered.forEach((t) => {
    const name = t.account_name || t.account || 'Unknown';
    accountCounts.set(name, (accountCounts.get(name) || 0) + 1);
  });
  return Array.from(accountCounts.entries())
    .map(([accountName, count]) => ({ accountName, count }))
    .sort((a, b) => b.count - a.count);
}
