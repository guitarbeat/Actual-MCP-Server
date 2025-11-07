// ----------------------------
// DELETE TRANSACTION TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

// Delete transaction schema
const DeleteTransactionSchema = z.object({
  id: z.string().uuid('Transaction ID must be a valid UUID'),
});

export const schema = {
  name: 'delete-transaction',
  description:
    'Delete a transaction from Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Transaction ID (UUID)\n\n' +
    'EXAMPLE:\n' +
    '{"id": "transaction-id"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Remove duplicate transactions\n' +
    '- Delete incorrect transactions\n' +
    '- Clean up test transactions\n\n' +
    'SEE ALSO:\n' +
    '- Use get-transactions to find transaction IDs\n' +
    '- Use create-transaction to add new transactions\n' +
    '- Use update-transaction to modify transactions\n\n' +
    'NOTES:\n' +
    '- ⚠️ WARNING: Deletion is permanent and cannot be undone\n' +
    '- Use get-transactions to find transaction IDs',
  inputSchema: zodToJsonSchema(DeleteTransactionSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteTransactionSchema>): Promise<MCPResponse> {
  try {
    // Validate input
    const validated = DeleteTransactionSchema.parse(args);

    // Use TransactionHandler to delete transaction
    const handler = new TransactionHandler();
    await handler.delete(validated.id);
    handler.invalidateCache();

    return success(`Successfully deleted transaction with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete transaction',
    });
  }
}
