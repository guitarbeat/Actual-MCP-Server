// ----------------------------
// GET PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import { getPayeeRules } from '../../../actual-api.js';
import type { Payee } from '../../../types.js';

export const schema = {
  name: 'get-payees',
  description:
    'Retrieve payees from Actual Budget. If payeeId is provided, returns rules for that payee. If omitted, returns all payees.\n\n' +
    'PARAMETERS:\n' +
    '- payeeId: (Optional) Payee UUID. If provided, returns auto-categorization rules for that payee.\n' +
    '- search: (Optional) Filter payees by name (case-insensitive partial match).\n' +
    '- limit: (Optional) Maximum number of payees to return.\n\n' +
    'EXAMPLES:\n' +
    '- Get all payees: {}\n' +
    '- Search payees: {"search": "Amazon", "limit": 10}\n' +
    '- Get rules for payee: {"payeeId": "abc123-def456"}\n\n' +
    'COMMON USE CASES:\n' +
    '- List all payees to find payee IDs\n' +
    '- Search for specific payees by name\n' +
    '- View auto-categorization rules for a payee\n' +
    '- Find payee IDs before merging or managing payees\n' +
    '- Understand payee structure and organization\n\n' +
    'SEE ALSO:\n' +
    '- Use with merge-payees to combine duplicate payees\n' +
    '- Use with manage-entity to create or update payees\n' +
    '- Use with get-rules to see all auto-categorization rules\n' +
    '- Use with get-transactions to filter transactions by payee\n\n' +
    'RETURNS:\n' +
    '- If payeeId omitted: Array of payees with id, name, and transfer account\n' +
    '- If payeeId provided: Array of rules for that payee',
  inputSchema: {
    type: 'object',
    properties: {
      payeeId: {
        type: 'string',
        description:
          'Payee UUID. If provided, returns auto-categorization rules for this payee. If omitted, returns all payees.',
      },
      search: {
        type: 'string',
        description: 'Filter payees by name using case-insensitive partial matching.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of payees to return. Applied after search filtering.',
      },
    },
    required: [],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    // Validate payeeId type first if provided
    if (args.payeeId !== undefined && typeof args.payeeId !== 'string') {
      return errorFromCatch('payeeId must be a string');
    }

    // Validate search type if provided
    if (args.search !== undefined && typeof args.search !== 'string') {
      return errorFromCatch('search must be a string');
    }

    // Validate limit type if provided
    if (args.limit !== undefined) {
      if (typeof args.limit !== 'number' || args.limit < 1) {
        return errorFromCatch('limit must be a positive number');
      }
    }

    if (args.payeeId) {
      const rules = await getPayeeRules(args.payeeId as string);
      return successWithJson(rules);
    } else {
      let payees: Payee[] = await fetchAllPayees();

      // Filter by search term if provided
      if (args.search) {
        const searchLower = (args.search as string).toLowerCase();
        payees = payees.filter((payee) => payee.name.toLowerCase().includes(searchLower));
      }

      // Apply limit if provided
      if (args.limit !== undefined) {
        payees = payees.slice(0, args.limit as number);
      }

      const structured = payees.map((payee) => ({
        id: payee.id,
        name: payee.name,
        transfer_acct: payee.transfer_acct || '(not a transfer payee)',
      }));
      return successWithJson(structured);
    }
  } catch (err) {
    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve payees',
      suggestion: 'Use the get-payees tool to list payees and supply their IDs as arguments.',
    });
  }
}
