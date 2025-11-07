// ----------------------------
// GET ACCOUNT BALANCE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';
import { formatAmount } from '../../../utils.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const GetAccountBalanceSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const schema = {
  name: 'get-account-balance',
  description:
    'Get the current balance of an account in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (UUID)\n\n' +
    'OPTIONAL:\n' +
    '- date: Date to query balance at (YYYY-MM-DD format). If omitted, returns current balance.\n\n' +
    'EXAMPLES:\n' +
    '- Current balance: {"id": "account-id"}\n' +
    '- Balance at date: {"id": "account-id", "date": "2024-12-31"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Check current account balance\n' +
    '- Query historical balance at specific date\n' +
    '- Verify account balances\n' +
    '- Get balance for reconciliation\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs and see all balances\n' +
    '- Use balance-history to see balance changes over time\n' +
    '- Use get-transactions to see transactions affecting balance\n\n' +
    'NOTES:\n' +
    '- Balance is returned in cents\n' +
    '- Date format: YYYY-MM-DD (e.g., "2024-12-31")',
  inputSchema: zodToJsonSchema(GetAccountBalanceSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof GetAccountBalanceSchema>): Promise<MCPResponse> {
  try {
    const validated = GetAccountBalanceSchema.parse(args);
    const handler = new AccountHandler();
    const balance = await handler.balance(validated.id, validated.date);
    return success(`Account ${validated.id} balance: ${formatAmount(balance)}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to get account balance',
    });
  }
}
