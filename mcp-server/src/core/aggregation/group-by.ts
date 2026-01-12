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
    const groups = new Map<string, GroupSpending>();

    // Single pass to group and sum
    for (const cat of Object.values(spendingByCategory)) {
      let group = groups.get(cat.group);
      if (!group) {
        group = {
          name: cat.group,
          total: 0,
          categories: []
        };
        groups.set(cat.group, group);
      }
      group.total += cat.total;
      group.categories.push(cat);
    }

    const result = Array.from(groups.values());

    // Sort categories within groups
    for (const group of result) {
      group.categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    }

    // Sort groups by absolute total (descending)
    result.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    return result;
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
