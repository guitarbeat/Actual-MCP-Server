import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ImportTransactionBatchDataFetcher } from './data-fetcher.js';
import { ImportTransactionBatchInputParser } from './input-parser.js';
import { ImportTransactionBatchReportGenerator } from './report-generator.js';
import type { ImportAccountResult } from './types.js';
import { ImportTransactionBatchArgsSchema } from './types.js';

export const schema = {
  name: 'import-transaction-batch',
  description:
    'Import a structured batch of transactions into Actual Budget with duplicate detection and rule execution. This keeps the existing bank-sync import tool unchanged while exposing the SDK import pipeline to MCP clients.\n\n' +
    'WHEN TO USE:\n' +
    '- You already have parsed transaction data and want to import it via MCP\n' +
    '- You want duplicate detection using imported_id or Actual reconciliation logic\n' +
    '- You want to preview an import with dryRun before writing data\n\n' +
    'REQUIRED:\n' +
    '- transactions: Array of transactions with accountId, date, and amount in cents\n\n' +
    'OPTIONAL:\n' +
    '- defaultCleared: Default cleared state for imports\n' +
    '- dryRun: Preview without writing\n' +
    '- reimportDeleted: Control whether deleted imports can be re-added\n\n' +
    'NOTES:\n' +
    '- Amounts must be provided in cents\n' +
    '- accountId accepts an account name or ID\n' +
    '- Category learning is limited to Actual rules already configured in the budget\n' +
    '- Remote retries are safest when each transaction includes a stable imported_id',
  inputSchema: zodToJsonSchema(ImportTransactionBatchArgsSchema) as ToolInput,
};

export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = new ImportTransactionBatchInputParser().parse(args);
    const fetcher = new ImportTransactionBatchDataFetcher();
    const batches = await fetcher.prepareBatches(parsed.transactions);
    const accountResults: ImportAccountResult[] = [];

    for (const batch of batches) {
      const preparedCount = batch.transactions.length;
      const failedPreparationCount = batch.preparationFailures.length;

      if (preparedCount === 0) {
        accountResults.push({
          accountId: batch.accountId,
          accountReferences: batch.accountReferences,
          requested: batch.requested,
          prepared: 0,
          added: 0,
          updated: 0,
          failed: failedPreparationCount,
          errors: batch.preparationFailures.map((failure) => failure.error),
        });
        continue;
      }

      try {
        const result = await fetcher.importBatch(batch, {
          defaultCleared: parsed.defaultCleared,
          dryRun: parsed.dryRun,
          reimportDeleted: parsed.reimportDeleted,
        });

        accountResults.push({
          accountId: batch.accountId,
          accountReferences: batch.accountReferences,
          requested: batch.requested,
          prepared: preparedCount,
          added: result.added.length,
          updated: result.updated.length,
          failed: failedPreparationCount,
          errors: batch.preparationFailures.map((failure) => failure.error),
        });
      } catch (error) {
        accountResults.push({
          accountId: batch.accountId,
          accountReferences: batch.accountReferences,
          requested: batch.requested,
          prepared: preparedCount,
          added: 0,
          updated: 0,
          failed: preparedCount + failedPreparationCount,
          errors: [
            ...batch.preparationFailures.map((failure) => failure.error),
            error instanceof Error ? error.message : String(error),
          ],
        });
      }
    }

    return successWithJson(
      new ImportTransactionBatchReportGenerator().generate(
        batches,
        accountResults,
        parsed.dryRun ?? false,
      ),
    );
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to import transaction batch',
      suggestion:
        'Verify that each transaction includes a valid accountId, YYYY-MM-DD date, and amount in cents before retrying.',
    });
  }
}
