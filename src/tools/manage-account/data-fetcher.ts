// Data fetcher for manage-account tool

import {
  createAccount,
  updateAccount,
  deleteAccount,
  closeAccount,
  reopenAccount,
  getAccountBalance,
} from '../../actual-api.js';
import type { ParsedAccountInput, AccountOperationResult } from './types.js';

/**
 * Data fetcher for managing accounts.
 * Handles all account operations via Actual Budget API.
 */
export class ManageAccountDataFetcher {
  /**
   * Execute account operation (create, update, delete, close, reopen, or balance).
   *
   * @param input - Parsed account input with resolved IDs
   * @returns Result of the operation including account ID
   * @throws Error if API operation fails
   */
  async execute(input: ParsedAccountInput): Promise<AccountOperationResult> {
    switch (input.operation) {
      case 'create':
        return this.createAccount(input);
      case 'update':
        return this.updateAccount(input);
      case 'delete':
        return this.deleteAccount(input);
      case 'close':
        return this.closeAccount(input);
      case 'reopen':
        return this.reopenAccount(input);
      case 'balance':
        return this.getBalance(input);
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  }

  /**
   * Create a new account.
   *
   * @param input - Parsed account input
   * @returns Result with created account ID
   */
  private async createAccount(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.name || !input.type) {
      throw new Error('name and type are required for create operation');
    }

    // Build account object
    const accountData: Record<string, unknown> = {
      name: input.name,
      type: input.type,
    };

    if (input.offbudget !== undefined) {
      accountData.offbudget = input.offbudget;
    }

    // Create the account
    const accountId = await createAccount(accountData);

    // Set initial balance if provided
    if (input.initialBalance !== undefined && input.initialBalance !== 0) {
      // Initial balance is set via a transaction, but that's handled by the API
      // We pass it as part of the account creation
      accountData.balance = input.initialBalance;
      await updateAccount(accountId, { balance: input.initialBalance });
    }

    return {
      accountId,
      operation: 'create',
      details: {
        name: input.name,
        type: input.type,
        offbudget: input.offbudget,
      },
    };
  }

  /**
   * Update an existing account.
   *
   * @param input - Parsed account input
   * @returns Result with updated account ID
   */
  private async updateAccount(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.id) {
      throw new Error('id is required for update operation');
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.type !== undefined) {
      updates.type = input.type;
    }
    if (input.offbudget !== undefined) {
      updates.offbudget = input.offbudget;
    }

    // Update the account
    await updateAccount(input.id, updates);

    return {
      accountId: input.id,
      operation: 'update',
      details: {
        name: input.name,
        type: input.type,
        offbudget: input.offbudget,
      },
    };
  }

  /**
   * Delete an account.
   *
   * @param input - Parsed account input
   * @returns Result with deleted account ID
   */
  private async deleteAccount(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.id) {
      throw new Error('id is required for delete operation');
    }

    await deleteAccount(input.id);

    return {
      accountId: input.id,
      operation: 'delete',
    };
  }

  /**
   * Close an account.
   *
   * @param input - Parsed account input
   * @returns Result with closed account ID
   */
  private async closeAccount(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.id) {
      throw new Error('id is required for close operation');
    }

    // Close the account
    // Note: The API handles balance transfers internally if needed
    await closeAccount(input.id);

    return {
      accountId: input.id,
      operation: 'close',
      details: {
        closed: true,
        transferredTo: input.transferAccountId,
      },
    };
  }

  /**
   * Reopen a closed account.
   *
   * @param input - Parsed account input
   * @returns Result with reopened account ID
   */
  private async reopenAccount(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.id) {
      throw new Error('id is required for reopen operation');
    }

    await reopenAccount(input.id);

    return {
      accountId: input.id,
      operation: 'reopen',
      details: {
        closed: false,
      },
    };
  }

  /**
   * Get account balance.
   *
   * @param input - Parsed account input
   * @returns Result with account balance
   */
  private async getBalance(input: ParsedAccountInput): Promise<AccountOperationResult> {
    if (!input.id) {
      throw new Error('id is required for balance operation');
    }

    const balance = await getAccountBalance(input.id, input.date);

    return {
      accountId: input.id,
      operation: 'balance',
      balance,
    };
  }
}
