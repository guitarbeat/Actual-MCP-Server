// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, type MCPResponse, success } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import type { TransactionData } from '../../manage-entity/entity-handlers/transaction-handler.js';
import { TransactionHandler } from '../../manage-entity/entity-handlers/transaction-handler.js';

// Transaction data schema for create operation
const CreateTransactionSchema = z.object({
  account: z.string().min(1, 'Account is required').describe("Name of the account (e.g., 'Checking', 'Savings')"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .describe('Date of the transaction in YYYY-MM-DD format'),
  amount: z.number().describe('Amount in dollars (e.g. 50.25). Negative for expenses, positive for income'),
  payee: z.string().optional().describe('Name of the merchant or person'),
  category: z.string().optional().describe('Name of the category'),
  notes: z.string().optional().describe('Additional notes or details about the transaction'),
  cleared: z.boolean().optional().describe('Whether the transaction has cleared the bank'),
  subtransactions: z
    .array(
      z.object({
        amount: z.number().describe('Amount for this split'),
        category: z.string().optional().describe('Category for this split'),
        notes: z.string().optional().describe('Note for this split'),
      })
    )
    .optional()
    .describe('List of subtransactions for split transactions'),
});

export const schema = {
  name: 'create-transaction',
  description:
    'Add a new transaction to an account. Use this when the user wants to manually record a purchase, payment, or income.\n\n' +
    'WHEN TO USE:\n' +
    '- User says "add a transaction for $50 at Whole Foods"\n' +
    '- User wants to "record a purchase" or "log an expense"\n' +
    '- User says "I spent $X on [something]"\n' +
    '- User wants to "add income" or "record a payment"\n' +
    '- User needs to "split a transaction" across categories\n' +
    '- User wants to manually enter a transaction not from bank import\n\n' +
    'REQUIRED:\n' +
    '- account: Account name (e.g., "Checking")\n' +
    '- date: YYYY-MM-DD format (e.g., "2025-01-15")\n' +
    '- amount: Dollar amount (negative for expenses, positive for income)\n\n' +
    'OPTIONAL:\n' +
    '- payee: Merchant or person name\n' +
    '- category: Category name\n' +
    '- notes: Additional details\n' +
    '- cleared: true/false (default: false)\n' +
    '- subtransactions: For split transactions\n\n' +
    'EXAMPLES:\n' +
    '- "Add $50 grocery purchase": {"account": "Checking", "date": "2025-01-15", "amount": -50, "payee": "Whole Foods", "category": "Groceries"}\n' +
    '- "Record paycheck": {"account": "Checking", "date": "2025-01-15", "amount": 2000, "payee": "Employer", "category": "Income"}\n' +
    '- "Split transaction": {"account": "Checking", "date": "2025-01-15", "amount": -100, "subtransactions": [{"amount": -60, "category": "Groceries"}, {"amount": -40, "category": "Gas"}]}\n\n' +
    'NOTES:\n' +
    '- Amounts < 1000 treated as dollars (-50 = -$50)\n' +
    '- Negative amounts = expenses, positive = income',
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
