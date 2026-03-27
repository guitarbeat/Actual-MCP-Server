import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import { fetchAllAccounts } from '../../data/fetch-accounts.js';
import { fetchAllCategoriesMap } from '../../data/fetch-categories.js';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../../data/fetch-transactions.js';
import { RECON_END_DATE, RECON_START_DATE } from './constants.js';
import { normalizeSupplementalRows, parseCsvRows } from './supplemental.js';
import { parseTimelineEntries, parseTimelineJson } from './timeline-parse.js';
import type {
  NormalizedSupplementalRow,
  ParsedTimelineEntries,
  SupplementalCsvRow,
  TimelineCategoryOverridesFile,
  TimelinePlaceCacheFile,
  TimelineReconAuditFile,
  TimelineReconPaths,
} from './types.js';
import type { Account, Category, Transaction } from '../../types/domain.js';

export async function ensureJsonFile<T>(path: string, defaultValue: T): Promise<T> {
  await mkdir(dirname(path), { recursive: true });

  if (!existsSync(path)) {
    await writeFile(path, `${JSON.stringify(defaultValue, null, 2)}\n`, 'utf8');
    return defaultValue;
  }

  const contents = await readFile(path, 'utf8');
  return JSON.parse(contents) as T;
}

export async function writeAuditOutputs(
  audit: TimelineReconAuditFile,
  paths: TimelineReconPaths,
): Promise<void> {
  await mkdir(paths.reconDir, { recursive: true });
  await writeFile(paths.auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  const candidatesCsv = stringifyCsv(
    audit.candidates.map((candidate) => ({
      transactionId: candidate.transactionId,
      date: candidate.transactionDate,
      amount: (candidate.transactionAmountCents / 100).toFixed(2),
      accountName: candidate.accountName,
      payeeName: candidate.payeeName,
      importedPayee: candidate.importedPayee ?? '',
      exactMatchCategory: candidate.supplementalCategory ?? '',
      exactMatchDescription: candidate.supplementalDescription ?? '',
      exactMatchStatementDescription: candidate.supplementalStatementDescription ?? '',
      timelinePlaceKey: candidate.timelinePlaceKey ?? '',
      timelinePlaceId: candidate.timelinePlaceId ?? '',
      latitude: candidate.timelineLatitude ?? '',
      longitude: candidate.timelineLongitude ?? '',
      searchUrl: candidate.timelineSearchUrl ?? '',
      resolvedVenueName: candidate.resolvedVenueName ?? '',
      resolvedMerchantClass: candidate.resolvedMerchantClass ?? '',
      confidenceTier: candidate.confidenceTier,
      status: candidate.status,
      recommendedCategoryName: candidate.recommendedCategoryName ?? '',
      blockedReason: candidate.blockedReason ?? '',
    })),
    { header: true },
  );

  const manualCsv = stringifyCsv(
    audit.manualReviews.map((candidate) => ({
      transactionId: candidate.transactionId,
      date: candidate.transactionDate,
      amount: (candidate.transactionAmountCents / 100).toFixed(2),
      accountName: candidate.accountName,
      payeeName: candidate.payeeName,
      importedPayee: candidate.importedPayee ?? '',
      searchUrl: candidate.timelineSearchUrl ?? '',
      blockedReason: candidate.blockedReason ?? '',
      recommendedCategoryName: candidate.recommendedCategoryName ?? '',
    })),
    { header: true },
  );

  await writeFile(paths.candidatesPath, candidatesCsv, 'utf8');
  await writeFile(paths.manualReviewPath, manualCsv, 'utf8');
}

export async function loadReconInputs(paths: TimelineReconPaths): Promise<{
  accounts: Account[];
  transactions: Transaction[];
  categoriesById: Record<string, Category>;
  supplementalRows: NormalizedSupplementalRow[];
  timeline: ParsedTimelineEntries;
  placeCache: TimelinePlaceCacheFile;
  categoryOverrides: TimelineCategoryOverridesFile;
}> {
  const placeCache = await ensureJsonFile<TimelinePlaceCacheFile>(paths.placeCachePath, {
    places: {},
  });
  const categoryOverrides = await ensureJsonFile<TimelineCategoryOverridesFile>(
    paths.categoryOverridesPath,
    {
      transactions: {},
      merchantNames: {},
      placeKeys: {},
    },
  );

  const [accounts, categoriesById, supplementalCsvText, timelineText] = await Promise.all([
    fetchAllAccounts(),
    fetchAllCategoriesMap(),
    readFile(paths.supplementalCsvPath, 'utf8'),
    readFile(paths.timelinePath, 'utf8'),
  ]);
  const { transactions } = await fetchAllOnBudgetTransactionsWithMetadata(
    accounts,
    RECON_START_DATE,
    RECON_END_DATE,
  );

  return {
    accounts,
    transactions,
    categoriesById,
    supplementalRows: normalizeSupplementalRows(
      parseCsvRows<SupplementalCsvRow>(supplementalCsvText),
      accounts,
      RECON_START_DATE,
      RECON_END_DATE,
    ),
    timeline: parseTimelineEntries(
      parseTimelineJson(timelineText),
      RECON_START_DATE,
      RECON_END_DATE,
    ),
    placeCache,
    categoryOverrides,
  };
}
