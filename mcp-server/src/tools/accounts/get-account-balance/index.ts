// ----------------------------
// GET ACCOUNT BALANCE TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import { formatAmount } from '../../../utils.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const GetAccountBalanceSchema = z.object({
  id: z.string().min(1, 'Account name or ID is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const schema = {
  name: 'get-account-balance',
  description:
    'Check the current or historical balance of a specific account. Use this when the user asks about a single account balance.\n\n' +
    'WHEN TO USE:\n' +
    '- User asks "what\'s my checking balance?"\n' +
    '- User wants to know "how much is in [account]?"\n' +
    '- User asks "what was my balance on [date]?"\n' +
    '- User needs a specific account balance (not all accounts)\n\n' +
    'REQUIRED:\n' +
    '- id: Account name (e.g., "Checking") or partial match\n\n' +
    'OPTIONAL:\n' +
    '- date: YYYY-MM-DD format for historical balance (omit for current)\n\n' +
    'EXAMPLES:\n' +
    '- "Current balance": {"id": "Checking"}\n' +
    '- "Balance on Dec 31": {"id": "Checking", "date": "2024-12-31"}\n\n' +
    'NOTES:\n' +
    '- For all account balances, use get-accounts instead\n' +
    '- Supports partial name matching',
  inputSchema: zodToJsonSchema(GetAccountBalanceSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof GetAccountBalanceSchema>): Promise<MCPResponse> {
  try {
    const validated = GetAccountBalanceSchema.parse(args);

    // Resolve account name to ID if needed
    const accountId = await nameResolver.resolveAccount(validated.id);

    const handler = new AccountHandler();
    const balance = await handler.balance(accountId, validated.date);
    return success(`Account ${validated.id} balance: ${formatAmount(balance)}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to get account balance',
    });
  }
}
