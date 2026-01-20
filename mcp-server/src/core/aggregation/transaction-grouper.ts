// Groups transactions by category and aggregates spending
import type { CategoryGroupInfo, CategorySpending, Transaction } from '../types/domain.js';

const UNKNOWN_GROUP = {
  name: 'Unknown Group',
  isIncome: false,
} as const;

export class TransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};

    // Cache for category info to avoid repeated function calls
    // Using a Map is efficient for frequent lookups
    const categoryInfoCache = new Map<string, { name: string; group: CategoryGroupInfo | typeof UNKNOWN_GROUP }>();

    for (const transaction of transactions) {
      const categoryId = transaction.category;
      if (!categoryId) continue; // Skip uncategorized

      let info = categoryInfoCache.get(categoryId);

      if (!info) {
        const categoryName = getCategoryName(categoryId);
        const group = getGroupInfo(categoryId) || UNKNOWN_GROUP;
        info = { name: categoryName, group };
        categoryInfoCache.set(categoryId, info);
      }

      // Skip income categories if not requested
      if (info.group.isIncome && !includeIncome) continue;

      let spending = spendingByCategory[categoryId];
      if (!spending) {
        spending = {
          id: categoryId,
          name: info.name,
          group: info.group.name,
          isIncome: !!info.group.isIncome,
          total: 0,
          transactions: 0,
        };
        spendingByCategory[categoryId] = spending;
      }

      spending.total += transaction.amount;
      spending.transactions += 1;
    }

    return spendingByCategory;
  }
}
