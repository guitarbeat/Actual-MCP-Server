// ----------------------------
// DELETE ACCOUNT TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

const DeleteAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-account',
  description:
    'Delete an account from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "account-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove test accounts\n' +
    '- Delete duplicate accounts\n' +
    '- Clean up unused accounts\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Use close-account to close accounts (keeps history)\n' +
    '- Use create-account to add new accounts\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- Consider using close-account instead if you want to keep transaction history\n' +
    '- Use get-accounts to find account IDs',
  inputSchema: zodToJsonSchema(DeleteAccountSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteAccountSchema>): Promise<MCPResponse> {
  try {
    const validated = DeleteAccountSchema.parse(args);
    const handler = new AccountHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();
    return success(`Successfully deleted account with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete account',
    });
  }
}
