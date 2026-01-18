// Groups transactions by category and aggregates spending
import type { CategoryGroupInfo, CategorySpending, Transaction } from '../types/domain.js';

export class TransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};
    const skippedCategories = new Set<string>();

    for (const transaction of transactions) {
      if (!transaction.category) continue; // Skip uncategorized
      const categoryId = transaction.category;

      // Optimization: Check if we already have an entry for this category
      // This avoids redundant getGroupInfo/getCategoryName calls (hot path)
      const entry = spendingByCategory[categoryId];
      if (entry) {
        entry.total += transaction.amount;
        entry.transactions += 1;
        continue;
      }

      // Optimization: Check if we already decided to skip this category
      if (skippedCategories.has(categoryId)) {
        continue;
      }

      // Slow path: first time encountering this category
      const group = getGroupInfo(categoryId) || {
        name: 'Unknown Group',
        isIncome: false,
      };

      // Skip income categories if not requested
      if (group.isIncome && !includeIncome) {
        skippedCategories.add(categoryId);
        continue;
      }

      const categoryName = getCategoryName(categoryId);

      spendingByCategory[categoryId] = {
        id: categoryId,
        name: categoryName,
        group: group.name,
        isIncome: group.isIncome,
        total: transaction.amount,
        transactions: 1,
      };
    }
    return spendingByCategory;
  }
}
