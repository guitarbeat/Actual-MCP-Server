// Maps category IDs to names/groups and identifies income/savings/investment categories
import type { Category, CategoryGroup, CategoryGroupInfo } from '../types/domain.js';

/**
 * Maps category IDs to names, groups, and identifies special category types.
 * Provides efficient lookup for category information during transaction processing.
 */
export class CategoryMapper {
  categoryNames: Record<string, string> = {};

  groupNames: Record<string, string> = {};

  categoryToGroup: Record<string, CategoryGroupInfo> = {};

  investmentCategories: Set<string> = new Set();

  /**
   * Create a new CategoryMapper with the provided categories and groups.
   *
   * @param categories - Array of categories to map
   * @param categoryGroups - Array of category groups to map
   */
  constructor(categories: Category[], categoryGroups: CategoryGroup[]) {
    categories.forEach((cat) => {
      this.categoryNames[cat.id] = cat.name;
    });
    categoryGroups.forEach((group) => {
      this.groupNames[group.id] = group.name;
    });
    categories.forEach((cat) => {
      const groupName = this.groupNames[cat.group_id] || 'Unknown Group';
      const isIncome = !!cat.is_income;
      const isSavingsOrInvestment =
        groupName.toLowerCase().includes('investment') ||
        groupName.toLowerCase().includes('savings');
      this.categoryToGroup[cat.id] = {
        id: cat.group_id,
        name: groupName,
        isIncome,
        isSavingsOrInvestment,
      };
      if (isSavingsOrInvestment) {
        this.investmentCategories.add(cat.id);
      }
    });
  }

  /**
   * Get the name of a category by its ID.
   *
   * @param categoryId - The category ID to lookup
   * @returns The category name, or 'Unknown Category' if not found
   */
  getCategoryName(categoryId: string): string {
    return this.categoryNames[categoryId] || 'Unknown Category';
  }

  /**
   * Get the group information for a category.
   *
   * @param categoryId - The category ID to lookup
   * @returns The category group information, or undefined if not found
   */
  getGroupInfo(categoryId: string): CategoryGroupInfo | undefined {
    return this.categoryToGroup[categoryId];
  }

  /**
   * Check if a category is an investment or savings category.
   *
   * @param categoryId - The category ID to check
   * @returns True if the category is investment/savings, false otherwise
   */
  isInvestmentCategory(categoryId: string): boolean {
    return this.investmentCategories.has(categoryId);
  }
}
