// ----------------------------
// DELETE TRANSACTION TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, type MCPResponse, success } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';

// Delete transaction schema
const DeleteTransactionSchema = z.object({
  id: z
    .string()
    .uuid('Transaction ID must be a valid UUID')
    .describe(
      'The unique identifier of the transaction to delete (use get-transactions to find this).',
    ),
});

export const schema = {
  name: 'delete-transaction',
  description:
    'Remove a transaction permanently. Use this when the user wants to delete a duplicate or incorrect transaction.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "delete that transaction"\n' +
    '- User wants to "remove the duplicate"\n' +
    '- User says "that transaction was a mistake"\n' +
    '- User wants to "get rid of" a transaction\n' +
    '- User needs to clean up incorrect entries\n\n' +
    'REQUIRED:\n' +
    '- id: Transaction ID (get from get-transactions first)\n\n' +
    'EXAMPLE:\n' +
    '- "Delete transaction": {"id": "abc-123"}\n\n' +
    'NOTES:\n' +
    '- ⚠️ PERMANENT: Cannot be undone\n' +
    '- Use get-transactions to find the transaction ID first',
  inputSchema: zodToJsonSchema(DeleteTransactionSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof DeleteTransactionSchema>): Promise<MCPResponse> {
  try {
    // Validate input
    const validated = DeleteTransactionSchema.parse(args);

    // Use TransactionHandler to delete transaction
    const transactionHandler = new TransactionHandler();
    await transactionHandler.delete(validated.id);
    transactionHandler.invalidateCache();

    return success(`Successfully deleted transaction with id ${validated.id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to delete transaction',
    });
  }
}
