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
    'Retrieve all category groups with their categories.\n\n' +
    'EXAMPLE:\n' +
    '- Get all: {}\n\n' +
    'COMMON USE CASES:\n' +
    '- List all available categories and category groups\n' +
    '- Find category IDs for setting budgets or filtering transactions\n' +
    '- Find category group IDs for creating new categories\n' +
    '- Understand category structure and organization\n' +
    '- Get category metadata before using in other operations\n\n' +
    'SEE ALSO:\n' +
    '- Use with set-budget to set budget amounts for categories\n' +
    '- Use with manage-entity to create new categories or category groups\n' +
    '- Use with get-transactions or spending-by-category to filter by category\n\n' +
    'RETURNS:\n' +
    '- Category group ID, name, type\n' +
    '- Categories within each group with IDs and names',
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
