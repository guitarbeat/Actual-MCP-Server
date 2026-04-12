import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { executeToolAction } from '../../shared/tool-action.js';
import { importPreparedTransactionBatch, prepareImportTransactionBatches } from './data-fetcher.js';
import { parseImportTransactionBatchInput } from './input-parser.js';
import { generateImportTransactionBatchReport } from './report-generator.js';
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

export async function handler(args: unknown) {
  return executeToolAction(args, {
    parse: parseImportTransactionBatchInput,
    execute: async (parsed) => {
      const batches = await prepareImportTransactionBatches(parsed.transactions);
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
          const result = await importPreparedTransactionBatch(batch, {
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

      return {
        batches,
        accountResults,
        dryRun: parsed.dryRun ?? false,
      };
    },
    buildResponse: (_parsed, { batches, accountResults, dryRun }) =>
      successWithJson(generateImportTransactionBatchReport(batches, accountResults, dryRun)),
    fallbackMessage: 'Failed to import transaction batch',
    suggestion:
      'Verify that each transaction includes a valid accountId, YYYY-MM-DD date, and amount in cents before retrying.',
  });
}
