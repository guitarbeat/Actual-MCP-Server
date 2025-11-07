// ----------------------------
// CREATE ACCOUNT TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';
import type { AccountData } from '../../manage-entity/entity-handlers/account-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'], {
    errorMap: () => ({
      message: 'Account type must be one of: checking, savings, credit, investment, mortgage, debt, other',
    }),
  }),
  offbudget: z.boolean().optional(),
  initialBalance: z.number().optional(), // In cents
});

export const schema = {
  name: 'create-account',
  description:
    'Create a new account in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- name: Account name\n' +
    '- type: Account type (checking, savings, credit, investment, mortgage, debt, other)\n\n' +
    'OPTIONAL:\n' +
    '- offbudget: Whether account is off-budget (default: false)\n' +
    '- initialBalance: Initial balance in cents (default: 0)\n\n' +
    'EXAMPLES:\n' +
    '- Checking account: {"name": "Chase Checking", "type": "checking"}\n' +
    '- Savings with balance: {"name": "High Yield Savings", "type": "savings", "initialBalance": 1000000}\n' +
    '- Credit card: {"name": "Amazon Card", "type": "credit"}\n' +
    '- Off-budget investment: {"name": "401k", "type": "investment", "offbudget": true}\n\n' +
    'COMMON USE CASES:\n' +
    '- Add new bank accounts\n' +
    '- Create investment accounts\n' +
    '- Set up credit card accounts\n' +
    '- Initialize accounts with starting balances\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to list all accounts\n' +
    '- Use update-account to modify account properties\n' +
    '- Use delete-account to remove accounts\n' +
    '- Use close-account to close accounts (keeps history)\n\n' +
    'NOTES:\n' +
    '- Initial balance is in cents (e.g., 100000 = $1,000.00)\n' +
    '- Off-budget accounts are excluded from budget calculations',
  inputSchema: zodToJsonSchema(CreateAccountSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreateAccountSchema>): Promise<MCPResponse> {
  try {
    const validated = CreateAccountSchema.parse(args);
    const handler = new AccountHandler();
    const accountId = await handler.create(validated as AccountData);
    handler.invalidateCache();
    return success(`Successfully created account "${validated.name}" with id ${accountId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create account',
    });
  }
}
