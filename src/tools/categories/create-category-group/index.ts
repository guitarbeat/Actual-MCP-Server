// ----------------------------
// CREATE CATEGORY GROUP TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createCategoryGroup } from '../../../actual-api.js';
import { createCategoryGroupArgsSchema, type CreateCategoryGroupArgs } from './types.js';

export const schema = {
  name: 'create-category-group',
  description: 'Create a new category group',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the category',
      },
    },
    required: ['name'],
  },
};

export async function handler(
  args: CreateCategoryGroupArgs
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsedArgs = createCategoryGroupArgsSchema.parse(args);

    const id: string = await createCategoryGroup({
      name: parsedArgs.name,
    });

    return successWithJson('Successfully created category group ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
