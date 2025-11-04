// Parses and validates input arguments for create-transaction tool

import { CreateTransactionInput, CreateTransactionParseResult } from './types.js';
import { assertPositiveIntegerCents, assertUuid } from '../../utils/validators.js';

export class CreateTransactionInputParser {
  parse(args: unknown): CreateTransactionParseResult {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const argsObj = args as Record<string, unknown>;
    const { accountId, date, amount, payee, category, categoryGroup, notes, cleared } = argsObj;
    const warnings: string[] = [];

    // Validate required fields
    const validAccountId = assertUuid(accountId, 'accountId');

    if (!date || typeof date !== 'string') {
      throw new Error('date is required and must be a string (YYYY-MM-DD)');
    }

    const validAmount = assertPositiveIntegerCents(amount, 'amount');

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('date must be in YYYY-MM-DD format');
    }

    // Both category and categoryGroup cannot be specified
    if (category && categoryGroup) {
      throw new Error(
        'Cannot specify both category and categoryGroup. Use category for existing categories or categoryGroup to create new ones.'
      );
    }

    const parsedInput: CreateTransactionInput = {
      accountId: validAccountId,
      date,
      amount: validAmount,
      payee: typeof payee === 'string' ? payee : undefined,
      category: typeof category === 'string' ? category : undefined,
      categoryGroup: typeof categoryGroup === 'string' ? categoryGroup : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      cleared: typeof cleared === 'boolean' ? cleared : true, // Default to cleared
    };

    // Check for unusually small amounts and add warning
    if (validAmount !== 0 && Math.abs(validAmount) < 5) {
      const displayAmount = (Math.abs(validAmount) / 100).toFixed(2);
      const formattedAmount = validAmount < 0 ? `-$${displayAmount}` : `$${displayAmount}`;
      warnings.push(`Amount ${formattedAmount} is unusually small; please confirm the cents value.`);
    }

    return {
      input: parsedInput,
      warnings,
    };
  }
}
