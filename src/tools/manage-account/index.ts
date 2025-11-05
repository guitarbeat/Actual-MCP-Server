// Orchestrator for manage-account tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../core/response/index.js';
import type { ToolInput } from '../../types.js';
import { ManageAccountInputParser } from './input-parser.js';
import { ManageAccountDataFetcher } from './data-fetcher.js';
import { ManageAccountReportGenerator } from './report-generator.js';
import type { ManageAccountArgs } from './types.js';

// Zod schema for manage-account arguments
const ManageAccountArgsSchema = z.object({
  operation: z
    .enum(['create', 'update', 'delete', 'close', 'reopen', 'balance'])
    .describe(
      'Operation to perform: create (new account), update (modify properties), delete (permanent removal), close (deactivate with history), reopen (reactivate closed account), balance (query balance)'
    ),
  id: z
    .string()
    .optional()
    .describe(
      'Account ID (required for update, delete, close, reopen, and balance operations). Must be a valid UUID. Use get-accounts tool to find account IDs.'
    ),
  account: z
    .object({
      name: z.string().optional().describe('Account name (required for create, optional for update)'),
      type: z
        .enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'])
        .optional()
        .describe(
          'Account type (required for create, optional for update). Options: checking (standard checking account), savings (savings account), credit (credit card - balance typically negative), investment (investment/brokerage account), mortgage (mortgage loan), debt (other debt/loan), other (other account types)'
        ),
      offbudget: z
        .boolean()
        .optional()
        .describe(
          'Whether account is off-budget (optional, defaults to false). Off-budget accounts do not affect budget calculations.'
        ),
    })
    .optional()
    .describe('Account properties object (required for create and update operations)'),
  initialBalance: z
    .number()
    .optional()
    .describe(
      'Initial account balance in cents (optional for create operation). Example: 100000 = $1,000.00. Positive for assets, negative for liabilities.'
    ),
  transferAccountId: z
    .string()
    .optional()
    .describe(
      'Account ID to transfer remaining balance to when closing (required for close operation if balance is non-zero). Use get-accounts to find account IDs.'
    ),
  transferCategoryId: z
    .string()
    .optional()
    .describe(
      'Category ID for the transfer transaction when closing (optional for close operation). Use get-grouped-categories to find category IDs.'
    ),
  date: z
    .string()
    .optional()
    .describe(
      'Date for balance query in YYYY-MM-DD format (optional for balance operation, defaults to today). Example: "2024-01-15"'
    ),
});

export const schema = {
  name: 'manage-account',
  description:
    'Manage accounts in Actual Budget. Create, update, delete, close, reopen accounts, or query balances.\n\n' +
    'OPERATIONS:\n\n' +
    '• CREATE: Add a new account\n' +
    '  Required: account.name, account.type\n' +
    '  Optional: initialBalance (cents), account.offbudget\n' +
    '  Example: {"operation": "create", "account": {"name": "Chase Checking", "type": "checking"}, "initialBalance": 100000}\n\n' +
    '• UPDATE: Modify account properties\n' +
    '  Required: id\n' +
    '  Optional: account.name, account.type, account.offbudget\n' +
    '  Example: {"operation": "update", "id": "abc123", "account": {"name": "Chase Freedom"}}\n\n' +
    '• DELETE: Permanently remove an account (WARNING: Cannot be undone!)\n' +
    '  Required: id\n' +
    '  Example: {"operation": "delete", "id": "abc123"}\n\n' +
    '• CLOSE: Close an account (keeps history)\n' +
    '  Required: id\n' +
    '  Optional: transferAccountId (required if balance ≠ 0), transferCategoryId\n' +
    '  Example: {"operation": "close", "id": "abc123", "transferAccountId": "def456", "transferCategoryId": "ghi789"}\n\n' +
    '• REOPEN: Reactivate a closed account\n' +
    '  Required: id\n' +
    '  Example: {"operation": "reopen", "id": "abc123"}\n\n' +
    '• BALANCE: Query account balance\n' +
    '  Required: id\n' +
    '  Optional: date (YYYY-MM-DD, defaults to today)\n' +
    '  Example: {"operation": "balance", "id": "abc123", "date": "2024-01-01"}\n\n' +
    'ACCOUNT TYPES:\n' +
    '- checking: Standard checking account\n' +
    '- savings: Savings account\n' +
    '- credit: Credit card (balance typically negative)\n' +
    '- investment: Investment/brokerage account\n' +
    '- mortgage: Mortgage loan\n' +
    '- debt: Other debt/loan\n' +
    '- other: Other account types\n\n' +
    'COMMON USE CASES:\n' +
    '- Adding a new bank account: operation=create with name and type\n' +
    '- Renaming an account: operation=update with id and new name\n' +
    '- Closing a paid-off credit card: operation=close with id\n' +
    '- Checking current balance: operation=balance with id\n\n' +
    'NOTES:\n' +
    '- Use get-accounts tool to find account IDs before update, delete, close, reopen, or balance operations\n' +
    '- Amounts are in cents (e.g., 100000 = $1,000.00)\n' +
    '- Delete operation is permanent and cannot be undone - use close instead to preserve history\n' +
    '- When closing an account with a non-zero balance, you must specify transferAccountId',
  inputSchema: zodToJsonSchema(ManageAccountArgsSchema) as ToolInput,
};

export async function handler(args: ManageAccountArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const parser = new ManageAccountInputParser();
    const input = await parser.parse(args);

    // Execute the operation
    const fetcher = new ManageAccountDataFetcher();
    const result = await fetcher.execute(input);

    // Generate formatted report
    const generator = new ManageAccountReportGenerator();
    const message = generator.generate(input, result);

    return success(message);
  } catch (err) {
    return errorFromCatch(err, {
      tool: 'manage-account',
      operation: args.operation,
      args,
    });
  }
}
