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
  operation: z.enum(['create', 'update', 'delete', 'close', 'reopen', 'balance']),
  id: z.string().optional(),
  account: z
    .object({
      name: z.string().optional(),
      type: z.enum(['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other']).optional(),
      offbudget: z.boolean().optional(),
    })
    .optional(),
  initialBalance: z.number().optional(),
  transferAccountId: z.string().optional(),
  transferCategoryId: z.string().optional(),
  date: z.string().optional(),
});

export const schema = {
  name: 'manage-account',
  description:
    'Create, update, delete, close, reopen accounts, or query account balance. ' +
    'Operations: ' +
    'CREATE: Requires account.name and account.type. Optional: initialBalance (in cents), account.offbudget. ' +
    'Example: {"operation": "create", "account": {"name": "My Checking", "type": "checking"}, "initialBalance": 100000}. ' +
    'UPDATE: Requires id. Optional: account.name, account.type, account.offbudget. ' +
    'Example: {"operation": "update", "id": "abc123", "account": {"name": "New Name"}}. ' +
    'DELETE: Requires id. WARNING: Permanent and cannot be undone. ' +
    'Example: {"operation": "delete", "id": "abc123"}. ' +
    'CLOSE: Requires id. If account has non-zero balance, requires transferAccountId. Optional: transferCategoryId. ' +
    'Example: {"operation": "close", "id": "abc123", "transferAccountId": "def456"}. ' +
    'REOPEN: Requires id. Reopens a closed account. ' +
    'Example: {"operation": "reopen", "id": "abc123"}. ' +
    'BALANCE: Requires id. Optional: date (YYYY-MM-DD). Returns account balance. ' +
    'Example: {"operation": "balance", "id": "abc123", "date": "2024-01-01"}',
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
