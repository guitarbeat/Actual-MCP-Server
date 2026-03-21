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
export const CreateTransactionSchema = z.object({
  account: z
    .string()
    .min(1, 'Account is required')
    .max(100, 'Account name must be less than 100 characters')
    .describe('Account name (e.g., "Checking") or UUID to add the transaction to.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .describe('Date of the transaction in YYYY-MM-DD format (e.g., "2025-01-15").'),
  amount: z
    .number()
    .describe(
      'Transaction amount in dollars. Use negative values for expenses (e.g., -50.00) and positive values for income (e.g., 2000.00).',
    ),
  payee: z
    .string()
    .max(100, 'Payee name must be less than 100 characters')
    .optional()
    .describe(
      'Name of the merchant, person, or entity (e.g., "Whole Foods", "Netflix", "John Smith").',
    ),
  category: z
    .string()
    .max(100, 'Category name must be less than 100 characters')
    .optional()
    .describe('Category to classify the transaction (e.g., "Groceries", "Rent", "Salary").'),
  transferAccount: z
    .string()
    .max(100, 'Transfer account name must be less than 100 characters')
    .optional()
    .describe(
      'Destination account name or ID for a transfer. When provided, the matching transfer payee is resolved automatically and the counterpart transaction is created in the destination account.',
    ),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .describe('Additional notes or description for the transaction.'),
  cleared: z
    .boolean()
    .optional()
    .describe('Whether the transaction has cleared the bank. Defaults to false.'),
  subtransactions: z
    .array(
      z.object({
        amount: z.number().describe('Amount for this split part in dollars.'),
        category: z
          .string()
          .max(100, 'Category name must be less than 100 characters')
          .optional()
          .describe('Category for this split part.'),
        notes: z
          .string()
          .max(500, 'Notes must be less than 500 characters')
          .optional()
          .describe('Notes for this split part.'),
      }),
    )
    .optional()
    .describe(
      'List of sub-transactions for split transactions. The sum of sub-transaction amounts must match the total amount.',
    ),
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
    '- User wants to move money between two accounts\n' +
    '- User needs to "split a transaction" across categories\n' +
    '- User wants to manually enter a transaction not from bank import\n\n' +
    'REQUIRED:\n' +
    '- account: Account name (e.g., "Checking")\n' +
    '- date: YYYY-MM-DD format (e.g., "2025-01-15")\n' +
    '- amount: Dollar amount (negative for expenses, positive for income)\n\n' +
    'OPTIONAL:\n' +
    '- payee: Merchant or person name\n' +
    '- category: Category name\n' +
    '- transferAccount: Destination account for transfers (do not combine with category or subtransactions)\n' +
    '- notes: Additional details\n' +
    '- cleared: true/false (default: false)\n' +
    '- subtransactions: For split transactions\n\n' +
    'EXAMPLES:\n' +
    '- "Add $50 grocery purchase": {"account": "Checking", "date": "2025-01-15", "amount": -50, "payee": "Whole Foods", "category": "Groceries"}\n' +
    '- "Record paycheck": {"account": "Checking", "date": "2025-01-15", "amount": 2000, "payee": "Employer", "category": "Income"}\n' +
    '- "Transfer $200 to savings": {"account": "Checking", "date": "2025-01-15", "amount": -200, "transferAccount": "Savings"}\n' +
    '- "Split transaction": {"account": "Checking", "date": "2025-01-15", "amount": -100, "subtransactions": [{"amount": -60, "category": "Groceries"}, {"amount": -40, "category": "Gas"}]}\n\n' +
    'NOTES:\n' +
    '- Amounts < 1000 treated as dollars (-50 = -$50)\n' +
    '- Negative amounts = expenses, positive = income\n' +
    '- Transfers create the counterpart transaction automatically',
  inputSchema: zodToJsonSchema(CreateTransactionSchema) as ToolInput,
};

export async function handler(args: z.infer<typeof CreateTransactionSchema>): Promise<MCPResponse> {
  try {
    // Validate input
    const validated = CreateTransactionSchema.parse(args);

    // Use TransactionHandler to create transaction
    const transactionHandler = new TransactionHandler();
    const transactionId = await transactionHandler.create(validated as TransactionData);
    transactionHandler.invalidateCache();

    return success(`Successfully created transaction with id ${transactionId}`);
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to create transaction',
    });
  }
}
