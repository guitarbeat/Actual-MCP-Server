import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorFromCatch, successWithJson } from '../../../core/response/index.js';
import type { ToolInput } from '../../../core/types/index.js';
import { ReconcileAccountDataFetcher } from './data-fetcher.js';
import { ReconcileAccountInputParser } from './input-parser.js';
import { ReconcileAccountReportGenerator } from './report-generator.js';
import { ReconcileAccountArgsSchema } from './types.js';

export const schema = {
  name: 'reconcile-account',
  description:
    'Compare an account against a statement balance, identify uncleared transactions, and optionally mark eligible transactions as cleared.\n\n' +
    'WHEN TO USE:\n' +
    '- You want to reconcile a checking, savings, or credit account to a statement\n' +
    '- You need to see whether uncleared transactions explain a balance mismatch\n' +
    '- You want to clear all eligible transactions through a statement date when the account matches\n\n' +
    'REQUIRED:\n' +
    '- account: Account name or ID\n' +
    '- statementBalance: Statement balance in dollars (for example 1234.56)\n' +
    '- statementDate: Statement date in YYYY-MM-DD format\n\n' +
    'OPTIONAL:\n' +
    '- forceClear: Clear eligible transactions even if the balance is off\n\n' +
    'NOTES:\n' +
    '- V1 only manages the cleared state; it does not create a separate locked/reconciled marker',
  inputSchema: zodToJsonSchema(ReconcileAccountArgsSchema) as ToolInput,
};

export async function handler(
  args: unknown,
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = new ReconcileAccountInputParser().parse(args);
    const fetcher = new ReconcileAccountDataFetcher();
    const snapshot = await fetcher.fetchSnapshot(
      parsed.account,
      parsed.statementDate,
      parsed.statementBalanceCents,
    );

    let transactionsCleared = 0;

    if (snapshot.differenceCents === 0 || parsed.forceClear) {
      transactionsCleared = await fetcher.clearTransactions(snapshot.eligibleTransactions);
    }

    return successWithJson(
      new ReconcileAccountReportGenerator().generate(
        snapshot,
        transactionsCleared,
        parsed.forceClear,
      ),
    );
  } catch (error) {
    return errorFromCatch(error, {
      fallbackMessage: 'Failed to reconcile account',
      suggestion:
        'Verify the account reference, statement date, and statement balance before retrying.',
    });
  }
}
