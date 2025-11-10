// ----------------------------
// DELETE CATEGORY GROUP TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { CategoryGroupHandler } from '../../manage-entity/entity-handlers/category-group-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const DeleteCategoryGroupSchema = z.object({
  id: z.string().uuid('Category group ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-category-group',
  description:
    'Delete a category group from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Category group ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "group-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove unused category groups\n' +
    '- Clean up test groups\n' +
    '- Consolidate groups\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find group IDs\n' +
    '- Use create-category-group to add new groups\n' +
    '- Use update-category-group to modify groups\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- Categories in this group may need to be moved first',
  inputSchema: zodToJsonSchema(DeleteCategoryGroupSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteCategoryGroupSchema>): Promise<MCPResponse> {
  try {
    const validated = DeleteCategoryGroupSchema.parse(args);
    const handler = new CategoryGroupHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();
    return success(`Successfully deleted category group with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete category group',
    });
  }
}
