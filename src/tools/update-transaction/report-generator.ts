/**
 * Report generator for update-transaction tool
 * Formats the response message
 */

import type { ParsedUpdateTransactionInput } from './input-parser.js';

export class UpdateTransactionReportGenerator {
  /**
   * Generate a success message for the updated transaction
   *
   * @param input - The parsed input that was used
   * @param transactionId - The ID of the updated transaction
   * @returns Formatted success message
   */
  generate(input: ParsedUpdateTransactionInput, transactionId: string): string {
    const updatedFields: string[] = [];

    if (input.categoryId !== undefined) {
      updatedFields.push('category');
    }
    if (input.payeeId !== undefined) {
      updatedFields.push('payee');
    }
    if (input.notes !== undefined) {
      updatedFields.push('notes');
    }
    if (input.amount !== undefined) {
      updatedFields.push('amount');
    }

    const fieldsText = updatedFields.length > 0 ? ` (updated: ${updatedFields.join(', ')})` : '';

    return `Successfully updated transaction ${transactionId}${fieldsText}`;
  }
}
