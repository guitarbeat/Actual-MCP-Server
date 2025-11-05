// Orchestrator for manage-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../core/response/index.js';
import type { ToolInput } from '../../types.js';
import { ManageTransactionInputParser } from './input-parser.js';
import { ManageTransactionDataFetcher } from './data-fetcher.js';
import { ManageTransactionReportGenerator } from './report-generator.js';
import type { ManageTransactionArgs } from './types.js';

// Zod schema for manage-transaction arguments
const ManageTransactionArgsSchema = z.object({
  operation: z
    .enum(['create', 'update', 'delete'])
    .describe(
      'Operation to perform. Create adds a new transaction, update modifies an existing one, delete permanently removes a transaction.'
    ),
  id: z
    .string()
    .optional()
    .describe(
      'Transaction ID (required for update and delete operations). Must be a valid UUID. Use get-transactions to find transaction IDs.'
    ),
  transaction: z
    .object({
      account: z
        .string()
        .optional()
        .describe(
          'Account name or ID (required for create). Accepts either the account name (e.g., "Checking") or account ID.'
        ),
      date: z
        .string()
        .optional()
        .describe('Transaction date in YYYY-MM-DD format (required for create). Example: "2024-01-15"'),
      amount: z
        .number()
        .optional()
        .describe(
          'Transaction amount in cents (required for create). Negative for expenses, positive for income. Example: -5000 = -$50.00'
        ),
      payee: z
        .string()
        .optional()
        .describe('Payee name or ID (optional). Accepts either the payee name (e.g., "Grocery Store") or payee ID.'),
      category: z
        .string()
        .optional()
        .describe(
          'Category name or ID (optional). Accepts either the category name (e.g., "Groceries") or category ID.'
        ),
      notes: z
        .string()
        .optional()
        .describe('Transaction notes or memo (optional). Free-form text field for additional details.'),
      cleared: z
        .boolean()
        .optional()
        .describe('Whether the transaction is cleared/reconciled (optional). Defaults to false if not specified.'),
    })
    .optional()
    .describe(
      'Transaction data object (required for create and update operations). Contains the transaction fields to set or modify.'
    ),
});

export const schema = {
  name: 'manage-transaction',
  description:
    'Create, update, or delete transactions in Actual Budget. Supports name or ID resolution for accounts, payees, and categories.\n\n' +
    'OPERATIONS:\n\n' +
    '• CREATE: Add a new transaction\n' +
    '  Required: operation="create", transaction.account, transaction.date, transaction.amount\n' +
    '  Optional: transaction.payee, transaction.category, transaction.notes, transaction.cleared\n' +
    '  Example: {"operation": "create", "transaction": {"account": "Checking", "date": "2024-01-15", "amount": -5000, "payee": "Grocery Store", "category": "Groceries", "notes": "Weekly shopping"}}\n\n' +
    '• UPDATE: Modify an existing transaction\n' +
    '  Required: operation="update", id\n' +
    '  Optional: Any transaction fields to update\n' +
    '  Example: {"operation": "update", "id": "abc123-def456-ghi789", "transaction": {"amount": -5500, "notes": "Updated amount"}}\n\n' +
    '• DELETE: Permanently remove a transaction\n' +
    '  Required: operation="delete", id\n' +
    '  WARNING: Cannot be undone!\n' +
    '  Example: {"operation": "delete", "id": "abc123-def456-ghi789"}\n\n' +
    'AMOUNT FORMAT:\n' +
    '- Amounts are in cents (integer values)\n' +
    '- Negative values = expenses/outflows (e.g., -5000 = -$50.00)\n' +
    '- Positive values = income/inflows (e.g., 5000 = $50.00)\n' +
    '- Examples: -2550 = -$25.50, 100000 = $1,000.00\n\n' +
    'COMMON USE CASES:\n' +
    '- Recording a purchase: operation=create with account, date, amount (negative), payee, category\n' +
    '- Adding income: operation=create with account, date, amount (positive), payee, category\n' +
    '- Fixing a typo: operation=update with id and corrected fields (e.g., amount, notes, category)\n' +
    '- Recategorizing: operation=update with id and new category\n' +
    '- Removing duplicate: operation=delete with id (use with caution!)\n\n' +
    'NOTES:\n' +
    '- Date format must be YYYY-MM-DD (e.g., "2024-01-15")\n' +
    '- Accepts names or IDs for account, payee, and category fields\n' +
    '- Use get-transactions to find transaction IDs before update/delete\n' +
    '- Use get-accounts to find account names/IDs\n' +
    '- Delete operations are permanent and cannot be undone\n\n' +
    'TYPICAL WORKFLOW:\n' +
    '1. CREATE: Use get-accounts to find account, then create transaction\n' +
    '2. UPDATE: Use get-transactions to find transaction ID, then update specific fields\n' +
    '3. DELETE: Use get-transactions to find transaction ID, then delete (with caution)\n' +
    '4. VERIFY: Use get-transactions to confirm changes were applied\n\n' +
    'SEE ALSO:\n' +
    '- get-accounts: Find account IDs/names before creating transactions\n' +
    '- get-transactions: Find transaction IDs before updating or deleting\n' +
    '- get-grouped-categories: Find category IDs/names for categorizing transactions\n' +
    '- get-payees: Find payee IDs/names for transaction payees\n' +
    '- spending-by-category: Analyze spending after creating/updating transactions',
  inputSchema: zodToJsonSchema(ManageTransactionArgsSchema) as ToolInput,
};

export async function handler(args: ManageTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input, resolve names to IDs
    const parser = new ManageTransactionInputParser();
    const input = await parser.parse(args);

    // Execute the operation (create or update)
    const fetcher = new ManageTransactionDataFetcher();
    const result = await fetcher.execute(input);

    // Generate formatted report
    const generator = new ManageTransactionReportGenerator();
    const message = generator.generate(input, result);

    return success(message);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'manage-transaction',
      operation: args.operation,
      args,
    });
  }
}
