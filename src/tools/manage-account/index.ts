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
    '• create: Add new account\n' +
    '  Required: account.name, account.type\n' +
    '  Optional: initialBalance (cents), account.offbudget (boolean)\n' +
    '  Example: {"operation": "create", "account": {"name": "Chase Checking", "type": "checking"}, "initialBalance": 100000}\n' +
    '  Example: {"operation": "create", "account": {"name": "Investment Account", "type": "investment", "offbudget": true}}\n\n' +
    '• update: Modify account properties\n' +
    '  Required: id (account UUID)\n' +
    '  Optional: account.name, account.type, account.offbudget\n' +
    '  Example: {"operation": "update", "id": "abc123", "account": {"name": "Updated Name"}}\n' +
    '  Example: {"operation": "update", "id": "abc123", "account": {"offbudget": true}}\n\n' +
    '• delete: Permanently remove account\n' +
    '  Required: id (account UUID)\n' +
    '  Example: {"operation": "delete", "id": "abc123"}\n' +
    '  WARNING: Cannot be undone! Use close instead to preserve history.\n\n' +
    '• close: Close account (keeps history)\n' +
    '  Required: id (account UUID)\n' +
    '  Optional: transferAccountId (if balance ≠ 0)\n' +
    '  Example: {"operation": "close", "id": "abc123"}\n' +
    '  Example: {"operation": "close", "id": "abc123", "transferAccountId": "def456"}\n\n' +
    '• reopen: Reactivate closed account\n' +
    '  Required: id (account UUID)\n' +
    '  Example: {"operation": "reopen", "id": "abc123"}\n\n' +
    '• balance: Query account balance\n' +
    '  Required: id (account UUID)\n' +
    '  Optional: date (YYYY-MM-DD, defaults to today)\n' +
    '  Example: {"operation": "balance", "id": "abc123"}\n' +
    '  Example: {"operation": "balance", "id": "abc123", "date": "2024-01-01"}\n\n' +
    'COMMON USE CASES:\n' +
    '- Add new bank accounts, credit cards, or investment accounts\n' +
    '- Rename accounts or change account types\n' +
    '- Mark accounts as on-budget or off-budget\n' +
    '- Close accounts that are no longer active (preserves history)\n' +
    '- Reopen previously closed accounts\n' +
    '- Query account balance at a specific date\n' +
    '- Remove accounts permanently (use with caution)\n\n' +
    'SEE ALSO:\n' +
    '- Use get-accounts to find account IDs before update/delete/close/reopen operations\n' +
    '- Use get-accounts to see current account balances and metadata\n' +
    '- Use manage-transaction to create transactions in accounts\n\n' +
    'ACCOUNT TYPES:\n' +
    '- checking: Standard checking account\n' +
    '- savings: Savings account\n' +
    '- credit: Credit card (balance typically negative)\n' +
    '- investment: Investment/brokerage account\n' +
    '- mortgage: Mortgage loan\n' +
    '- debt: Other debt/loan\n' +
    '- other: Other account types\n\n' +
    'NOTES:\n' +
    '- Amounts in cents (e.g., 100000 = $1,000.00)\n' +
    '- Use get-accounts to find account IDs\n' +
    '- Delete is permanent, use close to preserve history\n' +
    '- Off-budget accounts do not affect budget calculations',
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
