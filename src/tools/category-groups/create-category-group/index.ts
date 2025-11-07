// ----------------------------
// CREATE CATEGORY GROUP TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { CategoryGroupHandler } from '../../manage-entity/entity-handlers/category-group-handler.js';
import type { CategoryGroupData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const CreateCategoryGroupSchema = z.object({
  name: z.string().min(1, 'Category group name is required'),
});

export const schema = {
  name: 'create-category-group',
  description:
    'Create a new category group in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- name: Category group name\n\n' +
    'EXAMPLES:\n' +
    '- {"name": "Food & Dining"}\n' +
    '- {"name": "Transportation"}\n' +
    '- {"name": "Entertainment"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Organize categories into groups\n' +
    '- Create new budget sections\n' +
    '- Group related spending categories\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to list all groups\n' +
    '- Use update-category-group to modify groups\n' +
    '- Use delete-category-group to remove groups\n' +
    '- Use create-category to add categories to groups\n\n' +
    'NOTES:\n' +
    '- Category groups help organize your budget\n' +
    '- Categories must belong to a group',
  inputSchema: zodToJsonSchema(CreateCategoryGroupSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreateCategoryGroupSchema>): Promise<MCPResponse> {
  try {
    const validated = CreateCategoryGroupSchema.parse(args);
    const handler = new CategoryGroupHandler();
    const groupId = await handler.create(validated as CategoryGroupData);
    handler.invalidateCache();
    return success(`Successfully created category group "${validated.name}" with id ${groupId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create category group',
    });
  }
}
