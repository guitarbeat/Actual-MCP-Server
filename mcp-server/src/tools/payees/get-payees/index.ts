// ----------------------------
// GET PAYEES TOOL
// ----------------------------

import { getPayeeRules } from '../../../core/api/actual-client.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { Payee } from '../../../core/types/index.js';

export const schema = {
  name: 'get-payees',
  description:
    'List all merchants and payees, or search for specific ones. Use this when you need to find payee names or IDs.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "what payees do I have?"\n' +
    '- User wants to "list all merchants"\n' +
    '- User asks "find payees with Amazon in the name"\n' +
    '- You need to find a payee ID for merge-payees or other tools\n' +
    '- User wants to see "auto-categorization rules for [payee]"\n\n' +
    'OPTIONAL:\n' +
    '- search: Partial payee name to search (e.g., "Amazon")\n' +
    '- limit: Max results to return\n' +
    '- payeeId: Get auto-categorization rules for specific payee\n\n' +
    'EXAMPLES:\n' +
    '- "Show all payees": {}\n' +
    '- "Find Amazon payees": {"search": "Amazon", "limit": 10}\n' +
    '- "Get rules for payee": {"payeeId": "abc-123"}\n\n' +
    'RETURNS: Payee IDs, names, and transfer account info (or rules if payeeId provided)',
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
