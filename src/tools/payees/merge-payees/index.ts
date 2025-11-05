// ----------------------------
// MERGE PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { mergePayees } from '../../../actual-api.js';

export const schema = {
  name: 'merge-payees',
  description:
    'Merge multiple payees into a single target payee. All transactions from source payees will be reassigned to the target payee, and source payees will be deleted.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- targetPayeeId: ID of the payee to keep (all transactions will be moved here)\n' +
    '- sourcePayeeIds: Array of payee IDs to merge and delete\n\n' +
    'EXAMPLE:\n' +
    '{"targetPayeeId": "abc123-def456", "sourcePayeeIds": ["ghi789-jkl012", "mno345-pqr678"]}\n\n' +
    'COMMON USE CASES:\n' +
    '- Consolidating duplicate payees (e.g., "Amazon" and "Amazon.com")\n' +
    '- Cleaning up imported payee names\n' +
    '- Standardizing payee names across transactions\n\n' +
    'NOTES:\n' +
    '- WARNING: Source payees are permanently deleted after merge (cannot be undone)\n' +
    '- All transactions from source payees are reassigned to target payee\n' +
    '- Use get-payees to find payee IDs before merging\n' +
    '- Target payee must exist and remain after merge\n' +
    '- Source payees cannot include the target payee ID\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Use get-payees to find duplicate or similar payee IDs\n' +
    '2. Choose which payee to keep as target (usually the most common name)\n' +
    '3. Use merge-payees to consolidate duplicates into target\n' +
    '4. Use get-payees to verify merge was successful\n\n' +
    'SEE ALSO:\n' +
    '- get-payees: Find payee IDs before merging\n' +
    '- manage-entity: Create or update individual payees\n' +
    '- get-transactions: View transactions affected by payee merge',
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
