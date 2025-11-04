// ----------------------------
// MERGE PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { mergePayees } from '../../../actual-api.js';

export const schema = {
  name: 'merge-payees',
  description: 'Merge multiple payees into a target payee',
  inputSchema: {
    type: 'object',
    properties: {
      targetPayeeId: {
        type: 'string',
        description: 'ID of the payee to merge into (target)',
      },
      sourcePayeeIds: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of payee IDs to merge from (sources)',
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