// ----------------------------
// DELETE CATEGORY GROUP TOOL
// ----------------------------

import { deleteCategoryGroup } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { deleteCategoryGroupArgsSchema, type DeleteCategoryGroupArgs } from './types.js';

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
    const parsedArgs = deleteCategoryGroupArgsSchema.parse(args);

    await deleteCategoryGroup(parsedArgs.id);

    return successWithJson('Successfully deleted category group ' + parsedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
