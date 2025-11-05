/**
 * Data fetcher for update-transaction tool
 * Handles API calls to update transactions
 */

import api from '@actual-app/api';
import { initActualApi } from '../../actual-api.js';
import type { ParsedUpdateTransactionInput } from './input-parser.js';

export class UpdateTransactionDataFetcher {
  /**
   * Update a transaction in Actual Budget
   *
   * @param input - Parsed and validated input
   * @returns The transaction ID that was updated
   */
  async updateTransaction(input: ParsedUpdateTransactionInput): Promise<string> {
    await initActualApi();

    // Build update object with only provided fields
    const updateData: Record<string, string | number | undefined> = {};

    if (input.categoryId !== undefined) {
      updateData.category = input.categoryId;
    }

    if (input.payeeId !== undefined) {
      updateData.payee = input.payeeId;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.amount !== undefined) {
      updateData.amount = input.amount;
    }

    // Update the transaction using the Actual API
    await api.updateTransaction(input.transactionId, updateData);

    return input.transactionId;
  }
}
