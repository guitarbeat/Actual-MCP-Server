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

// Zod schema for manage-transaction arguments (flattened)
const ManageTransactionArgsSchema = z.object({
  operation: z
    .enum(['create', 'update', 'delete'])
    .describe('Operation: create (add new), update (modify existing), or delete (remove permanently)'),
  id: z.string().optional().describe('Transaction ID (required for update/delete). Use get-transactions to find IDs.'),
  account: z.string().optional().describe('Account name or ID (required for create). Example: "Checking"'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format (required for create). Example: "2024-01-15"'),
  amount: z
    .number()
    .optional()
    .describe(
      'Amount in dollars or cents (required for create). Auto-detected: if < 1000 with decimal, treated as dollars. Negative for expenses, positive for income. Examples: -50.00 (dollars), -5000 (cents)'
    ),
  payee: z.string().optional().describe('Payee name or ID (optional). Example: "Grocery Store"'),
  category: z.string().optional().describe('Category name or ID (optional). Example: "Groceries"'),
  notes: z.string().optional().describe('Transaction notes (optional)'),
  cleared: z.boolean().optional().describe('Whether transaction is cleared/reconciled (optional, defaults to false)'),
});

export const schema = {
  name: 'manage-transaction',
  description:
    'Create, update, or delete transactions in Actual Budget. Supports name or ID resolution for accounts, payees, and categories.\n\n' +
    'OPERATIONS:\n\n' +
    '• CREATE: Add a new transaction\n' +
    '  Required: operation="create", account, date (YYYY-MM-DD), amount\n' +
    '  Optional: payee, category, notes, cleared (boolean)\n' +
    '  Example: {"operation": "create", "account": "Checking", "date": "2024-01-15", "amount": -50.00, "payee": "Grocery Store", "category": "Groceries"}\n' +
    '  Example: {"operation": "create", "account": "Checking", "date": "2024-01-15", "amount": 2500.00, "category": "Income"}\n\n' +
    '• UPDATE: Modify an existing transaction\n' +
    '  Required: operation="update", id (transaction UUID)\n' +
    '  Optional: Any fields to update (account, date, amount, payee, category, notes, cleared)\n' +
    '  Example: {"operation": "update", "id": "abc123", "amount": -55.00, "notes": "Updated"}\n' +
    '  Example: {"operation": "update", "id": "abc123", "category": "Restaurants"}\n\n' +
    '• DELETE: Permanently remove a transaction\n' +
    '  Required: operation="delete", id (transaction UUID)\n' +
    '  Example: {"operation": "delete", "id": "abc123"}\n' +
    '  WARNING: Cannot be undone!\n\n' +
    'COMMON USE CASES:\n' +
    '- Manually add transactions not imported from bank\n' +
    '- Correct transaction amounts, dates, or categories\n' +
    '- Update transaction notes or categorization\n' +
    '- Delete duplicate or incorrect transactions\n' +
    '- Mark transactions as cleared/reconciled\n' +
    '- Create split transactions across multiple categories\n' +
    '- Add income transactions\n\n' +
    'SEE ALSO:\n' +
    '- Use get-transactions to find transaction IDs for update/delete\n' +
    '- Use get-accounts to find account names/IDs\n' +
    '- Use get-grouped-categories to find category names/IDs\n' +
    '- Use get-payees to find payee names/IDs\n' +
    '- Use import-transactions to sync from bank accounts\n\n' +
    'AMOUNT FORMAT:\n' +
    '- Accepts dollars (e.g., -50.00) or cents (e.g., -5000)\n' +
    '- Auto-detected: amounts < 1000 with decimal are treated as dollars\n' +
    '- Negative = expenses, positive = income\n' +
    '- Examples: -50.00 (expense), 2500.00 (income), -5000 (expense in cents)\n\n' +
    'SPLIT TRANSACTIONS:\n' +
    '- Split transactions are supported via the underlying API\n' +
    '- Use subtransactions array to split amounts across multiple categories\n' +
    '- Example: Create transaction with amount -100.00, then split into two subtransactions of -60.00 and -40.00 with different categories\n\n' +
    'NOTES:\n' +
    '- Date format: YYYY-MM-DD (e.g., "2024-01-15")\n' +
    '- Accepts names or IDs for account, payee, category\n' +
    '- Account/payee/category names support partial matching\n' +
    '- Delete is permanent and cannot be undone',
  inputSchema: zodToJsonSchema(ManageTransactionArgsSchema) as ToolInput,
};

export async function handler(args: ManageTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input, resolve names to IDs, convert amounts
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
