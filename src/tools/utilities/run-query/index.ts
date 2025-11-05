// ----------------------------
// RUN QUERY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../core/response/index.js';
import { runQuery } from '../../../actual-api.js';

export const schema = {
  name: 'run-query',
  description:
    'Execute custom ActualQL queries to retrieve data from Actual Budget database. Advanced tool for complex data retrieval not covered by other tools.\n\n' +
    'REQUIRED PARAMETERS:\n' +
    '- query: ActualQL query string (SQL-like syntax)\n\n' +
    'EXAMPLE:\n' +
    '{"query": "SELECT * FROM transactions WHERE amount > 5000 LIMIT 10"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Custom data analysis not available through standard tools\n' +
    '- Complex filtering across multiple tables\n' +
    '- Retrieving specific database fields\n' +
    '- Advanced reporting queries\n\n' +
    'NOTES:\n' +
    '- WARNING: Advanced tool - requires knowledge of ActualQL syntax and database schema\n' +
    '- Amounts in database are stored in cents (e.g., 5000 = $50.00)\n' +
    '- Use standard tools (get-transactions, get-accounts, etc.) when possible\n' +
    '- Query syntax is similar to SQL but specific to Actual Budget\n' +
    '- Available tables: transactions, accounts, categories, payees, rules, schedules, and more\n' +
    '- Read-only queries recommended - write operations may cause data corruption\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. Determine if standard tools can accomplish the task\n' +
    '2. If not, use run-query with ActualQL syntax\n' +
    '3. Test queries with LIMIT clause to avoid large result sets\n' +
    '4. Use results for custom analysis or reporting\n\n' +
    'SEE ALSO:\n' +
    '- get-transactions: Standard tool for transaction queries\n' +
    '- get-accounts: Standard tool for account queries\n' +
    '- spending-by-category: Standard tool for spending analysis\n' +
    '- monthly-summary: Standard tool for financial summaries',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'ActualQL query string to execute. ActualQL is Actual Budget\'s query language for retrieving data from the database. Example: "SELECT * FROM transactions WHERE amount > 5000" (amounts in cents).',
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
