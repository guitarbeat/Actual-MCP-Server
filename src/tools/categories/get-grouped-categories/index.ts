// ----------------------------
// GET GROUPED CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { fetchAllCategoryGroups } from '../../../core/data/fetch-categories.js';
import type { CategoryGroup } from '../../../core/types/domain.js';
import { GetGroupedCategoriesArgsSchema, type GetGroupedCategoriesArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'get-grouped-categories',
  description:
    'Retrieve a list of all category groups with their id, name, type and category list.\n\n' +
    'RETURNED DATA:\n' +
    '- Category group ID (UUID) - Use this when creating new categories\n' +
    '- Category group name (e.g., "Food & Dining", "Transportation")\n' +
    '- Category group type (income or expense)\n' +
    '- List of categories within each group with their IDs and names\n\n' +
    'EXAMPLE:\n' +
    '- Get all categories: {} or no arguments\n\n' +
    'COMMON USE CASES:\n' +
    '- Finding category group IDs before creating new categories with manage-entity\n' +
    '- Finding category IDs/names for filtering transactions with get-transactions\n' +
    '- Finding category IDs/names for setting budgets with set-budget\n' +
    '- Understanding the category structure of your budget\n\n' +
    'SEE ALSO:\n' +
    '- manage-entity: Create new categories or category groups using IDs from this tool\n' +
    '- set-budget: Set budget amounts for categories found here\n' +
    '- get-transactions: Filter transactions by category names from this tool\n' +
    '- spending-by-category: Analyze spending across categories listed here',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all category groups with nested categories, including group IDs needed for creating new categories.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(
  args: GetGroupedCategoriesArgs | undefined = undefined
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    GetGroupedCategoriesArgsSchema.parse(args ?? {});

    const categoryGroups: CategoryGroup[] = await fetchAllCategoryGroups();

    return successWithJson(categoryGroups);
  } catch (err) {
    return errorFromCatch(err);
  }
}
