// Orchestrator for update-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../core/response/index.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';
import { UpdateTransactionInputParser } from './input-parser.js';
import { UpdateTransactionDataFetcher } from './data-fetcher.js';
import { UpdateTransactionReportGenerator } from './report-generator.js';

export const schema = {
  name: 'update-transaction',
  description: 'Update an existing transaction with new category, payee, notes, or amount',
  inputSchema: zodToJsonSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const parser = new UpdateTransactionInputParser();
    const input = parser.parse(args);

    // Update the transaction
    const transactionId = await new UpdateTransactionDataFetcher().updateTransaction(input);

    // Generate formatted report
    const message = new UpdateTransactionReportGenerator().generate(input, transactionId);

    return success(message);
  } catch (error) {
    return errorFromCatch(error);
  }
}
