// ----------------------------
// MERGE PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { mergePayees } from '../../../actual-api.js';

export const schema = {
  name: 'merge-payees',
  description:
    'Merge multiple payees into a single target payee. Source payees are deleted and their transactions reassigned.\n\n' +
    'REQUIRED:\n' +
    '- targetPayeeId: Payee ID to keep\n' +
    '- sourcePayeeIds: Array of payee IDs to merge and delete\n\n' +
    'EXAMPLE:\n' +
    '{"targetPayeeId": "abc123", "sourcePayeeIds": ["def456", "ghi789"]}\n\n' +
    'COMMON USE CASES:\n' +
    '- Consolidate duplicate payees (e.g., "Amazon" and "Amazon.com")\n' +
    '- Clean up payee list by merging variations\n' +
    '- Standardize payee names across transactions\n' +
    '- Reduce payee clutter in reports\n' +
    '- Merge payees after correcting spelling or formatting\n\n' +
    'SEE ALSO:\n' +
    '- Use get-payees to find payee IDs before merging\n' +
    '- Use get-transactions to see transactions affected by merge\n\n' +
    'NOTES:\n' +
    '- WARNING: Source payees are permanently deleted\n' +
    '- Use get-payees to find payee IDs',
  inputSchema: {
    type: 'object',
    properties: {
      targetPayeeId: {
        type: 'string',
        description:
          'ID of the payee to merge into (target). This payee will remain and inherit all transactions from source payees. Must be a valid payee UUID.',
      },
      sourcePayeeIds: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Array of payee IDs to merge from (sources). These payees will be deleted and their transactions reassigned to the target payee. Each must be a valid payee UUID. Use get-payees to find payee IDs.',
      },
    },
    required: ['targetPayeeId', 'sourcePayeeIds'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.targetPayeeId || typeof args.targetPayeeId !== 'string') {
      return errorFromCatch('targetPayeeId is required and must be a string');
    }
    if (!args.sourcePayeeIds || !Array.isArray(args.sourcePayeeIds)) {
      return errorFromCatch('sourcePayeeIds is required and must be an array of strings');
    }

    const sourceIds = args.sourcePayeeIds as string[];
    if (sourceIds.some((id) => typeof id !== 'string')) {
      return errorFromCatch('All sourcePayeeIds must be strings');
    }

    await mergePayees(args.targetPayeeId as string, sourceIds);

    return successWithJson(`Successfully merged payees ${sourceIds.join(', ')} into ${args.targetPayeeId}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
