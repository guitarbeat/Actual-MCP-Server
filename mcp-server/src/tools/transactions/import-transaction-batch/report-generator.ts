import type { ImportAccountBatch, ImportAccountResult, ImportBatchReport } from './types.js';

export function generateImportTransactionBatchReport(
  batches: ImportAccountBatch[],
  accountResults: ImportAccountResult[],
  dryRun: boolean,
): ImportBatchReport {
  const failures = batches.flatMap((batch) => batch.preparationFailures);
  const summary = accountResults.reduce(
    (accumulator, result) => ({
      requestedTransactions: accumulator.requestedTransactions + result.requested,
      preparedTransactions: accumulator.preparedTransactions + result.prepared,
      addedTransactions: accumulator.addedTransactions + result.added,
      updatedTransactions: accumulator.updatedTransactions + result.updated,
      failedTransactions: accumulator.failedTransactions + result.failed,
      affectedAccounts: accumulator.affectedAccounts + 1,
    }),
    {
      requestedTransactions: 0,
      preparedTransactions: 0,
      addedTransactions: 0,
      updatedTransactions: 0,
      failedTransactions: 0,
      affectedAccounts: 0,
    },
  );

  return {
    dryRun,
    summary,
    accounts: accountResults,
    failures,
  };
}
