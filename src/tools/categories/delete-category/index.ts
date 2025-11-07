// ----------------------------
// DELETE CATEGORY TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { CategoryHandler } from '../../manage-entity/entity-handlers/category-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const DeleteCategorySchema = z.object({
  id: z.string().uuid('Category ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-category',
  description:
    'Delete a category from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Category ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "category-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove unused categories\n' +
    '- Clean up test categories\n' +
    '- Consolidate duplicate categories\n\n' +
    'SEE ALSO:\n' +
    '- Use get-grouped-categories to find category IDs\n' +
    '- Use create-category to add new categories\n' +
    '- Use update-category to modify categories\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- Transactions using this category may need to be recategorized',
  inputSchema: zodToJsonSchema(DeleteCategorySchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteCategorySchema>): Promise<MCPResponse> {
  try {
    const validated = DeleteCategorySchema.parse(args);
    const handler = new CategoryHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();
    return success(`Successfully deleted category with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete category',
    });
  }
}
