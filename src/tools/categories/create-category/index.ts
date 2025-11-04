// ----------------------------
// CREATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createCategory } from '../../../actual-api.js';
import { assertUuid } from '../../../utils/validators.js';

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
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const allowedKeys = ['name', 'groupId'];
    const invalidKeys = Object.keys(args).filter((key) => !allowedKeys.includes(key));
    if (invalidKeys.length > 0) {
      const invalidList = invalidKeys.join(', ');
      const allowedList = allowedKeys.join(', ');
      return errorFromCatch(
        [
          `Invalid parameter(s): ${invalidList}.`,
          `Allowed parameters are: ${allowedList}.`,
          'Try calling create-category with only these parameters.',
        ].join(' ')
      );
    }

    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }

    const groupId = assertUuid(args.groupId, 'groupId');

    const data: Record<string, unknown> = {
      name: args.name,
      group_id: groupId,
    };

    const id: string = await createCategory(data);

    return successWithJson('Successfully created category ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
