// ----------------------------
// UPDATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateCategory } from '../../../actual-api.js';
import { updateCategoryArgsSchema, type UpdateCategoryArgs } from './types.js';

export const schema = {
  name: 'update-category',
  description: 'Update a category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the category. If not changing, repeat.',
      },
      groupId: {
        type: 'string',
        description: 'New ID for the category group. Should be in UUID format.',
      },
    },
    required: ['id', 'name'],
  },
};

export async function handler(
  args: UpdateCategoryArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = updateCategoryArgsSchema.parse(args);

    const data: Record<string, unknown> = {
      name: parsedArgs.name,
    };

    if (parsedArgs.groupId) {
      data.group_id = parsedArgs.groupId;
    }

    await updateCategory(parsedArgs.id, data);

    return successWithJson('Successfully updated category ' + parsedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
