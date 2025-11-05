// Report generator for manage-account tool

import type { ParsedAccountInput, AccountOperationResult } from './types.js';

/**
 * Report generator for manage-account tool.
 * Formats operation results into human-readable messages.
 */
export class ManageAccountReportGenerator {
  /**
   * Generate a formatted report for the account operation.
   *
   * @param input - Parsed account input
   * @param result - Operation result
   * @returns Formatted message describing the operation
   */
  generate(input: ParsedAccountInput, result: AccountOperationResult): string {
    switch (result.operation) {
      case 'create':
        return this.formatCreateMessage(input, result);
      case 'update':
        return this.formatUpdateMessage(input, result);
      case 'delete':
        return this.formatDeleteMessage(result);
      case 'close':
        return this.formatCloseMessage(result);
      case 'reopen':
        return this.formatReopenMessage(result);
      case 'balance':
        return this.formatBalanceMessage(result);
      default:
        return `✓ Operation completed for account ${result.accountId}`;
    }
  }

  /**
   * Format create confirmation message with account details.
   *
   * @param input - Parsed account input
   * @param result - Operation result
   * @returns Formatted creation message
   */
  private formatCreateMessage(input: ParsedAccountInput, result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Account created successfully`);
    parts.push(`Account ID: ${result.accountId}`);

    if (result.details?.name) {
      parts.push(`Name: ${result.details.name}`);
    }
    if (result.details?.type) {
      parts.push(`Type: ${result.details.type}`);
    }
    if (result.details?.offbudget !== undefined) {
      parts.push(`Off-budget: ${result.details.offbudget ? 'Yes' : 'No'}`);
    }
    if (input.initialBalance !== undefined) {
      const balanceStr = this.formatAmount(input.initialBalance);
      parts.push(`Initial Balance: ${balanceStr}`);
    }

    return parts.join('\n');
  }

  /**
   * Format update confirmation message with updated fields.
   *
   * @param input - Parsed account input
   * @param result - Operation result
   * @returns Formatted update message
   */
  private formatUpdateMessage(input: ParsedAccountInput, result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Account updated successfully`);
    parts.push(`Account ID: ${result.accountId}`);

    const updates: string[] = [];
    if (input.name !== undefined) {
      updates.push(`name`);
    }
    if (input.type !== undefined) {
      updates.push(`type`);
    }
    if (input.offbudget !== undefined) {
      updates.push(`off-budget status`);
    }

    if (updates.length > 0) {
      parts.push(`Updated fields: ${updates.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Format delete confirmation message with warning.
   *
   * @param result - Operation result
   * @returns Formatted deletion message
   */
  private formatDeleteMessage(result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Account deleted successfully`);
    parts.push(`Account ID: ${result.accountId}`);
    parts.push('');
    parts.push('⚠️  This operation cannot be undone.');
    parts.push('⚠️  All transactions in this account have been deleted.');

    return parts.join('\n');
  }

  /**
   * Format close confirmation message with transfer details if applicable.
   *
   * @param result - Operation result
   * @returns Formatted close message
   */
  private formatCloseMessage(result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Account closed successfully`);
    parts.push(`Account ID: ${result.accountId}`);

    if (result.details?.transferredTo) {
      parts.push('');
      parts.push(`Balance transferred to account: ${result.details.transferredTo}`);
    }

    parts.push('');
    parts.push('The account is now closed and will not appear in active account lists.');
    parts.push('You can reopen it later if needed using the "reopen" operation.');

    return parts.join('\n');
  }

  /**
   * Format reopen confirmation message.
   *
   * @param result - Operation result
   * @returns Formatted reopen message
   */
  private formatReopenMessage(result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`✓ Account reopened successfully`);
    parts.push(`Account ID: ${result.accountId}`);
    parts.push('');
    parts.push('The account is now active and will appear in account lists.');

    return parts.join('\n');
  }

  /**
   * Format balance query result.
   *
   * @param result - Operation result
   * @returns Formatted balance message
   */
  private formatBalanceMessage(result: AccountOperationResult): string {
    const parts: string[] = [];

    parts.push(`Account Balance`);
    parts.push(`Account ID: ${result.accountId}`);

    if (result.balance !== undefined) {
      const balanceStr = this.formatAmount(result.balance);
      parts.push(`Balance: ${balanceStr}`);
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
