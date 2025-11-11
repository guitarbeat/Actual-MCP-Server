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
    'Permanently remove an account. Use this when the user wants to delete a test or duplicate account.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "delete that account"\n' +
    '- User wants to "remove test account"\n' +
    '- User needs to "clean up duplicate accounts"\n' +
    '- User says "get rid of [account]"\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (get from get-accounts first)\n\n' +
    'EXAMPLE:\n' +
    '- "Delete account": {"id": "abc-123"}\n\n' +
    'NOTES:\n' +
    '- ⚠️ PERMANENT: Cannot be undone\n' +
    '- Consider close-account instead to keep transaction history\n' +
    '- Use get-accounts to find the account ID first',
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
