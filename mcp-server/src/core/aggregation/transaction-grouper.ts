// Groups transactions by category and aggregates spending
import type { CategoryGroupInfo, CategorySpending, Transaction } from '../types/domain.js';

const DEFAULT_GROUP = {
  name: 'Unknown Group',
  isIncome: false,
};

export class TransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};

    for (const transaction of transactions) {
      if (!transaction.category) continue; // Skip uncategorized
      const categoryId = transaction.category;

      let entry = spendingByCategory[categoryId];

      if (!entry) {
        // We haven't processed this included category yet.
        // Note: If we previously processed it and decided to skip it (e.g. income),
        // entry will be undefined and we will redo this check.
        // This is acceptable as the common case is included categories.
        const group = getGroupInfo(categoryId) || DEFAULT_GROUP;

        // Skip income categories if not requested
        if (group.isIncome && !includeIncome) continue;

        const categoryName = getCategoryName(categoryId);

        entry = {
          id: categoryId,
          name: categoryName,
          group: group.name,
          isIncome: group.isIncome,
          total: 0,
          transactions: 0,
        };
        spendingByCategory[categoryId] = entry;
      }

      entry.total += transaction.amount;
      entry.transactions += 1;
    }

    return spendingByCategory;
  }
}
