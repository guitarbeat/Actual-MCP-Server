// ----------------------------
// UPDATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateCategory } from '../../../actual-api.js';

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
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const allowedKeys = ['id', 'name', 'groupId'];
    const invalidKeys = Object.keys(args).filter((key) => !allowedKeys.includes(key));
    if (invalidKeys.length > 0) {
      const invalidList = invalidKeys.join(', ');
      const allowedList = allowedKeys.join(', ');
      return errorFromCatch(
        [
          `Invalid parameter(s): ${invalidList}.`,
          `Allowed parameters are: ${allowedList}.`,
          'Try calling update-category with only these parameters.',
        ].join(' ')
      );
    }

    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    const data: Record<string, unknown> = {};
    if (args.name) {
      data.name = args.name;
    }
    if (args.groupId) {
      data.group_id = args.groupId;
    }

    await updateCategory(args.id, data);

    return successWithJson('Successfully updated category ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
