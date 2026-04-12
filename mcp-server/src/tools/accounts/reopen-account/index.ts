// ----------------------------
// REOPEN ACCOUNT TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { executeMutationTool } from '../../shared/mutation-tool.js';
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

export async function handler(args: z.infer<typeof ReopenAccountSchema>) {
  return executeMutationTool(args, {
    parse: ReopenAccountSchema.parse,
    createHandler: () => new AccountHandler(),
    execute: (accountHandler, validated) => accountHandler.reopen(validated.id),
    successMessage: ({ id }) => `Successfully reopened account with id ${id}`,
    fallbackMessage: 'Failed to reopen account',
  });
}
