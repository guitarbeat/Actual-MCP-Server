// ----------------------------
// UPDATE CATEGORY GROUP TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { updateCategoryGroup } from '../../../actual-api.js';
import { UpdateCategoryGroupArgsSchema, type UpdateCategoryGroupArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'update-category-group',
  description: 'Update a category group',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the category group',
      },
    },
    required: ['id', 'name'],
  },
};

export async function handler(
  args: UpdateCategoryGroupArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = UpdateCategoryGroupArgsSchema.parse(args);

    await updateCategoryGroup(parsedArgs.id, { name: parsedArgs.name });

    return successWithJson('Successfully updated category ' + parsedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
