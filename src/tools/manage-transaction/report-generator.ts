// Report generator for manage-transaction tool

import type { ParsedTransactionInput, TransactionOperationResult } from './types.js';

/**
 * Report generator for manage-transaction tool.
 * Formats operation results into human-readable messages.
 */
export class ManageTransactionReportGenerator {
  /**
   * Generate a formatted report for the transaction operation.
   *
   * @param input - Parsed transaction input
   * @param result - Operation result
   * @returns Formatted message describing the operation
   */
  generate(input: ParsedTransactionInput, result: TransactionOperationResult): string {
    if (result.operation === 'create') {
      return this.generateCreateReport(input, result);
    } else if (result.operation === 'update') {
      return this.generateUpdateReport(input, result);
    } else {
      return this.formatDeleteMessage(result);
    }
  }

  /**
   * Generate report for transaction creation.
   *
   * @param input - Parsed transaction input
   * @param result - Operation result
   * @returns Formatted creation message
   */
  private generateCreateReport(input: ParsedTransactionInput, result: TransactionOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Transaction created successfully`);
    parts.push(`Transaction ID: ${result.transactionId}`);

    if (input.date) {
      parts.push(`Date: ${input.date}`);
    }
    if (input.amount !== undefined) {
      const amountStr = this.formatAmount(input.amount);
      parts.push(`Amount: ${amountStr}`);
    }
    if (input.payeeId) {
      parts.push(`Payee: ${input.payeeId}`);
    }
    if (input.categoryId) {
      parts.push(`Category: ${input.categoryId}`);
    }
    if (input.notes) {
      parts.push(`Notes: ${input.notes}`);
    }
    if (input.cleared !== undefined) {
      parts.push(`Cleared: ${input.cleared ? 'Yes' : 'No'}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate report for transaction update.
   *
   * @param input - Parsed transaction input
   * @param result - Operation result
   * @returns Formatted update message
   */
  private generateUpdateReport(input: ParsedTransactionInput, result: TransactionOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Transaction updated successfully`);
    parts.push(`Transaction ID: ${result.transactionId}`);

    const updates: string[] = [];
    if (input.accountId !== undefined) {
      updates.push(`account`);
    }
    if (input.date !== undefined) {
      updates.push(`date`);
    }
    if (input.amount !== undefined) {
      updates.push(`amount`);
    }
    if (input.payeeId !== undefined) {
      updates.push(`payee`);
    }
    if (input.categoryId !== undefined) {
      updates.push(`category`);
    }
    if (input.notes !== undefined) {
      updates.push(`notes`);
    }
    if (input.cleared !== undefined) {
      updates.push(`cleared status`);
    }

    if (updates.length > 0) {
      parts.push(`Updated fields: ${updates.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Format delete confirmation message.
   * Includes transaction details if available.
   *
   * @param result - Operation result
   * @returns Formatted deletion message
   */
  private formatDeleteMessage(result: TransactionOperationResult): string {
    let message = `✓ Deleted transaction ${result.transactionId}`;

    if (result.details) {
      const parts: string[] = [];

      if (result.details.date) {
        parts.push(`Date: ${result.details.date}`);
      }
      if (result.details.amount !== undefined) {
        const dollars = result.details.amount / 100;
        const sign = dollars < 0 ? '-' : '';
        const abs = Math.abs(dollars);
        const formatted = `${sign}$${abs.toFixed(2)}`;
        parts.push(`Amount: ${formatted}`);
      }
      if (result.details.payee) {
        parts.push(`Payee: ${result.details.payee}`);
      }
      if (result.details.account) {
        parts.push(`Account: ${result.details.account}`);
      }

      if (parts.length > 0) {
        message += '\n\nDeleted transaction details:\n' + parts.map((p) => `• ${p}`).join('\n');
      }
    }

    message += '\n\n⚠️  This operation cannot be undone.';

    return message;
  }

  /**
   * Format amount in cents to dollar string.
   *
   * @param cents - Amount in cents
   * @returns Formatted dollar amount
   */
  private formatAmount(cents: number): string {
    const dollars = cents / 100;
    const sign = dollars < 0 ? '-' : '';
    const abs = Math.abs(dollars);
    return `${sign}$${abs.toFixed(2)}`;
  }
}
