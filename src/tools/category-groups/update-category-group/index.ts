// ----------------------------
// UPDATE CATEGORY GROUP TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { CategoryGroupHandler } from '../../manage-entity/entity-handlers/category-group-handler.js';
import type { CategoryGroupData } from '../../manage-entity/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const UpdateCategoryGroupSchema = z.object({
  id: z.string().uuid('Category group ID must be a valid UUID'),
  name: z.string().min(1).optional(),
});

export const schema = {
  name: 'update-category-group',
  description:
    'Update an existing category group in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Category group ID (UUID)\n\n' +
    'OPTIONAL:\n' +
    '- name: New category group name\n\n' +
    'EXAMPLES:\n' +
    '- {"id": "group-id", "name": "Updated Group Name"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Rename category groups\n' +
    '- Correct group names\n' +
    '- Reorganize budget structure\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find group IDs\n' +
    '- Use create-category-group to add new groups\n' +
    '- Use delete-category-group to remove groups\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated',
  inputSchema: zodToJsonSchema(UpdateCategoryGroupSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateCategoryGroupSchema>): Promise<MCPResponse> {
  try {
    const validated = UpdateCategoryGroupSchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    const handler = new CategoryGroupHandler();
    await handler.update(id, updateData as CategoryGroupData);
    handler.invalidateCache();
    return success(`Successfully updated category group with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update category group',
    });
  }
}
