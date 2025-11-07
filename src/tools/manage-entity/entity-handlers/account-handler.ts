// ----------------------------
// ACCOUNT ENTITY HANDLER
// ----------------------------

import {
  createAccount,
  updateAccount,
  deleteAccount,
  closeAccount,
  reopenAccount,
  getAccountBalance,
} from '../../../actual-api.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import type { EntityHandler, Operation } from './base-handler.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

/**
 * Account type enum
 */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'mortgage' | 'debt' | 'other';

/**
 * Account data structure for manage-entity tool
 */
export interface AccountData {
  name?: string;
  type?: AccountType;
  offbudget?: boolean;
  initialBalance?: number; // For create operation only, in cents
}

/**
 * Close account data structure
 */
export interface CloseAccountData {
  transferAccountId?: string;
  transferCategoryId?: string;
}

/**
 * Handler for account entity operations
 * Implements create, update, delete, close, reopen, and balance operations for accounts
 */
export class AccountHandler implements EntityHandler<AccountData, AccountData> {
  /**
   * Create a new account
   * @param data - Account creation data
   * @returns The ID of the created account
   */
  async create(data: AccountData): Promise<string> {
    if (!data.name) {
      throw new Error('name is required for create operation');
    }
    if (!data.type) {
      throw new Error('type is required for create operation');
    }

    // Validate account type
    const validTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'];
    if (!validTypes.includes(data.type)) {
      throw new Error(`Invalid account type '${data.type}'. Must be one of: ${validTypes.join(', ')}`);
    }

    // Build account object
    const accountData: Record<string, unknown> = {
      name: data.name,
      type: data.type,
    };

    if (data.offbudget !== undefined) {
      accountData.offbudget = data.offbudget;
    }

    // Create the account
    const accountId = await createAccount(accountData);

    // Set initial balance if provided
    if (data.initialBalance !== undefined && data.initialBalance !== 0) {
      // Note: Initial balance handling may vary by API implementation
      // This is a placeholder - actual implementation depends on API
      await updateAccount(accountId, { balance: data.initialBalance });
    }

    return accountId;
  }

  /**
   * Update an existing account
   * @param id - The account ID
   * @param data - Account update data
   */
  async update(id: string, data: AccountData): Promise<void> {
    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.type !== undefined) {
      // Validate account type if provided
      const validTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'];
      if (!validTypes.includes(data.type)) {
        throw new Error(`Invalid account type '${data.type}'. Must be one of: ${validTypes.join(', ')}`);
      }
      updates.type = data.type;
    }
    if (data.offbudget !== undefined) {
      updates.offbudget = data.offbudget;
    }

    // Update the account
    await updateAccount(id, updates);
  }

  /**
   * Delete an account
   * @param id - The account ID
   */
  async delete(id: string): Promise<void> {
    await deleteAccount(id);
  }

  /**
   * Close an account (keeps history)
   * @param id - The account ID
   * @param data - Optional close account data with transfer information
   * Note: Transfer support may be handled by the API internally
   */
  async close(id: string, _data?: CloseAccountData): Promise<void> {
    // Note: The API may handle balance transfers internally
    // The current API wrapper doesn't expose transferAccountId parameter
    // but we accept it in the data structure for future compatibility
    await closeAccount(id);
  }

  /**
   * Reopen a closed account
   * @param id - The account ID
   */
  async reopen(id: string): Promise<void> {
    await reopenAccount(id);
  }

  /**
   * Query account balance
   * @param id - The account ID
   * @param date - Optional date for balance query (YYYY-MM-DD format)
   * @returns Account balance in cents
   */
  async balance(id: string, date?: string): Promise<number> {
    return getAccountBalance(id, date);
  }

  /**
   * Validate operation requirements
   * @param operation - The operation to validate
   * @param id - The entity ID (required for update/delete/close/reopen/balance)
   * @param data - The entity data (required for create/update)
   */
  validate(operation: Operation, id?: string, data?: unknown): void {
    // Extended operations don't require data
    if (['close', 'reopen', 'balance'].includes(operation)) {
      if (!id) {
        throw EntityErrorBuilder.missingParameter(operation, 'id');
      }
      return;
    }

    // Standard CRUD operations
    if (operation !== 'create' && !id) {
      throw EntityErrorBuilder.missingParameter(operation, 'id');
    }
    if (operation !== 'delete' && !data) {
      throw EntityErrorBuilder.missingParameter(operation, 'data');
    }

    // Additional validation for create operation
    if (operation === 'create') {
      const accountData = data as AccountData;
      if (!accountData.name) {
        throw new Error('name is required for create operation');
      }
      if (!accountData.type) {
        throw new Error('type is required for create operation');
      }
    }
  }

  invalidateCache(): void {
    cacheService.invalidate('accounts:all');
  }
}
