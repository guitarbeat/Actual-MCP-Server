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
    'Add a new account to the budget. Use this when the user wants to set up a new bank account, credit card, or investment account.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "add a new checking account"\n' +
    '- User wants to "create an account for [bank name]"\n' +
    '- User says "set up my credit card"\n' +
    '- User wants to "add a savings account"\n' +
    '- User needs to track a new financial account\n\n' +
    'REQUIRED:\n' +
    '- name: Account name (e.g., "Chase Checking")\n' +
    '- type: checking, savings, credit, investment, mortgage, debt, or other\n\n' +
    'OPTIONAL:\n' +
    '- offbudget: Set true for tracking-only accounts (default: false)\n' +
    '- initialBalance: Starting balance in cents (default: 0)\n\n' +
    'EXAMPLES:\n' +
    '- "Add checking account": {"name": "Chase Checking", "type": "checking"}\n' +
    '- "Create savings with $10k": {"name": "High Yield Savings", "type": "savings", "initialBalance": 1000000}\n' +
    '- "Add credit card": {"name": "Amazon Card", "type": "credit"}\n' +
    '- "Track 401k off-budget": {"name": "401k", "type": "investment", "offbudget": true}\n\n' +
    'NOTES:\n' +
    '- Initial balance in cents (100000 = $1,000)\n' +
    '- Off-budget accounts don\'t affect budget calculations',
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
