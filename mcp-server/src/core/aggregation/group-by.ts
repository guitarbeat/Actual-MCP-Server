// Aggregates category spendings into groups and sorts them
import type { CategorySpending, GroupSpending } from '../types/domain.js';

/**
 * Aggregates category spending data into groups and sorts by total spending.
 */
export class GroupAggregator {
  /**
   * Aggregate category spending into groups and sort by total amount.
   * Groups and categories within groups are sorted by absolute total (descending).
   *
   * @param spendingByCategory - Record of category spending data
   * @returns Array of group spending data, sorted by total
   */
  aggregateAndSort(spendingByCategory: Record<string, CategorySpending>): GroupSpending[] {
    const categories = Object.values(spendingByCategory);

    // Performance Optimization: Use native loop for grouping instead of lodash.groupBy
    // This avoids library overhead and object creation costs.
    const grouped: Record<string, CategorySpending[]> = {};
    for (const category of categories) {
      const groupName = category.group;
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(category);
    }

    // Optimization: Iterate entries once to build groups, avoiding mapValues object creation
    // and multiple iterations over the groups array.
    const groups: GroupSpending[] = [];

    for (const [groupName, categoryList] of Object.entries(grouped)) {
      // Calculate total using native reduce (faster than lodash.sumBy)
      const total = categoryList.reduce((sum, cat) => sum + cat.total, 0);

      // Sort categories using native sort (faster than lodash.orderBy for simple numeric sort)
      // Note: slice() is needed to avoid mutating the original array if it matters,
      // but here we built the array in the loop above so it's fresh.
      // However, categoryList refers to the array in 'grouped'.
      // Sorting in-place is fine here as 'grouped' is local.
      categoryList.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

      groups.push({
        name: groupName,
        total,
        categories: categoryList,
      });
    }

    // Sort groups by absolute total (descending) using native sort
    groups.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    return groups;
  }

  /**
   * Convert an array of items with IDs into a record keyed by ID.
   *
   * @param list - Array of items with id property
   * @returns Record mapping IDs to items
   */
  byId<T extends { id: string }>(list: T[]): Record<string, T> {
    return list.reduce<Record<string, T>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }
}
