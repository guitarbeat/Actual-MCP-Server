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

export async function prepareImportTransactionBatches(
  transactions: ImportedTransaction[],
): Promise<ImportAccountBatch[]> {
  const groupedByAccountReference = new Map<
    string,
    Array<{ index: number; value: ImportedTransaction }>
  >();

  transactions.forEach((transaction, index) => {
    const bucket = groupedByAccountReference.get(transaction.accountId) ?? [];
    bucket.push({ index, value: transaction });
    groupedByAccountReference.set(transaction.accountId, bucket);
  });

  const batchResults = await Promise.all(
    Array.from(groupedByAccountReference.entries()).map(async ([accountReference, entries]) => {
      try {
        const resolvedAccountId = await nameResolver.resolveAccount(accountReference);
        const preparedEntries = await Promise.all(
          entries.map(async ({ index, value }) =>
            prepareImportTransaction(accountReference, index, value),
          ),
        );

        return {
          success: true,
          accountReference,
          resolvedAccountId,
          entries,
          preparedEntries,
        } as const;
      } catch (error) {
        return {
          success: false,
          accountReference,
          entries,
          error: error instanceof Error ? error.message : String(error),
        } as const;
      }
    }),
  );

  const batchesByAccountId = new Map<string, ImportAccountBatch>();

  for (const result of batchResults) {
    if (result.success) {
      const { accountReference, resolvedAccountId, entries, preparedEntries } = result;
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
    } else {
      const { accountReference, entries, error } = result;
      const failedBatch: ImportAccountBatch = {
        accountId: accountReference,
        accountReferences: [accountReference],
        requested: entries.length,
        transactions: [],
        preparationFailures: entries.map(({ index }) => ({
          accountReference,
          transactionIndex: index,
          error,
        })),
      };
      batchesByAccountId.set(`failed:${accountReference}`, failedBatch);
    }
  }

  return Array.from(batchesByAccountId.values());
}

export async function importPreparedTransactionBatch(
  batch: ImportAccountBatch,
  options: ImportOptions,
): Promise<{ added: string[]; updated: string[] }> {
  return importTransactions(batch.accountId, batch.transactions, options);
}

async function prepareImportTransaction(
  accountReference: string,
  transactionIndex: number,
  transaction: ImportedTransaction,
): Promise<PreparedTransactionResult> {
  try {
    const preparedPayee =
      transaction.payee !== undefined
        ? await nameResolver.resolvePayee(transaction.payee)
        : undefined;
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
