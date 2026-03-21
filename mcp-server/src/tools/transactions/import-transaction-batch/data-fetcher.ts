import { importTransactions } from '../../../core/api/actual-client.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';
import type {
  ImportAccountBatch,
  ImportPreparationFailure,
  ImportedTransaction,
  PreparedImportedTransaction,
} from './types.js';

interface ImportOptions {
  defaultCleared?: boolean;
  dryRun?: boolean;
  reimportDeleted?: boolean;
}

interface PreparedTransactionResult {
  transaction?: PreparedImportedTransaction;
  failure?: ImportPreparationFailure;
}

export class ImportTransactionBatchDataFetcher {
  async prepareBatches(transactions: ImportedTransaction[]): Promise<ImportAccountBatch[]> {
    const groupedByAccountReference = new Map<string, Array<{ index: number; value: ImportedTransaction }>>();

    transactions.forEach((transaction, index) => {
      const bucket = groupedByAccountReference.get(transaction.accountId) ?? [];
      bucket.push({ index, value: transaction });
      groupedByAccountReference.set(transaction.accountId, bucket);
    });

    const batchesByAccountId = new Map<string, ImportAccountBatch>();

    for (const [accountReference, entries] of groupedByAccountReference.entries()) {
      try {
        const resolvedAccountId = await nameResolver.resolveAccount(accountReference);
        const preparedEntries = await Promise.all(
          entries.map(async ({ index, value }) => this.prepareTransaction(accountReference, index, value)),
        );

        const existingBatch = batchesByAccountId.get(resolvedAccountId) ?? {
          accountId: resolvedAccountId,
          accountReferences: [],
          requested: 0,
          transactions: [],
          preparationFailures: [],
        };

        if (!existingBatch.accountReferences.includes(accountReference)) {
          existingBatch.accountReferences.push(accountReference);
        }

        existingBatch.requested += entries.length;

        for (const preparedEntry of preparedEntries) {
          if (preparedEntry.transaction) {
            existingBatch.transactions.push(preparedEntry.transaction);
          }
          if (preparedEntry.failure) {
            existingBatch.preparationFailures.push(preparedEntry.failure);
          }
        }

        batchesByAccountId.set(resolvedAccountId, existingBatch);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const failedBatch: ImportAccountBatch = {
          accountId: accountReference,
          accountReferences: [accountReference],
          requested: entries.length,
          transactions: [],
          preparationFailures: entries.map(({ index }) => ({
            accountReference,
            transactionIndex: index,
            error: errorMessage,
          })),
        };
        batchesByAccountId.set(`failed:${accountReference}`, failedBatch);
      }
    }

    return Array.from(batchesByAccountId.values());
  }

  async importBatch(
    batch: ImportAccountBatch,
    options: ImportOptions,
  ): Promise<{ added: string[]; updated: string[] }> {
    return importTransactions(batch.accountId, batch.transactions, options);
  }

  private async prepareTransaction(
    accountReference: string,
    transactionIndex: number,
    transaction: ImportedTransaction,
  ): Promise<PreparedTransactionResult> {
    try {
      const preparedPayee =
        transaction.payee !== undefined ? await nameResolver.resolvePayee(transaction.payee) : undefined;
      const preparedSubtransactions = transaction.subtransactions
        ? await Promise.all(
            transaction.subtransactions.map(async (subtransaction) => ({
              amount: subtransaction.amount,
              category:
                subtransaction.category !== undefined
                  ? await nameResolver.resolveCategory(subtransaction.category)
                  : undefined,
              notes: subtransaction.notes,
            })),
          )
        : undefined;

      return {
        transaction: {
          date: transaction.date,
          amount: transaction.amount,
          payee: preparedPayee,
          payee_name: transaction.payee_name,
          imported_payee: transaction.imported_payee,
          notes: transaction.notes,
          imported_id: transaction.imported_id,
          cleared: transaction.cleared,
          subtransactions: preparedSubtransactions,
        },
      };
    } catch (error) {
      return {
        failure: {
          accountReference,
          transactionIndex,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
