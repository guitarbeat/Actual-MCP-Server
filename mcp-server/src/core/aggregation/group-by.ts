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
    // Optimization: Single pass aggregation
    // Iterate over categories once to group them and calculate totals simultaneously.
    const groupsMap: Record<string, GroupSpending> = {};

    // Using Object.values is faster than iterating keys and looking up
    const categories = Object.values(spendingByCategory);

    for (const category of categories) {
      const groupName = category.group;
      // Direct property access is often faster than Map.get for string keys in hot paths
      let group = groupsMap[groupName];

      if (!group) {
        group = {
          name: groupName,
          total: 0,
          categories: [],
        };
        groupsMap[groupName] = group;
      }

      group.total += category.total;
      group.categories.push(category);
    }

    // Convert to array and sort
    const groups = Object.values(groupsMap);

    // Sort categories within each group
    // Optimization: Use native sort directly to avoid overhead of generic sortBy utility
    for (const group of groups) {
      group.categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    }

    // Sort groups by absolute total (descending)
    return groups.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
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
