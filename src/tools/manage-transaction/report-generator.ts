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
    } else {
      return this.generateUpdateReport(input, result);
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
