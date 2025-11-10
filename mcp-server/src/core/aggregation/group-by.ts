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
    const spendingByGroup: Record<string, GroupSpending> = {};
    Object.values(spendingByCategory).forEach((category) => {
      if (!spendingByGroup[category.group]) {
        spendingByGroup[category.group] = {
          name: category.group,
          total: 0,
          categories: [],
        };
      }
      spendingByGroup[category.group].total += category.total;
      spendingByGroup[category.group].categories.push(category);
    });
    // Sort groups by absolute total (descending)
    const sortedGroups: GroupSpending[] = Object.values(spendingByGroup).sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total)
    );
    // Sort categories within each group by absolute total (descending)
    sortedGroups.forEach((group) => {
      group.categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    });
    return sortedGroups;
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
