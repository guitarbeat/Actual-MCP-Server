// ----------------------------
// RUN QUERY TOOL
// ----------------------------

import { successWithJson, errorFromCatch, error } from '../../../core/response/index.js';
import { runQuery } from '../../../actual-api.js';
import { features } from '../../../features.js';

export const schema = {
  name: 'run-query',
  description:
    'Execute custom ActualQL queries to retrieve data from Actual Budget database. Advanced tool for complex data retrieval not covered by other tools.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- query: ActualQL query string (SQL-like syntax)\n\n' +
    'EXAMPLE:\n' +
    '{"query": "SELECT * FROM transactions WHERE amount > 5000 LIMIT 10"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Execute complex queries not supported by standard tools\n' +
    '- Custom data analysis and reporting\n' +
    '- Advanced filtering and aggregation\n' +
    '- Direct database access for specialized needs\n' +
    '- Complex joins across multiple tables\n\n' +
    'SEE ALSO:\n' +
    '- Use standard tools (get-transactions, spending-by-category, etc.) when possible\n' +
    '- Standard tools are easier to use and more reliable\n\n' +
    'NOTES:\n' +
    '- WARNING: Advanced tool - requires knowledge of ActualQL syntax\n' +
    '- Amounts in database are stored in cents\n' +
    '- Use standard tools when possible\n' +
    '- Read-only queries recommended',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'ActualQL query string to execute. Example: "SELECT * FROM transactions WHERE amount > 5000" (amounts in cents).',
      },
    },
    required: ['query'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch> | ReturnType<typeof error>> {
  if (!features.utilityTools) {
    return error(
      'The run-query tool is not enabled.',
      'Set ENABLE_UTILITY_TOOLS=true environment variable to enable this advanced tool.'
    );
  }

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
