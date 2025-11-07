// ----------------------------
// CREATE CATEGORY TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { CategoryHandler } from '../../manage-entity/entity-handlers/category-handler.js';
import type { CategoryData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  groupId: z.string().uuid('Group ID must be a valid UUID'),
});

export const schema = {
  name: 'create-category',
  description:
    'Create a new category in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- name: Category name\n' +
    '- groupId: Category group ID (UUID)\n\n' +
    'EXAMPLES:\n' +
    '- {"name": "Groceries", "groupId": "group-id"}\n' +
    '- {"name": "Gas", "groupId": "group-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Add new spending categories\n' +
    '- Create income categories\n' +
    '- Organize budget by category\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find group IDs\n' +
    '- Use update-category to modify categories\n' +
    '- Use delete-category to remove categories\n\n' +
    'NOTES:\n' +
    '- Group ID must be a valid UUID\n' +
    '- Use get-grouped-categories to find available group IDs',
  inputSchema: zodToJsonSchema(CreateCategorySchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreateCategorySchema>): Promise<MCPResponse> {
  try {
    const validated = CreateCategorySchema.parse(args);
    const handler = new CategoryHandler();
    const categoryId = await handler.create(validated as CategoryData);
    handler.invalidateCache();
    return success(`Successfully created category "${validated.name}" with id ${categoryId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create category',
    });
  }
}
