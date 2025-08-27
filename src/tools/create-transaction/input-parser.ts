// Parses and validates input arguments for create-transaction tool

import { CreateTransactionInput } from './types.js';

export class CreateTransactionInputParser {
  parse(args: unknown): CreateTransactionInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const argsObj = args as Record<string, unknown>;
    const { accountId, date, amount, payee, category, categoryGroup, notes, cleared } = argsObj;

    // Validate required fields
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('accountId is required and must be a string');
    }

    if (!date || typeof date !== 'string') {
      throw new Error('date is required and must be a string (YYYY-MM-DD)');
    }

    if (amount === undefined || typeof amount !== 'number') {
      throw new Error('amount is required and must be a number');
    }

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

    return {
      accountId,
      date,
      amount,
      payee: typeof payee === 'string' ? payee : undefined,
      category: typeof category === 'string' ? category : undefined,
      categoryGroup: typeof categoryGroup === 'string' ? categoryGroup : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      cleared: typeof cleared === 'boolean' ? cleared : true, // Default to cleared
    };
  }
}
