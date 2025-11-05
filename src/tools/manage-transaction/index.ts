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
  operation: z.enum(['create', 'update', 'delete']),
  id: z.string().optional(),
  transaction: z
    .object({
      account: z.string().optional(),
      date: z.string().optional(),
      amount: z.number().optional(),
      payee: z.string().optional(),
      category: z.string().optional(),
      notes: z.string().optional(),
      cleared: z.boolean().optional(),
    })
    .optional(),
});

export const schema = {
  name: 'manage-transaction',
  description:
    'Create, update, or delete transactions. Accepts account, payee, and category names or IDs. ' +
    'For create: account and date are required. ' +
    'For update: id is required. ' +
    'For delete: only id is required. ' +
    'WARNING: Delete is permanent and cannot be undone. ' +
    'Example delete: {"operation": "delete", "id": "abc123-def456-ghi789"}',
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
