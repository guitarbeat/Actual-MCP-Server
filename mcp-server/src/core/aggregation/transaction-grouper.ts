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

    for (const transaction of transactions) {
      if (!transaction.category) continue; // Skip uncategorized
      const categoryId = transaction.category;

      // Optimization: Check if we've already processed and accepted this category
      // This avoids redundant calls to getCategoryName and getGroupInfo (and map lookups)
      // for the vast majority of transactions (N transactions -> M categories complexity).
      const existingEntry = spendingByCategory[categoryId];
      if (existingEntry) {
        existingEntry.total += transaction.amount;
        existingEntry.transactions += 1;
        continue;
      }

      // First time encountering this category (or it was previously skipped)
      const group = getGroupInfo(categoryId) || {
        name: 'Unknown Group',
        isIncome: false,
        isSavingsOrInvestment: false, // Default to false
      };

      // Skip income categories if not requested
      if (group.isIncome && !includeIncome) continue;

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
