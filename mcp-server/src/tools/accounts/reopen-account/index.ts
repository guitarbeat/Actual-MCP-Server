// ----------------------------
// REOPEN ACCOUNT TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, type MCPResponse, success } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';

const ReopenAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
});

export const schema = {
  name: 'reopen-account',
  description:
    'Reopen a closed account in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "account-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Reactivate previously closed accounts\n' +
    '- Restore accounts that were closed by mistake\n' +
    '- Resume using accounts after temporary closure\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Use close-account to close accounts\n' +
    '- Use update-account to modify account properties\n\n' +
    'NOTES:\n' +
    '- Only works on accounts that were previously closed\n' +
    '- Reopened accounts retain all transaction history',
  inputSchema: zodToJsonSchema(ReopenAccountSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof ReopenAccountSchema>): Promise<MCPResponse> {
  try {
    const validated = ReopenAccountSchema.parse(args);
    const handler = new AccountHandler();
    await handler.reopen(validated.id);
    handler.invalidateCache();
    return success(`Successfully reopened account with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to reopen account',
    });
  }
}
