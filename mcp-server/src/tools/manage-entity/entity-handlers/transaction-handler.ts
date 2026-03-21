// ----------------------------
// TRANSACTION ENTITY HANDLER
// ----------------------------

import { createHash } from 'node:crypto';
import {
  addTransactions,
  deleteTransaction,
  getTransactions,
  importTransactions,
  updateTransaction,
} from '../../../core/api/actual-client.js';
import { cacheService } from '../../../core/cache/cache-service.js';
import { fetchAllPayees } from '../../../core/data/fetch-payees.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';
import type { EntityHandler, Operation } from './base-handler.js';

/**
 * Transaction data structure for manage-entity tool
 * Supports flattened schema with name resolution
 */
export interface TransactionData {
  account?: string; // Name or ID
  date?: string; // YYYY-MM-DD format
  amount?: number; // Dollars or cents (auto-detected)
  payee?: string; // Name or ID
  category?: string; // Name or ID
  transferAccount?: string; // Destination account name or ID for transfers
  notes?: string;
  cleared?: boolean;
  idempotencyKey?: string;
  subtransactions?: Array<{
    amount: number;
    category?: string;
    notes?: string;
  }>;
}

/**
 * Normalized transaction data with resolved IDs and amounts in cents
 */
interface NormalizedTransactionData {
  accountId: string;
  date: string;
  amount: number; // Always in cents
  payeeId?: string | null;
  categoryId?: string | null;
  transferAccountId?: string | null;
  notes?: string;
  cleared?: boolean;
  idempotencyKey?: string;
  subtransactions?: Array<{
    amount: number;
    categoryId?: string | null;
    notes?: string;
  }>;
}

function buildImportedId(
  normalized: Pick<NormalizedTransactionData, 'accountId' | 'date' | 'amount'>,
  idempotencyKey?: string,
): string {
  if (!idempotencyKey) {
    return `manual-${normalized.accountId}-${normalized.date}-${normalized.amount}-${Date.now()}`;
  }

  const digest = createHash('sha256')
    .update(`${normalized.accountId}:${normalized.date}:${normalized.amount}:${idempotencyKey}`)
    .digest('hex')
    .slice(0, 24);

  return `manual-${digest}`;
}

/**
 * Converts amount to cents if it appears to be in dollars.
 * Smart detection: amounts < 1000 are treated as dollars (multiply by 100).
 * Amounts >= 1000 are assumed to already be in cents.
 * Examples: -50 → -5000, -50.00 → -5000, -50.5 → -5050, -5000 → -5000
 */
function convertAmountToCents(amount: number): number {
  const absAmount = Math.abs(amount);

  // If amount is >= 1000, assume it's already in cents
  if (absAmount >= 1000) {
    return Math.round(amount);
  }

  // For amounts < 1000, treat as dollars (multiply by 100)
  // This handles both whole numbers (e.g., -30 → -3000) and decimals (e.g., -30.50 → -3050)
  return Math.round(amount * 100);
}

async function resolveTransferPayeeId(destinationAccountId: string): Promise<string> {
  const payees = await fetchAllPayees();
  const transferPayee = payees.find((payee) => payee.transfer_acct === destinationAccountId);

  if (!transferPayee) {
    throw new Error(
      `No transfer payee found for account '${destinationAccountId}'. Ensure the destination account exists.`,
    );
  }

  return transferPayee.id;
}

/**
 * Handler for transaction entity operations
 * Implements create, update, and delete operations for transactions
 * with name resolution and amount conversion support
 */
export class TransactionHandler implements EntityHandler<TransactionData, TransactionData> {
  /**
   * Normalize transaction data: resolve names to IDs and convert amounts to cents
   */
  private async normalizeData(
    data: TransactionData,
    isCreate: boolean,
  ): Promise<NormalizedTransactionData> {
    if (isCreate) {
      this.validateCreateData(data);
    }

    const normalized: NormalizedTransactionData = {
      accountId: await nameResolver.resolveAccount(data.account || ''),
      date: data.date || '',
      amount: data.amount !== undefined ? convertAmountToCents(data.amount) : 0,
      payeeId: data.payee ? await nameResolver.resolvePayee(data.payee) : null,
      categoryId: data.category ? await nameResolver.resolveCategory(data.category) : null,
      transferAccountId: data.transferAccount
        ? await nameResolver.resolveAccount(data.transferAccount)
        : null,
      notes: data.notes,
      cleared: data.cleared,
      idempotencyKey: data.idempotencyKey,
    };

    if (data.subtransactions && data.subtransactions.length > 0) {
      normalized.subtransactions = await this.normalizeSubtransactions(data.subtransactions);
    }

    return normalized;
  }

  private validateCreateData(data: TransactionData): void {
    if (!data.account) throw new Error('account is required for create operation');
    if (!data.date) throw new Error('date is required for create operation');
    if (data.amount === undefined) throw new Error('amount is required for create operation');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('date must be in YYYY-MM-DD format');
    }

    if (data.transferAccount && data.category) {
      throw new Error('category cannot be set when transferAccount is provided');
    }

    if (data.transferAccount && data.subtransactions?.length) {
      throw new Error('subtransactions are not supported when transferAccount is provided');
    }
  }

  private async normalizeSubtransactions(
    subtransactions: TransactionData['subtransactions'],
  ): Promise<Array<{ amount: number; categoryId: string | null; notes?: string }>> {
    if (!subtransactions) return [];

    return Promise.all(
      subtransactions.map(async (sub) => ({
        amount: convertAmountToCents(sub.amount),
        categoryId: sub.category ? await nameResolver.resolveCategory(sub.category) : null,
        notes: sub.notes,
      })),
    );
  }

  /**
   * Create a new transaction
   * @param data - Transaction creation data
   * @returns The ID of the created transaction
   */
  async create(data: TransactionData): Promise<string> {
    const normalized = await this.normalizeData(data, true);
    const importedId = buildImportedId(normalized, normalized.idempotencyKey);

    // Build transaction object for importTransactions
    const transaction = {
      date: normalized.date,
      amount: normalized.amount,
      payee: normalized.payeeId,
      category: normalized.categoryId,
      notes: normalized.notes || '',
      cleared: normalized.cleared ?? false,
      imported_id: importedId,
      subtransactions: normalized.subtransactions?.map((sub) => ({
        amount: sub.amount,
        category: sub.categoryId,
        notes: sub.notes,
      })),
    };

    if (normalized.transferAccountId) {
      const transferPayeeId = await resolveTransferPayeeId(normalized.transferAccountId);

      await addTransactions(
        normalized.accountId,
        [
          {
            date: normalized.date,
            amount: normalized.amount,
            payee: transferPayeeId,
            notes: normalized.notes || '',
            cleared: normalized.cleared ?? false,
            imported_id: importedId,
          },
        ],
        { runTransfers: true },
      );

      const createdTransactions = await getTransactions(
        normalized.accountId,
        normalized.date,
        normalized.date,
      );
      const createdTransaction = createdTransactions.find(
        (candidate) => candidate.imported_id === importedId,
      );

      if (!createdTransaction) {
        throw new Error('Failed to create transfer transaction');
      }

      return createdTransaction.id;
    }

    // Import the transaction (this will run rules, detect duplicates, etc.)
    const importResult = await importTransactions(normalized.accountId, [transaction]);

    if (importResult.errors?.length) {
      const errorMessages = importResult.errors
        .map((err: { message: string }) => err.message)
        .join('; ');
      throw new Error(`Failed to create transaction: ${errorMessages}`);
    }

    // Get the transaction ID from the result
    const transactionId = importResult.added[0] || importResult.updated[0];

    if (!transactionId) {
      throw new Error('Failed to create transaction');
    }

    return transactionId;
  }

  /**
   * Update an existing transaction
   * @param id - The transaction ID
   * @param data - Transaction update data
   */
  async update(id: string, data: TransactionData): Promise<void> {
    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    // If account is provided, resolve it
    if (data.account !== undefined) {
      updates.account = await nameResolver.resolveAccount(data.account);
    }

    // If date is provided, validate and use it
    if (data.date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new Error('date must be in YYYY-MM-DD format');
      }
      updates.date = data.date;
    }

    // If amount is provided, convert to cents
    if (data.amount !== undefined) {
      updates.amount = convertAmountToCents(data.amount);
    }

    // If payee is provided, resolve it
    if (data.payee !== undefined) {
      if (data.payee) {
        updates.payee = await nameResolver.resolvePayee(data.payee);
      } else {
        updates.payee = null;
      }
    }

    // If category is provided, resolve it
    if (data.category !== undefined) {
      if (data.category) {
        updates.category = await nameResolver.resolveCategory(data.category);
      } else {
        updates.category = null;
      }
    }

    // Copy optional fields
    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }
    if (data.cleared !== undefined) {
      updates.cleared = data.cleared;
    }

    // Update transaction via API wrapper
    await updateTransaction(id, updates);
  }

  /**
   * Delete a transaction
   * @param id - The transaction ID
   */
  async delete(id: string): Promise<void> {
    await deleteTransaction(id);
  }

  /**
   * Validate operation requirements
   * @param operation - The operation to validate
   * @param id - The entity ID (required for update/delete)
   * @param data - The entity data (required for create/update)
   */
  validate(operation: Operation, id?: string, data?: unknown): void {
    if (operation !== 'create' && !id) {
      throw EntityErrorBuilder.missingParameter(operation, 'id');
    }
    if (operation !== 'delete' && !data) {
      throw EntityErrorBuilder.missingParameter(operation, 'data');
    }

    // Additional validation for create operation
    if (operation === 'create') {
      const transactionData = data as TransactionData;
      if (!transactionData.account) {
        throw new Error('account is required for create operation');
      }
      if (!transactionData.date) {
        throw new Error('date is required for create operation');
      }
      if (transactionData.amount === undefined) {
        throw new Error('amount is required for create operation');
      }
    }
  }

  invalidateCache(): void {
    cacheService.invalidatePattern('transactions:*');
    cacheService.invalidate('accounts:all');
  }
}
