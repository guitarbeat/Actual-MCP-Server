// ----------------------------
// GET ID BY NAME TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getAccounts, getCategories, getCategoryGroups, getPayees } from '../../../actual-api.js';

export const schema = {
  name: 'get-id-by-name',
  description: 'Get the ID of an account, category, payee, or category group by its name',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to search for',
      },
      type: {
        type: 'string',
        enum: ['account', 'category', 'payee', 'category-group'],
        description: 'Type of entity to search for',
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

    let result: { id: string; name: string; type: string } | null = null;

    switch (type) {
      case 'account': {
        const accounts = await getAccounts();
        const account = accounts.find((a) => a.name === name);
        if (account) {
          result = { id: account.id, name: account.name, type: 'account' };
        }
        break;
      }
      case 'category': {
        const categories = await getCategories();
        const category = categories.find((c) => c.name === name);
        if (category) {
          result = { id: category.id, name: category.name, type: 'category' };
        }
        break;
      }
      case 'payee': {
        const payees = await getPayees();
        const payee = payees.find((p) => p.name === name);
        if (payee) {
          result = { id: payee.id, name: payee.name, type: 'payee' };
        }
        break;
      }
      case 'category-group': {
        const groups = await getCategoryGroups();
        const group = groups.find((g) => g.name === name);
        if (group) {
          result = { id: group.id, name: group.name, type: 'category-group' };
        }
        break;
      }
      default:
        return errorFromCatch(`Invalid type: ${type}. Must be one of: account, category, payee, category-group`);
    }

    if (!result) {
      return errorFromCatch(`No ${type} found with name "${name}"`);
    }

    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
