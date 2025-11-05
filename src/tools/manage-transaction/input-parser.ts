// Input parser for manage-transaction tool

import type { ManageTransactionArgs, ParsedTransactionInput } from './types.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

/**
 * Parser for manage-transaction tool arguments.
 * Validates input and resolves entity names to IDs.
 */
export class ManageTransactionInputParser {
  /**
   * Parse and validate manage-transaction arguments.
   * Resolves account, payee, and category names to IDs.
   *
   * @param args - Raw tool arguments
   * @returns Parsed transaction input with resolved IDs
   * @throws Error if validation fails or required fields are missing
   */
  async parse(args: ManageTransactionArgs): Promise<ParsedTransactionInput> {
    const { operation, id, transaction } = args;

    // Validate operation
    if (!operation || !['create', 'update'].includes(operation)) {
      throw new Error("operation must be 'create' or 'update'");
    }

    // Validate operation-specific requirements
    if (operation === 'update' && !id) {
      throw new Error('id is required for update operation');
    }

    if (operation === 'create') {
      // Create requires account and date
      if (!transaction.account) {
        throw new Error('transaction.account is required for create operation');
      }
      if (!transaction.date) {
        throw new Error('transaction.date is required for create operation');
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        throw new Error('transaction.date must be in YYYY-MM-DD format');
      }
    }

    // Build parsed input
    const parsed: ParsedTransactionInput = {
      operation,
      id,
    };

    // Resolve account name to ID if provided
    if (transaction.account) {
      parsed.accountId = await nameResolver.resolveAccount(transaction.account);
    }

    // Resolve payee name to ID if provided
    if (transaction.payee) {
      parsed.payeeId = await nameResolver.resolvePayee(transaction.payee);
    }

    // Resolve category name to ID if provided
    if (transaction.category) {
      parsed.categoryId = await nameResolver.resolveCategory(transaction.category);
    }

    // Copy other fields
    if (transaction.date !== undefined) {
      parsed.date = transaction.date;
    }
    if (transaction.amount !== undefined) {
      parsed.amount = transaction.amount;
    }
    if (transaction.notes !== undefined) {
      parsed.notes = transaction.notes;
    }
    if (transaction.cleared !== undefined) {
      parsed.cleared = transaction.cleared;
    }

    return parsed;
  }
}
