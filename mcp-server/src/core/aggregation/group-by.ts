// Aggregates category spendings into groups and sorts them
import { groupBy, mapValues, sumBy, orderBy } from 'lodash-es';
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

    const spendingByGroup = mapValues(grouped, (categoryList: any[], groupName: string) => ({
      name: groupName,
      total: sumBy(categoryList, 'total'),
      categories: categoryList,
    }));

    // Sort groups by absolute total (descending)
    const sortedGroups = orderBy(Object.values(spendingByGroup), [(group: any) => Math.abs(group.total)], ['desc']);

    // Sort categories within each group by absolute total (descending)
    sortedGroups.forEach((group: any) => {
      group.categories = orderBy(group.categories, [(cat: any) => Math.abs(cat.total)], ['desc']);
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
