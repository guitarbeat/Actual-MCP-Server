// Input parser for manage-account tool

import type { ManageAccountArgs, ParsedAccountInput, AccountType } from './types.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

const VALID_ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'mortgage', 'debt', 'other'];

/**
 * Parser for manage-account tool arguments.
 * Validates input and resolves entity names to IDs.
 */
export class ManageAccountInputParser {
  /**
   * Parse and validate manage-account arguments.
   * Resolves account and category names to IDs where applicable.
   *
   * @param args - Raw tool arguments
   * @returns Parsed account input with resolved IDs
   * @throws Error if validation fails or required fields are missing
   */
  async parse(args: ManageAccountArgs): Promise<ParsedAccountInput> {
    const { operation, id, account, initialBalance, transferAccountId, transferCategoryId, date } = args;

    // Validate operation
    if (!operation || !['create', 'update', 'delete', 'close', 'reopen', 'balance'].includes(operation)) {
      throw new Error("operation must be 'create', 'update', 'delete', 'close', 'reopen', or 'balance'");
    }

    // Validate id is provided for operations that require it
    if (['update', 'delete', 'close', 'reopen', 'balance'].includes(operation) && !id) {
      throw new Error(`id is required for ${operation} operation`);
    }

    // Handle delete operation
    if (operation === 'delete') {
      return {
        operation: 'delete',
        id,
      };
    }

    // Handle reopen operation
    if (operation === 'reopen') {
      return {
        operation: 'reopen',
        id,
      };
    }

    // Handle balance operation
    if (operation === 'balance') {
      return {
        operation: 'balance',
        id,
        date,
      };
    }

    // Handle close operation
    if (operation === 'close') {
      const parsed: ParsedAccountInput = {
        operation: 'close',
        id,
      };

      // Resolve transfer account if provided
      if (transferAccountId) {
        parsed.transferAccountId = await nameResolver.resolveAccount(transferAccountId);
      }

      // Resolve transfer category if provided
      if (transferCategoryId) {
        parsed.transferCategoryId = await nameResolver.resolveCategory(transferCategoryId);
      }

      return parsed;
    }

    // Handle create and update operations
    if (operation === 'create') {
      // Create requires account name and type
      if (!account?.name) {
        throw new Error('account.name is required for create operation');
      }
      if (!account?.type) {
        throw new Error('account.type is required for create operation');
      }
    }

    // Validate account type if provided
    if (account?.type && !VALID_ACCOUNT_TYPES.includes(account.type)) {
      throw new Error(`Invalid account type '${account.type}'. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`);
    }

    // Build parsed input
    const parsed: ParsedAccountInput = {
      operation,
      id,
    };

    // Copy account fields
    if (account?.name !== undefined) {
      parsed.name = account.name;
    }
    if (account?.type !== undefined) {
      parsed.type = account.type;
    }
    if (account?.offbudget !== undefined) {
      parsed.offbudget = account.offbudget;
    }

    // Copy initialBalance for create operation
    if (operation === 'create' && initialBalance !== undefined) {
      parsed.initialBalance = initialBalance;
    }

    return parsed;
  }
}
