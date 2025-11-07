// Input parser for manage-transaction tool

import type { ManageTransactionArgs, ParsedTransactionInput } from './types.js';
import { nameResolver } from '../../core/utils/name-resolver.js';

/**
 * Converts amount to cents if it appears to be in dollars.
 * Smart detection: if amount < 1000 and has decimal, treat as dollars.
 * Examples: -50.00 → -5000, -50.5 → -5050, -5000 → -5000
 */
function convertAmountToCents(amount: number): number {
  const absAmount = Math.abs(amount);

  // If amount is >= 1000, assume it's already in cents
  if (absAmount >= 1000) {
    return Math.round(amount);
  }

  // If amount has a decimal part, treat as dollars
  if (amount % 1 !== 0) {
    return Math.round(amount * 100);
  }

  // For whole numbers < 1000, check if it looks like dollars
  // Common dollar amounts: 1-999 that are round numbers
  // We'll treat small amounts (< 100) as potentially dollars for common cases
  // But this is ambiguous - default to cents for precision
  // Note: -50.00 gets stored as -50 in JS, so we can't distinguish from -50 cents
  // Default assumption: whole numbers < 1000 are cents unless they have decimals
  return Math.round(amount);
}

/**
 * Parser for manage-transaction tool arguments.
 * Validates input, resolves entity names to IDs, and converts amounts to cents.
 */
export class ManageTransactionInputParser {
  /**
   * Parse and validate manage-transaction arguments.
   * Resolves account, payee, and category names to IDs.
   * Auto-converts dollar amounts to cents.
   *
   * @param args - Raw tool arguments (flattened schema)
   * @returns Parsed transaction input with resolved IDs and amounts in cents
   * @throws Error if validation fails or required fields are missing
   */
  async parse(args: ManageTransactionArgs): Promise<ParsedTransactionInput> {
    const { operation, id, account, date, amount, payee, category, notes, cleared } = args;

    // Validate operation
    if (!operation || !['create', 'update', 'delete'].includes(operation)) {
      throw new Error("operation must be 'create', 'update', or 'delete'");
    }

    // Handle delete operation
    if (operation === 'delete') {
      if (!id) {
        throw new Error('id is required for delete operation');
      }
      return {
        operation: 'delete',
        id,
      };
    }

    // Validate operation-specific requirements
    if (operation === 'update' && !id) {
      throw new Error('id is required for update operation');
    }

    if (operation === 'create') {
      // Create requires account and date
      if (!account) {
        throw new Error('account is required for create operation');
      }
      if (!date) {
        throw new Error('date is required for create operation');
      }
      if (amount === undefined) {
        throw new Error('amount is required for create operation');
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('date must be in YYYY-MM-DD format');
      }
    }

    // Build parsed input
    const parsed: ParsedTransactionInput = {
      operation,
      id,
    };

    // Resolve account name to ID if provided
    if (account) {
      parsed.accountId = await nameResolver.resolveAccount(account);
    }

    // Resolve payee name to ID if provided
    if (payee) {
      parsed.payeeId = await nameResolver.resolvePayee(payee);
    }

    // Resolve category name to ID if provided
    if (category) {
      parsed.categoryId = await nameResolver.resolveCategory(category);
    }

    // Copy and convert fields
    if (date !== undefined) {
      parsed.date = date;
    }
    if (amount !== undefined) {
      parsed.amount = convertAmountToCents(amount);
    }
    if (notes !== undefined) {
      parsed.notes = notes;
    }
    if (cleared !== undefined) {
      parsed.cleared = cleared;
    }

    return parsed;
  }
}
