// Aggregates category spendings into groups and sorts them
import type { CategorySpending, GroupSpending } from '../types/domain.js';
import { sortBy } from './sort-by.js';
import { sumBy } from './sum-by.js';

/**
 * Group an array of items by a key.
 *
 * @param array - The array to group
 * @param key - The key to group by
 * @returns Record of grouped items
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

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
      const sortedCategories = sortBy(categoryList, [(cat) => Math.abs(cat.total)], ['desc']);

      groups.push({
        name: groupName,
        total,
        categories: sortedCategories,
      });
    }

    // Sort groups by absolute total (descending)
    return sortBy(groups, [(group) => Math.abs(group.total)], ['desc']);
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
