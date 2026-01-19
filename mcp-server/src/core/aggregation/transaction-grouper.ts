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

      // Fast path: already processed this category and it's valid
      if (spendingByCategory[categoryId]) {
        spendingByCategory[categoryId].total += transaction.amount;
        spendingByCategory[categoryId].transactions += 1;
        continue;
      }

      // Fast path: already processed this category and it should be skipped
      if (skippedCategories.has(categoryId)) {
        continue;
      }

      // Slow path: first time seeing this category
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
