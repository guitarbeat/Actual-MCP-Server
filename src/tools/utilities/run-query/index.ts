// ----------------------------
// RUN QUERY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { runQuery } from '../../../actual-api.js';

export const schema = {
  name: 'run-query',
  description: 'Run an ActualQL query to retrieve custom data from the budget',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'ActualQL query string to execute',
      },
    },
    required: ['query'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.query || typeof args.query !== 'string') {
      return errorFromCatch('query is required and must be a string');
    }

    const result = await runQuery(args.query as string);

    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
