// ----------------------------
// CLOSE ACCOUNT TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { executeMutationTool } from '../../shared/mutation-tool.js';
import type { ToolInput } from '../../../core/types/index.js';
import type { CloseAccountData } from '../../manage-entity/entity-handlers/account-handler.js';
import { AccountHandler } from '../../manage-entity/entity-handlers/account-handler.js';

const CloseAccountSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
  transferAccountId: z.string().uuid().optional(),
  transferCategoryId: z.string().uuid().optional(),
});

export const schema = {
  name: 'close-account',
  description:
    'Close an account in Actual Budget. This keeps transaction history but marks the account as closed.\n\n' +
    'REQUIRED:\n' +
    '- id: Account ID (UUID)\n\n' +
    'OPTIONAL:\n' +
    '- transferAccountId: Account ID to transfer balance to\n' +
    '- transferCategoryId: Category ID for transfer transaction\n\n' +
    'EXAMPLES:\n' +
    '- Simple close: {"id": "account-id"}\n' +
    '- Close with transfer: {"id": "account-id", "transferAccountId": "target-account-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Close accounts that are no longer active\n' +
    '- Transfer balance to another account before closing\n' +
    '- Archive old accounts while keeping history\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Use reopen-account to reactivate closed accounts\n' +
    '- Use delete-account to permanently remove accounts\n\n' +
    'NOTES:\n' +
    '- Closing an account keeps all transaction history\n' +
    '- Closed accounts can be reopened later\n' +
    '- Use delete-account if you want to permanently remove the account',
  inputSchema: zodToJsonSchema(CloseAccountSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CloseAccountSchema>) {
  return executeMutationTool(args, {
    parse: CloseAccountSchema.parse,
    createHandler: () => new AccountHandler(),
    execute: (accountHandler, validated) => {
      const { id, ...closeData } = validated;
      return accountHandler.close(id, closeData as CloseAccountData);
    },
    successMessage: ({ id }) => `Successfully closed account with id ${id}`,
    fallbackMessage: 'Failed to close account',
  });
}
