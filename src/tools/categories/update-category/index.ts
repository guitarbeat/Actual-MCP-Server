// ----------------------------
// UPDATE CATEGORY TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { CategoryHandler } from '../../manage-entity/entity-handlers/category-handler.js';
import type { CategoryData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const UpdateCategorySchema = z.object({
  id: z.string().uuid('Category ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  groupId: z.string().uuid().optional(),
});

export const schema = {
  name: 'update-category',
  description:
    'Update an existing category in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Category ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- name: New category name\n' +
    '- groupId: New category group ID\n\n' +
    'EXAMPLES:\n' +
    '- Rename: {"id": "category-id", "name": "New Name"}\n' +
    '- Move group: {"id": "category-id", "groupId": "new-group-id"}\n' +
    '- Both: {"id": "category-id", "name": "New Name", "groupId": "new-group-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Rename categories\n' +
    '- Move categories between groups\n' +
    '- Correct category information\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find category IDs\n' +
    '- Use create-category to add new categories\n' +
    '- Use delete-category to remove categories\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated',
  inputSchema: zodToJsonSchema(UpdateCategorySchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateCategorySchema>): Promise<MCPResponse> {
  try {
    const validated = UpdateCategorySchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    const handler = new CategoryHandler();
    await handler.update(id, updateData as CategoryData);
    handler.invalidateCache();
    return success(`Successfully updated category with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update category',
    });
  }
}
