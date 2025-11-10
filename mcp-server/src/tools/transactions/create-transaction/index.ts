// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { success, errorFromCatch, MCPResponse } from '../../../core/response/index.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';
import type { TransactionData } from '../../manage-entity/entity-handlers/transaction-handler.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { ToolInput } from '../../../types.js';

// Transaction data schema for create operation
const CreateTransactionSchema = z.object({
  account: z.string().min(1, 'Account is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  amount: z.number(),
  payee: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  cleared: z.boolean().optional(),
  subtransactions: z
    .array(
      z.object({
        amount: z.number(),
        category: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

export const schema = {
  name: 'create-transaction',
  description:
    'Create a new transaction in Actual Budget.\n\n' +
    'REQUIRED:\n' +
    '- account: Account name or ID (supports partial matching, e.g., "Chase" matches "Chase Checking")\n' +
    '- date: Transaction date in YYYY-MM-DD format\n' +
    '- amount: Transaction amount (dollars or cents, auto-detected)\n\n' +
    'OPTIONAL:\n' +
    '- payee: Payee name or ID\n' +
    '- category: Category name or ID\n' +
    '- notes: Transaction notes\n' +
    '- cleared: Whether transaction is cleared (default: false)\n' +
    '- subtransactions: Array of split transaction parts\n\n' +
    'EXAMPLES:\n' +
    '- Simple expense: {"account": "Checking", "date": "2025-01-15", "amount": -50.00, "payee": "Grocery Store", "category": "Groceries"}\n' +
    '- Income: {"account": "Checking", "date": "2025-01-15", "amount": 2000.00, "payee": "Employer", "category": "Income"}\n' +
    '- Split transaction: {"account": "Checking", "date": "2025-01-15", "amount": -100.00, "subtransactions": [{"amount": -60, "category": "Groceries"}, {"amount": -40, "category": "Gas"}]}\n\n' +
    'COMMON USE CASES:\n' +
    '- Manually add transactions not imported from bank\n' +
    '- Create split transactions\n' +
    '- Add income transactions\n' +
    '- Record one-time expenses\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account names/IDs\n' +
    '- Use get-grouped-categories to find category names/IDs\n' +
    '- Use get-payees to find payee names/IDs\n' +
    '- Use update-transaction to modify transactions\n' +
    '- Use delete-transaction to remove transactions\n\n' +
    'NOTES:\n' +
    '- Amount auto-detection: amounts < 1000 treated as dollars (e.g., -30 → -$30.00, -30.50 → -$30.50)\n' +
    '- Amounts >= 1000 treated as cents (e.g., -5000 → -$50.00)\n' +
    '- Supports name resolution for account, payee, and category (partial matching)\n' +
    '- Transactions are automatically processed by rules and duplicate detection',
  inputSchema: zodToJsonSchema(CreateTransactionSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreateTransactionSchema>): Promise<MCPResponse> {
  try {
    // Validate input
    const validated = CreateTransactionSchema.parse(args);

    // Use TransactionHandler to create transaction
    const handler = new TransactionHandler();
    const transactionId = await handler.create(validated as TransactionData);
    handler.invalidateCache();

    return success(`Successfully created transaction with id ${transactionId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create transaction',
    });
  }
}
