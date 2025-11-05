/**
 * Input parser for update-transaction tool
 * Validates and transforms input arguments
 */

import { assertUuid, assertPositiveIntegerCents } from '../../utils/validators.js';
import type { UpdateTransactionArgs } from '../../core/types/index.js';

export interface ParsedUpdateTransactionInput {
  transactionId: string;
  categoryId?: string;
  payeeId?: string;
  notes?: string;
  amount?: number;
}

export class UpdateTransactionInputParser {
  /**
   * Parse and validate update transaction arguments
   *
   * @param args - Raw input arguments
   * @returns Validated and parsed input
   */
  parse(args: UpdateTransactionArgs): ParsedUpdateTransactionInput {
    const { transactionId, categoryId, payeeId, notes, amount } = args;

    // Validate transaction ID (required)
    const validTransactionId = assertUuid(transactionId, 'transactionId');

    // Build parsed input with only provided fields
    const parsed: ParsedUpdateTransactionInput = {
      transactionId: validTransactionId,
    };

    // Validate optional fields
    if (categoryId !== undefined) {
      parsed.categoryId = assertUuid(categoryId, 'categoryId');
    }

    if (payeeId !== undefined) {
      parsed.payeeId = assertUuid(payeeId, 'payeeId');
    }

    if (notes !== undefined) {
      parsed.notes = notes;
    }

    if (amount !== undefined) {
      parsed.amount = assertPositiveIntegerCents(amount, 'amount');
    }

    return parsed;
  }
}
