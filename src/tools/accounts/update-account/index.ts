// ----------------------------
// UPDATE ACCOUNT TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';
import type { AccountData } from '../../manage-entity/entity-handlers/account-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const UpdateAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
  name: z.string().min(1).optional(),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other']).optional(),
  offbudget: z.boolean().optional(),
});

export const schema = {
  name: 'update-account',
  description:
    'Update an existing account in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- name: New account name\n' +
    '- type: New account type\n' +
    '- offbudget: Whether account is off-budget\n\n' +
    'EXAMPLES:\n' +
    '- Rename account: {"id": "account-id", "name": "New Account Name"}\n' +
    '- Change type: {"id": "account-id", "type": "savings"}\n' +
    '- Move to off-budget: {"id": "account-id", "offbudget": true}\n' +
    '- Multiple fields: {"id": "account-id", "name": "Updated Name", "offbudget": false}\n\n' +
    'COMMON USE CASES:\n' +
    '- Rename accounts\n' +
    '- Change account types\n' +
    '- Move accounts between on-budget and off-budget\n' +
    '- Correct account information\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Use create-account to add new accounts\n' +
    '- Use delete-account to remove accounts\n' +
    '- Use close-account to close accounts\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated\n' +
    '- Account type must be one of: checking, savings, credit, investment, mortgage, debt, other',
  inputSchema: zodToJsonSchema(UpdateAccountSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateAccountSchema>): Promise<MCPResponse> {
  try {
    const validated = UpdateAccountSchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    const handler = new AccountHandler();
    await handler.update(id, updateData as AccountData);
    handler.invalidateCache();
    return success(`Successfully updated account with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update account',
    });
  }
}
