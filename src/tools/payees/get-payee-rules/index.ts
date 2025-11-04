// ----------------------------
// GET PAYEE RULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getPayeeRules } from '../../../actual-api.js';

export const schema = {
  name: 'get-payee-rules',
  description: 'Get all rules associated with a specific payee',
  inputSchema: {
    type: 'object',
    properties: {
      payeeId: {
        type: 'string',
        description: 'ID of the payee',
      },
    },
    required: ['payeeId'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.payeeId || typeof args.payeeId !== 'string') {
      return errorFromCatch('payeeId is required and must be a string');
    }

    const rules = await getPayeeRules(args.payeeId as string);

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
