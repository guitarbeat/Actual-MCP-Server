// ----------------------------
// DELETE CATEGORY TOOL
// ----------------------------

import { deleteCategory } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { DeleteCategoryArgsSchema, type DeleteCategoryArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'delete-category',
  description: 'Delete a category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category. Should be in UUID format.',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: DeleteCategoryArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = DeleteCategoryArgsSchema.parse(args);

    await deleteCategory(parsedArgs.id);

    return successWithJson('Successfully deleted category ' + parsedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
