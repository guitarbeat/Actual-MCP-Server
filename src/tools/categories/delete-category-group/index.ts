// ----------------------------
// DELETE CATEGORY GROUP TOOL
// ----------------------------

import { deleteCategoryGroup } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { DeleteCategoryGroupArgsSchema, type DeleteCategoryGroupArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'delete-category-group',
  description: 'Delete a category group',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: DeleteCategoryGroupArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = DeleteCategoryGroupArgsSchema.parse(args);

    await deleteCategoryGroup(parsedArgs.id);

    return successWithJson('Successfully deleted category group ' + parsedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
