// ----------------------------
// GET ID BY NAME TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getIDByName } from '../../../actual-api.js';

export const schema = {
  name: 'get-id-by-name',
  description: 'Get the ID of an account, category, payee, or schedule by its name using the API getIDByName method',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to search for',
      },
      type: {
        type: 'string',
        enum: ['accounts', 'categories', 'payees', 'schedules'],
        description: 'Type of entity to search for (must be plural: accounts, categories, payees, or schedules)',
      },
    },
    required: ['name', 'type'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }
    if (!args.type || typeof args.type !== 'string') {
      return errorFromCatch('type is required and must be a string');
    }

    const name = args.name as string;
    const type = args.type as string;

    // Validate type is one of the allowed values
    const allowedTypes = ['accounts', 'categories', 'payees', 'schedules'];
    if (!allowedTypes.includes(type)) {
      return errorFromCatch(`Invalid type: ${type}. Must be one of: ${allowedTypes.join(', ')}`);
    }

    try {
      const id = await getIDByName(type, name);

      return successWithJson({
        id,
        name,
        type,
      });
    } catch (apiError) {
      // If the API method is not available, provide a helpful error
      if (apiError instanceof Error && apiError.message.includes('not available')) {
        return errorFromCatch(
          `getIDByName method is not available in this version of the API. The method requires Actual Budget API support.`
        );
      }
      // Re-throw other errors (like "not found")
      throw apiError;
    }
  } catch (err) {
    return errorFromCatch(err);
  }
}
