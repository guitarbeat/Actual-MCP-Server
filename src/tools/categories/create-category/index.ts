// ----------------------------
// CREATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { createCategory } from '../../../actual-api.js';
import { CreateCategoryArgsSchema, type CreateCategoryArgs } from '../../../core/types/index.js';

export const schema = {
  name: 'create-category',
  description: 'Create a new category',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the category',
      },
      groupId: {
        type: 'string',
        description: 'ID of the category group. Should be in UUID format.',
      },
    },
    required: ['name', 'groupId'],
  },
};

export async function handler(
  args: CreateCategoryArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = CreateCategoryArgsSchema.parse(args);

    const data: Record<string, unknown> = {
      name: parsedArgs.name,
      group_id: parsedArgs.groupId,
    };

    const id: string = await createCategory(data);

    return successWithJson('Successfully created category ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
