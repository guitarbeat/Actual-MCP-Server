import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { updateTransaction } from '../src/core/api/actual-client.js';
import { fetchAllAccounts } from '../src/core/data/fetch-accounts.js';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../src/core/data/fetch-transactions.js';
import {
  resolveAmazonWorkspacePaths,
  type AmazonAuditFile,
  type AmazonAuditMatch,
} from '../src/core/analysis/amazon-purchase-audit.js';

dotenv.config({ path: '.env', quiet: true });

const AMAZON_NOTE_PREFIX = '[Amazon] ';
const MAX_ITEM_SUMMARY_LENGTH = 160;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeItems(match: AmazonAuditMatch): string {
  const uniqueItems = [
    ...new Set(match.itemSummary.map((item) => normalizeWhitespace(item)).filter(Boolean)),
  ];

  if (uniqueItems.length === 0) {
    return '';
  }

  const head = uniqueItems.slice(0, 2).join('; ');
  const suffix = uniqueItems.length > 2 ? ` (+${uniqueItems.length - 2} more)` : '';
  const summary = `${head}${suffix}`;

  if (summary.length <= MAX_ITEM_SUMMARY_LENGTH) {
    return summary;
  }

  return `${summary.slice(0, MAX_ITEM_SUMMARY_LENGTH - 3).trimEnd()}...`;
}

function buildAmazonNote(match: AmazonAuditMatch): string {
  const itemSummary = summarizeItems(match);
  return itemSummary
    ? `${AMAZON_NOTE_PREFIX}${match.orderId} | ${itemSummary}`
    : `${AMAZON_NOTE_PREFIX}${match.orderId}`;
}

function mergeTransactionNotes(existing: string | null | undefined, amazonNote: string): string {
  const existingLines = (existing ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 && !line.startsWith(AMAZON_NOTE_PREFIX));

  return [...existingLines, amazonNote].join('\n');
}

async function main(): Promise<void> {
  const paths = resolveAmazonWorkspacePaths();
  const audit = JSON.parse(await readFile(paths.auditPath, 'utf8')) as AmazonAuditFile;
  const accounts = await fetchAllAccounts();
  const { transactions } = await fetchAllOnBudgetTransactionsWithMetadata(
    accounts,
    '1900-01-01',
    '2100-12-31',
  );
  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const match of audit.matches) {
    const transaction = transactionsById.get(match.transactionId);

    if (!transaction) {
      missing += 1;
      continue;
    }

    const amazonNote = buildAmazonNote(match);
    const mergedNotes = mergeTransactionNotes(transaction.notes, amazonNote);

    if ((transaction.notes ?? '').trim() === mergedNotes.trim()) {
      unchanged += 1;
      continue;
    }

    await updateTransaction(match.transactionId, { notes: mergedNotes });
    updated += 1;
  }

  console.log('Amazon note sync complete.');
  console.log(`Updated notes: ${updated}`);
  console.log(`Already current: ${unchanged}`);
  console.log(`Missing transactions: ${missing}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Amazon note sync failed: ${message}`);
  process.exitCode = 1;
});
