import { readFile } from 'node:fs/promises';
import { createRule, getCategories, updateTransaction } from '../../api/actual-client.js';
import { fetchAllAccounts } from '../../data/fetch-accounts.js';
import { fetchAllRules } from '../../data/fetch-rules.js';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../../data/fetch-transactions.js';
import {
  MIN_RULE_CONFIRMATION_COUNT,
  RECON_END_DATE,
  RECON_START_DATE,
  TIMELINE_ANALYSIS_VERSION,
} from './constants.js';
import {
  buildCurrentTransactionMap,
  buildRulePayload,
  hasExistingExactRule,
} from './apply-support.js';
import {
  buildHistoricalHintIndex,
  classifyTransaction,
  mergeTimelineNotes,
} from './classification.js';
import { loadReconInputs, writeAuditOutputs } from './io.js';
import { resolveTimelineReconPaths } from './paths.js';
import { buildSupplementalLookupKey } from './supplemental.js';
import type {
  BuildTimelineReconAuditInput,
  NormalizedSupplementalRow,
  TimelineApplyResult,
  TimelineReconAuditFile,
  TimelineReconCandidate,
} from './types.js';

export function buildTimelineReconAudit(
  input: BuildTimelineReconAuditInput,
): TimelineReconAuditFile {
  const startDate = input.startDate ?? RECON_START_DATE;
  const endDate = input.endDate ?? RECON_END_DATE;
  const placeCache = input.placeCache ?? { places: {} };
  const categoryOverrides = input.categoryOverrides ?? {
    transactions: {},
    merchantNames: {},
    placeKeys: {},
  };
  const uncategorized = input.transactions.filter(
    (transaction) =>
      !transaction.category && transaction.date >= startDate && transaction.date <= endDate,
  );
  const exactMatchLookup = new Map<string, NormalizedSupplementalRow[]>();
  const accountNamesById = new Map(input.accounts.map((account) => [account.id, account.name]));

  input.supplementalRows.forEach((row) => {
    const key = buildSupplementalLookupKey(row.date, row.amountCents, row.actualAccountId);
    const bucket = exactMatchLookup.get(key) ?? [];
    bucket.push(row);
    exactMatchLookup.set(key, bucket);
  });

  const historicalHints = buildHistoricalHintIndex(input.transactions, input.categoriesById);
  const candidates = uncategorized
    .map((transaction) =>
      classifyTransaction(
        transaction,
        accountNamesById,
        exactMatchLookup,
        input.timeline,
        placeCache,
        categoryOverrides,
        historicalHints,
      ),
    )
    .sort((left, right) => {
      if (left.status !== right.status) {
        if (left.status === 'ready-exact') {
          return -1;
        }
        if (right.status === 'ready-exact') {
          return 1;
        }
        if (left.status === 'ready-confirmed') {
          return -1;
        }
        if (right.status === 'ready-confirmed') {
          return 1;
        }
      }

      return left.transactionDate.localeCompare(right.transactionDate);
    });

  const manualReviews = candidates.filter((candidate) => candidate.status === 'manual');
  const exactReadyCount = candidates.filter(
    (candidate) => candidate.status === 'ready-exact',
  ).length;
  const confirmedReadyCount = candidates.filter(
    (candidate) => candidate.status === 'ready-confirmed',
  ).length;
  const locationEligibleTransactions = candidates.filter(
    (candidate) =>
      candidate.blockedReason !==
      'Payment/transfer-style or otherwise location-ineligible transaction.',
  ).length;
  const ruleEligibleCount = new Set(
    candidates
      .filter(
        (candidate) =>
          candidate.status !== 'manual' &&
          candidate.ruleField &&
          candidate.ruleValue &&
          candidate.recommendedCategoryName,
      )
      .map((candidate) =>
        [
          candidate.accountId,
          candidate.ruleField,
          candidate.ruleValue,
          candidate.recommendedCategoryName,
        ].join('|'),
      ),
  ).size;

  return {
    version: TIMELINE_ANALYSIS_VERSION,
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    summary: {
      startDate,
      endDate,
      totalUncategorizedTransactions: uncategorized.length,
      locationEligibleTransactions,
      locationIneligibleTransactions: uncategorized.length - locationEligibleTransactions,
      exactReadyCount,
      confirmedReadyCount,
      manualCount: manualReviews.length,
      ruleEligibleCount,
      warningCount: 0,
    },
    candidates,
    manualReviews,
    warnings: [],
  };
}

export async function generateTimelineReconAudit(
  paths = resolveTimelineReconPaths(),
): Promise<TimelineReconAuditFile> {
  const inputs = await loadReconInputs(paths);
  const audit = buildTimelineReconAudit({
    ...inputs,
    startDate: RECON_START_DATE,
    endDate: RECON_END_DATE,
  });
  await writeAuditOutputs(audit, paths);
  return audit;
}

export async function applyTimelineReconAudit(
  paths = resolveTimelineReconPaths(),
): Promise<TimelineApplyResult> {
  const audit = JSON.parse(await readFile(paths.auditPath, 'utf8')) as TimelineReconAuditFile;

  if (audit.version !== TIMELINE_ANALYSIS_VERSION) {
    throw new Error(
      `Unsupported timeline recon audit version ${audit.version}. Expected ${TIMELINE_ANALYSIS_VERSION}.`,
    );
  }

  const accounts = await fetchAllAccounts();
  const { transactions } = await fetchAllOnBudgetTransactionsWithMetadata(
    accounts,
    RECON_START_DATE,
    RECON_END_DATE,
  );
  const currentTransactionsById = buildCurrentTransactionMap(transactions);
  const [categories, existingRules] = await Promise.all([getCategories(), fetchAllRules()]);
  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

  let exactUpdatesApplied = 0;
  let confirmedUpdatesApplied = 0;
  let skippedMissingTransactions = 0;
  let skippedChangedTransactions = 0;
  let skippedManualCandidates = 0;
  const appliedCandidates: TimelineReconCandidate[] = [];

  for (const candidate of audit.candidates) {
    if (candidate.status === 'manual') {
      skippedManualCandidates += 1;
      continue;
    }

    const current = currentTransactionsById.get(candidate.transactionId);

    if (!current) {
      skippedMissingTransactions += 1;
      continue;
    }

    if (
      current.date !== candidate.transactionDate ||
      current.amountCents !== candidate.transactionAmountCents ||
      current.payeeName !== candidate.payeeName ||
      current.importedPayee !== (candidate.importedPayee ?? null) ||
      current.isParent ||
      current.isChild ||
      current.transferId ||
      current.categoryName
    ) {
      skippedChangedTransactions += 1;
      continue;
    }

    const categoryId = categoryIdByName.get(candidate.recommendedCategoryName ?? '');

    if (!categoryId) {
      skippedChangedTransactions += 1;
      continue;
    }

    const notes = mergeTimelineNotes(current.notes, candidate.noteText ?? null);

    await updateTransaction(candidate.transactionId, {
      category: categoryId,
      ...(notes ? { notes } : {}),
      subtransactions: undefined,
    });

    if (candidate.status === 'ready-exact') {
      exactUpdatesApplied += 1;
    } else {
      confirmedUpdatesApplied += 1;
    }

    appliedCandidates.push(candidate);
  }

  const groupedRuleCandidates = new Map<string, TimelineReconCandidate[]>();

  for (const candidate of appliedCandidates) {
    if (!candidate.ruleField || !candidate.ruleValue || !candidate.recommendedCategoryName) {
      continue;
    }

    const key = [
      candidate.accountId,
      candidate.ruleField,
      candidate.ruleValue,
      candidate.recommendedCategoryName,
    ].join('|');
    const bucket = groupedRuleCandidates.get(key) ?? [];
    bucket.push(candidate);
    groupedRuleCandidates.set(key, bucket);
  }

  const rulesCreated: string[] = [];

  for (const candidatesForRule of groupedRuleCandidates.values()) {
    if (candidatesForRule.length < MIN_RULE_CONFIRMATION_COUNT) {
      continue;
    }

    const candidate = candidatesForRule[0];
    const categoryId = categoryIdByName.get(candidate.recommendedCategoryName ?? '');

    if (!categoryId || hasExistingExactRule(existingRules, candidate, categoryId)) {
      continue;
    }

    const payload = buildRulePayload(candidate, categoryId);

    if (!payload) {
      continue;
    }

    await createRule(payload as unknown as Record<string, unknown>);
    rulesCreated.push(
      `${candidate.accountName}: ${candidate.ruleField}=${candidate.ruleValue} -> ${candidate.recommendedCategoryName}`,
    );
  }

  return {
    exactUpdatesApplied,
    confirmedUpdatesApplied,
    skippedMissingTransactions,
    skippedChangedTransactions,
    skippedManualCandidates,
    rulesCreated,
  };
}
