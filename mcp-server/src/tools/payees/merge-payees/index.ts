// ----------------------------
// MERGE PAYEES TOOL
// ----------------------------

import { mergePayees } from '../../../core/api/actual-client.js';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';

export const schema = {
  name: 'merge-payees',
  description:
    'Combine duplicate payees into one. Use this when the user wants to clean up duplicate merchant names.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "merge Amazon and Amazon.com"\n' +
    '- User wants to "combine duplicate payees"\n' +
    '- User says "consolidate [payee variations]"\n' +
    '- User wants to "clean up payee list"\n' +
    '- User needs to standardize merchant names\n\n' +
    'REQUIRED:\n' +
    '- targetPayeeId: Payee ID to keep (get from get-payees)\n' +
    '- sourcePayeeIds: Array of payee IDs to merge into target (will be deleted)\n\n' +
    'EXAMPLE:\n' +
    '- "Merge duplicates": {"targetPayeeId": "abc-123", "sourcePayeeIds": ["def-456", "ghi-789"]}\n\n' +
    'NOTES:\n' +
    '- ⚠️ Source payees are permanently deleted\n' +
    '- All transactions from source payees move to target\n' +
    '- Use get-payees first to find payee IDs',
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
  args: Record<string, unknown>,
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

    return successWithJson(
      `Successfully merged payees ${sourceIds.join(', ')} into ${args.targetPayeeId}`,
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
