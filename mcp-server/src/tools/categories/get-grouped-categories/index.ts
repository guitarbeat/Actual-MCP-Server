// ----------------------------
// GET GROUPED CATEGORY TOOL
// ----------------------------

import { fetchAllCategoryGroups } from '../../../core/data/fetch-categories.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { CategoryGroup } from '../../../core/types/domain.js';
import {
  type GetGroupedCategoriesArgs,
  GetGroupedCategoriesArgsSchema,
} from '../../../core/types/index.js';

export const schema = {
  name: 'get-grouped-categories',
  description:
    'List all budget categories organized by groups. Use this when the user asks about categories or you need to find a category name.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "what categories do I have?"\n' +
    '- User wants to see "all categories" or "category list"\n' +
    '- You need to find the correct category name for set-budget or other tools\n' +
    '- User asks about "category structure" or "category groups"\n' +
    '- Before creating a new category, to see existing ones\n\n' +
    'EXAMPLE:\n' +
    '- "Show all categories": {}\n\n' +
    'RETURNS: Category groups with nested categories (IDs and names)',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all category groups with nested categories, including group IDs needed for creating new categories.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(
  args: GetGroupedCategoriesArgs | undefined = undefined,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    GetGroupedCategoriesArgsSchema.parse(args ?? {});

    const categoryGroups: CategoryGroup[] = await fetchAllCategoryGroups();

    return successWithJson(categoryGroups);
  } catch (err) {
    return errorFromCatch(err);
  }
}
