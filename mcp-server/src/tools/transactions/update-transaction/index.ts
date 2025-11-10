// ----------------------------
// UPDATE TRANSACTION TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse, error } from '../../../core/response/index.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';
import type { TransactionData } from '../../manage-entity/entity-handlers/transaction-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

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
    'Update an existing transaction in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- id: Transaction ID (UUID)\n\n' +
    'OPTIONAL (at least one required):\n' +
    '- account: Account name or ID\n' +
    '- date: Transaction date in YYYY-MM-DD format\n' +
    '- amount: Transaction amount (dollars or cents, auto-detected)\n' +
    '- payee: Payee name or ID (set to empty string to clear)\n' +
    '- category: Category name or ID (set to empty string to clear)\n' +
    '- notes: Transaction notes\n' +
    '- cleared: Whether transaction is cleared\n\n' +
    'EXAMPLES:\n' +
    '- Update amount: {"id": "transaction-id", "amount": -60.00}\n' +
    '- Update category: {"id": "transaction-id", "category": "Groceries"}\n' +
    '- Clear payee: {"id": "transaction-id", "payee": ""}\n' +
    '- Multiple fields: {"id": "transaction-id", "amount": -75.00, "notes": "Updated amount"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Correct transaction amounts\n' +
    '- Reassign categories\n' +
    '- Update payee information\n' +
    '- Mark transactions as cleared\n' +
    '- Add or update notes\n\n' +
    'SEE ALSO:\n' +
    '- Use get-transactions to find transaction IDs\n' +
    '- Use create-transaction to add new transactions\n' +
    '- Use delete-transaction to remove transactions\n\n' +
    'NOTES:\n' +
    '- Only provided fields will be updated\n' +
    '- Amount auto-detection: amounts < 1000 treated as dollars (e.g., -30 → -$30.00, -30.50 → -$30.50)\n' +
    '- Amounts >= 1000 treated as cents (e.g., -5000 → -$50.00)\n' +
    '- Supports name resolution for account, payee, and category',
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
