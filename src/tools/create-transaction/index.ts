// Orchestrator for create-transaction tool

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CreateTransactionInputParser } from './input-parser.js';
import { CreateTransactionDataFetcher } from './data-fetcher.js';
import { CreateTransactionReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { CreateTransactionArgsSchema, type CreateTransactionArgs, ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'create-transaction',
  description: 'Create a new transaction with all fields, creating payees and categories if necessary',
  inputSchema: zodToJsonSchema(CreateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: CreateTransactionArgs): Promise<CallToolResult> {
  try {
    // Parse and validate input
    const input = new CreateTransactionInputParser().parse(args);

    // Create transaction and any necessary entities
    const result = await new CreateTransactionDataFetcher().createTransaction(input);

    // Generate formatted report
    const markdown = new CreateTransactionReportGenerator().generate(input, result);

    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
