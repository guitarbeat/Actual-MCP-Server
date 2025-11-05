// Data fetcher for manage-transaction tool

import actualApi from '@actual-app/api';
import { importTransactions, initActualApi } from '../../actual-api.js';
import type { ParsedTransactionInput, TransactionOperationResult } from './types.js';

/**
 * Data fetcher for managing transactions.
 * Handles create and update operations via Actual Budget API.
 */
export class ManageTransactionDataFetcher {
  /**
   * Execute transaction operation (create or update).
   *
   * @param input - Parsed transaction input with resolved IDs
   * @returns Result of the operation including transaction ID
   * @throws Error if API operation fails
   */
  async execute(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
    if (input.operation === 'create') {
      return this.createTransaction(input);
    } else {
      return this.updateTransaction(input);
    }
  }

  /**
   * Create a new transaction using importTransactions for better duplicate detection.
   *
   * @param input - Parsed transaction input
   * @returns Result with created transaction ID
   */
  private async createTransaction(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
    if (!input.accountId || !input.date) {
      throw new Error('accountId and date are required for create operation');
    }

    // Build transaction object for importTransactions
    const transaction = {
      date: input.date,
      amount: input.amount ?? 0,
      payee: input.payeeId || null,
      category: input.categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared ?? true,
      imported_id: `manual-${input.accountId}-${input.date}-${input.amount ?? 0}-${Date.now()}`,
    };

    // Import the transaction (this will run rules, detect duplicates, etc.)
    const importResult = await importTransactions(input.accountId, [transaction]);

    // Get the transaction ID from the result
    const transactionId = importResult.added[0] || importResult.updated[0];

    if (!transactionId) {
      throw new Error('Failed to create transaction');
    }

    return {
      transactionId,
      operation: 'create',
    };
  }

  /**
   * Update an existing transaction.
   *
   * @param input - Parsed transaction input
   * @returns Result with updated transaction ID
   */
  private async updateTransaction(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
    if (!input.id) {
      throw new Error('id is required for update operation');
    }

    await initActualApi();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (input.accountId !== undefined) {
      updates.account = input.accountId;
    }
    if (input.date !== undefined) {
      updates.date = input.date;
    }
    if (input.amount !== undefined) {
      updates.amount = input.amount;
    }
    if (input.payeeId !== undefined) {
      updates.payee = input.payeeId;
    }
    if (input.categoryId !== undefined) {
      updates.category = input.categoryId;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes;
    }
    if (input.cleared !== undefined) {
      updates.cleared = input.cleared;
    }

    // Update transaction via API
    await actualApi.updateTransaction(input.id, updates);

    return {
      transactionId: input.id,
      operation: 'update',
    };
  }
}
