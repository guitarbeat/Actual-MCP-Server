// ----------------------------
// UPDATE TRANSACTION TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { error, errorFromCatch, type MCPResponse, success } from '../../../core/response/index.js';
import type { ToolInput } from '../../../types.js';
import type { TransactionData } from '../../manage-entity/entity-handlers/transaction-handler.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';

// Transaction update schema
const UpdateTransactionSchema = z.object({
  id: z.string().uuid('Transaction ID must be a valid UUID'),
  account: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  amount: z.number().optional(),
  payee: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  cleared: z.boolean().optional(),
});

export const schema = {
  name: 'update-transaction',
  description:
    'Modify an existing transaction. Use this when the user wants to fix or change transaction details.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "change that transaction to $60"\n' +
    '- User wants to "fix the amount" or "correct the category"\n' +
    '- User says "update the transaction to [category]"\n' +
    '- User wants to "mark as cleared" or "add notes"\n' +
    '- User needs to "recategorize" a transaction\n' +
    '- User says "that should be [different amount/category/payee]"\n\n' +
    'REQUIRED:\n' +
    '- id: Transaction ID (get from get-transactions first)\n' +
    '- At least one field to update\n\n' +
    'OPTIONAL:\n' +
    '- amount: New dollar amount\n' +
    '- category: New category name\n' +
    '- payee: New payee name (empty string to clear)\n' +
    '- date: New date (YYYY-MM-DD)\n' +
    '- notes: New notes\n' +
    '- cleared: true/false\n\n' +
    'EXAMPLES:\n' +
    '- "Change amount to $60": {"id": "abc-123", "amount": -60}\n' +
    '- "Fix category": {"id": "abc-123", "category": "Groceries"}\n' +
    '- "Update multiple fields": {"id": "abc-123", "amount": -75, "notes": "Corrected amount"}\n\n' +
    'NOTES:\n' +
    '- Use get-transactions to find the transaction ID first\n' +
    '- Only fields you provide will be changed',
  inputSchema: zodToJsonSchema(UpdateTransactionSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof UpdateTransactionSchema>): Promise<MCPResponse> {
  try {
    // Validate input
    const validated = UpdateTransactionSchema.parse(args);
    const { id, ...updateData } = validated;

    if (Object.keys(updateData).length === 0) {
      return error('No fields provided for update', 'Provide at least one field to update');
    }

    // Use TransactionHandler to update transaction
    const handler = new TransactionHandler();
    await handler.update(id, updateData as TransactionData);
    handler.invalidateCache();

    return success(`Successfully updated transaction with id ${id}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to update transaction',
    });
  }
}
