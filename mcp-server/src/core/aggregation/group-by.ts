// Aggregates category spendings into groups and sorts them
import { groupBy, orderBy, sumBy } from 'lodash-es';
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
    const grouped = groupBy(categories, 'group');

    // Optimization: Iterate entries once to build groups, avoiding mapValues object creation
    // and multiple iterations over the groups array.
    // Performance impact: Reduces iterations from O(3N) to O(2N) roughly, and avoids intermediate objects.
    const groups: GroupSpending[] = [];

    for (const [groupName, categoryList] of Object.entries(grouped)) {
      // Calculate total and sort categories in one step
      const total = sumBy(categoryList, 'total');
      const sortedCategories = orderBy(categoryList, [(cat) => Math.abs(cat.total)], ['desc']);

      groups.push({
        name: groupName,
        total,
        categories: sortedCategories,
      });
    }

    // Sort groups by absolute total (descending)
    return orderBy(groups, [(group) => Math.abs(group.total)], ['desc']);
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
