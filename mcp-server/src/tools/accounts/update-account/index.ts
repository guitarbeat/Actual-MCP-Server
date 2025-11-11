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
    'Modify account properties like name, type, or budget status. Use this when the user wants to change account details.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "rename my checking account"\n' +
    '- User wants to "change account type"\n' +
    '- User says "move account off-budget" or "make it on-budget"\n' +
    '- User needs to "update account information"\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (get from get-accounts first)\n' +
    '- At least one field to update\n\n' +
    'OPTIONAL:\n' +
    '- name: New account name\n' +
    '- type: checking, savings, credit, investment, mortgage, debt, or other\n' +
    '- offbudget: true/false\n\n' +
    'EXAMPLES:\n' +
    '- "Rename account": {"id": "abc-123", "name": "New Name"}\n' +
    '- "Change to savings": {"id": "abc-123", "type": "savings"}\n' +
    '- "Move off-budget": {"id": "abc-123", "offbudget": true}\n\n' +
    'NOTES: Use get-accounts to find the account ID first',
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
