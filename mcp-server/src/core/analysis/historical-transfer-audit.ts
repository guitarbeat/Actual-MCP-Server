import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllTransactionsWithMetadata } from '../data/fetch-transactions.js';
import { formatDate } from '../formatting/index.js';
import type { Account, Transaction } from '../types/domain.js';
import {
  buildHistoricalTransferCandidateId,
  getDateDiffInDays,
  getTransferLikeMatch,
} from './historical-transfer-utils.js';
import { ALL_HISTORY_START_DATE } from './uncategorized-audit.js';

export const DEFAULT_TRANSFER_CANDIDATE_LIMIT = 100;
export const DEFAULT_TRANSFER_FLAGGED_REVIEW_LIMIT = 25;
export const STRICT_TRANSFER_MATCH_WINDOW_DAYS = 3;

export type HistoricalTransferGroupSource = 'imported_payee' | 'payee';
export type HistoricalTransferCategoryState = 'categorized' | 'uncategorized';

export interface HistoricalTransferCandidateSide {
  transactionId: string;
  accountId: string;
  accountName: string;
  date: string;
  amount: number;
  payee?: string | null;
  imported_payee?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryState: HistoricalTransferCategoryState;
}

export interface HistoricalTransferCandidate {
  candidateId: string;
  outflowTransaction: HistoricalTransferCandidateSide;
  inflowTransaction: HistoricalTransferCandidateSide;
  uncategorizedSideCount: number;
  sameBudgetStatus: boolean;
  dateDeltaDays: number;
  qualifiesBecause: string[];
}

export interface HistoricalTransferFlaggedReviewGroup {
  groupSource: HistoricalTransferGroupSource;
  groupLabel: string;
  accountId: string;
  accountName: string;
  count: number;
  totalAmount: number;
  oldestDate: string;
  newestDate: string;
  sampleTransactionIds: string[];
  sampleTransactions: Array<{
    id: string;
    date: string;
    amount: number;
    payee?: string | null;
    imported_payee?: string | null;
    notes?: string | null;
  }>;
  flaggedReason: string;
}

export interface HistoricalTransferAccountPairHotspot {
  accountIds: [string, string];
  accountNames: [string, string];
  candidateCount: number;
  candidatesWithUncategorizedSide: number;
}

export interface HistoricalTransferAuditSummary {
  startDate: string;
  endDate: string;
  accountScope: 'all-accounts';
  totalTransactionsAnalyzed: number;
  eligibleTransactionCount: number;
  strictCandidateCount: number;
  returnedStrictCandidateCount: number;
  candidatesWithUncategorizedSide: number;
  candidatesWithBothSidesUncategorized: number;
  flaggedReviewGroupCount: number;
  returnedFlaggedReviewGroupCount: number;
  topAccountPairHotspots: HistoricalTransferAccountPairHotspot[];
  warningCount: number;
}

export interface HistoricalTransferAuditResult {
  summary: HistoricalTransferAuditSummary;
  strictCandidates: HistoricalTransferCandidate[];
  flaggedReviewGroups: HistoricalTransferFlaggedReviewGroup[];
  warnings: string[];
}

export interface BuildHistoricalTransferAuditOptions {
  accounts: Account[];
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  candidateLimit?: number;
  flaggedReviewLimit?: number;
  warnings?: string[];
}

export interface AuditHistoricalTransfersOptions {
  startDate?: string;
  endDate?: string;
  candidateLimit?: number;
  flaggedReviewLimit?: number;
}

interface CandidateTransactionPair {
  first: Transaction;
  second: Transaction;
}

interface ReviewGroupIdentity {
  key: string;
  groupSource: HistoricalTransferGroupSource;
  groupLabel: string;
  accountId: string;
  accountName: string;
}

function getAuditEndDate(endDate?: string): string {
  return endDate ?? formatDate(new Date());
}

export function resolveHistoricalTransferAuditDateRange(
  startDate?: string,
  endDate?: string,
): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: startDate ?? ALL_HISTORY_START_DATE,
    endDate: getAuditEndDate(endDate),
  };
}

function annotateAccountNames(
  transactions: Transaction[],
  accountsById: Record<string, Account>,
): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    account_name:
      transaction.account_name || accountsById[transaction.account]?.name || transaction.account,
  }));
}

function isEligibleStrictTransferTransaction(transaction: Transaction): boolean {
  return !transaction.transfer_id && !transaction.is_parent && !transaction.is_child;
}

function isStartingBalance(transaction: Transaction): boolean {
  return Boolean(transaction.starting_balance_flag);
}

function findCounterpartCandidates(
  transaction: Transaction,
  transactionsByInverseAmount: Map<number, Transaction[]>,
): Transaction[] {
  const inverseAmountMatches = transactionsByInverseAmount.get(transaction.amount * -1) ?? [];

  return inverseAmountMatches.filter(
    (candidate) =>
      candidate.id !== transaction.id &&
      candidate.account !== transaction.account &&
      !isStartingBalance(candidate) &&
      isEligibleStrictTransferTransaction(candidate) &&
      getDateDiffInDays(transaction.date, candidate.date) <= STRICT_TRANSFER_MATCH_WINDOW_DAYS,
  );
}

function toCandidateSide(transaction: Transaction): HistoricalTransferCandidateSide {
  return {
    transactionId: transaction.id,
    accountId: transaction.account,
    accountName: transaction.account_name || transaction.account,
    date: transaction.date,
    amount: transaction.amount,
    payee: transaction.payee_name || transaction.payee || null,
    imported_payee: transaction.imported_payee ?? null,
    notes: transaction.notes ?? null,
    categoryId: transaction.category ?? null,
    categoryName: transaction.category_name ?? null,
    categoryState: transaction.category ? 'categorized' : 'uncategorized',
  };
}

function buildStrictTransferCandidate(
  first: Transaction,
  second: Transaction,
  accountsById: Record<string, Account>,
): HistoricalTransferCandidate {
  const [outflow, inflow] = first.amount <= second.amount ? [first, second] : [second, first];
  const sameBudgetStatus =
    Boolean(accountsById[first.account]?.offbudget) ===
    Boolean(accountsById[second.account]?.offbudget);
  const outflowSide = toCandidateSide(outflow);
  const inflowSide = toCandidateSide(inflow);
  const uncategorizedSideCount = [outflowSide, inflowSide].filter(
    (side) => side.categoryState === 'uncategorized',
  ).length;

  return {
    candidateId: buildHistoricalTransferCandidateId(first.id, second.id),
    outflowTransaction: outflowSide,
    inflowTransaction: inflowSide,
    uncategorizedSideCount,
    sameBudgetStatus,
    dateDeltaDays: getDateDiffInDays(first.date, second.date),
    qualifiesBecause: [
      'different-accounts',
      'exact-inverse-amount',
      'within-3-days',
      'unique-counterpart-match',
    ],
  };
}

function sortStrictCandidates(
  left: HistoricalTransferCandidate,
  right: HistoricalTransferCandidate,
): number {
  if (right.uncategorizedSideCount !== left.uncategorizedSideCount) {
    return right.uncategorizedSideCount - left.uncategorizedSideCount;
  }

  const rightNewestDate =
    right.outflowTransaction.date > right.inflowTransaction.date
      ? right.outflowTransaction.date
      : right.inflowTransaction.date;
  const leftNewestDate =
    left.outflowTransaction.date > left.inflowTransaction.date
      ? left.outflowTransaction.date
      : left.inflowTransaction.date;

  if (rightNewestDate !== leftNewestDate) {
    return rightNewestDate.localeCompare(leftNewestDate);
  }

  return left.candidateId.localeCompare(right.candidateId);
}

function buildStrictTransferCandidates(
  transactions: Transaction[],
  accountsById: Record<string, Account>,
): HistoricalTransferCandidate[] {
  const eligibleTransactions = transactions.filter(
    (transaction) =>
      !isStartingBalance(transaction) && isEligibleStrictTransferTransaction(transaction),
  );
  const transactionsById = new Map(
    eligibleTransactions.map((transaction) => [transaction.id, transaction]),
  );
  const transactionsByInverseAmount = new Map<number, Transaction[]>();

  for (const transaction of eligibleTransactions) {
    const existing = transactionsByInverseAmount.get(transaction.amount);

    if (existing) {
      existing.push(transaction);
      continue;
    }

    transactionsByInverseAmount.set(transaction.amount, [transaction]);
  }

  const candidateIdsByTransactionId = new Map<string, string[]>();

  for (const transaction of eligibleTransactions) {
    candidateIdsByTransactionId.set(
      transaction.id,
      findCounterpartCandidates(transaction, transactionsByInverseAmount).map(
        (candidate) => candidate.id,
      ),
    );
  }

  const pairsByCandidateId = new Map<string, CandidateTransactionPair>();

  for (const transaction of eligibleTransactions) {
    const counterpartIds = candidateIdsByTransactionId.get(transaction.id) ?? [];

    if (counterpartIds.length !== 1) {
      continue;
    }

    const counterpartId = counterpartIds[0];
    const counterpartCounterparts = candidateIdsByTransactionId.get(counterpartId) ?? [];

    if (counterpartCounterparts.length !== 1 || counterpartCounterparts[0] !== transaction.id) {
      continue;
    }

    const counterpart = transactionsById.get(counterpartId);

    if (!counterpart) {
      continue;
    }

    pairsByCandidateId.set(buildHistoricalTransferCandidateId(transaction.id, counterpart.id), {
      first: transaction,
      second: counterpart,
    });
  }

  return [...pairsByCandidateId.values()]
    .map(({ first, second }) => buildStrictTransferCandidate(first, second, accountsById))
    .sort(sortStrictCandidates);
}

function getReviewGroupIdentity(transaction: Transaction): ReviewGroupIdentity {
  const importedPayee = transaction.imported_payee?.trim();
  const payeeLabel = transaction.payee_name?.trim() || transaction.payee?.trim() || '(No payee)';
  const groupSource: HistoricalTransferGroupSource = importedPayee ? 'imported_payee' : 'payee';
  const groupLabel = importedPayee || payeeLabel;
  const normalizedLabel = groupLabel.trim().toLowerCase();

  return {
    key: `${groupSource}:${normalizedLabel}:${transaction.account}`,
    groupSource,
    groupLabel,
    accountId: transaction.account,
    accountName: transaction.account_name || transaction.account,
  };
}

function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => right.date.localeCompare(left.date));
}

function buildFlaggedReviewGroups(
  transactions: Transaction[],
  strictCandidates: HistoricalTransferCandidate[],
): HistoricalTransferFlaggedReviewGroup[] {
  const pairedTransactionIds = new Set(
    strictCandidates.flatMap((candidate) => [
      candidate.outflowTransaction.transactionId,
      candidate.inflowTransaction.transactionId,
    ]),
  );
  const groups = new Map<
    string,
    {
      identity: ReviewGroupIdentity;
      flaggedReason: string;
      transactions: Transaction[];
    }
  >();

  for (const transaction of transactions) {
    if (
      transaction.category ||
      pairedTransactionIds.has(transaction.id) ||
      isStartingBalance(transaction) ||
      !isEligibleStrictTransferTransaction(transaction)
    ) {
      continue;
    }

    const identity = getReviewGroupIdentity(transaction);
    const transferLikeMatch = getTransferLikeMatch(identity.groupLabel);

    if (!transferLikeMatch) {
      continue;
    }

    const existing = groups.get(identity.key);

    if (existing) {
      existing.transactions.push(transaction);
      continue;
    }

    groups.set(identity.key, {
      identity,
      flaggedReason: transferLikeMatch.reason,
      transactions: [transaction],
    });
  }

  return [...groups.values()]
    .map(({ identity, flaggedReason, transactions: groupedTransactions }) => {
      const sortedTransactions = sortTransactionsNewestFirst(groupedTransactions);

      return {
        groupSource: identity.groupSource,
        groupLabel: identity.groupLabel,
        accountId: identity.accountId,
        accountName: identity.accountName,
        count: sortedTransactions.length,
        totalAmount: sortedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
        oldestDate: [...sortedTransactions].reverse()[0]?.date ?? ALL_HISTORY_START_DATE,
        newestDate: sortedTransactions[0]?.date ?? ALL_HISTORY_START_DATE,
        sampleTransactionIds: sortedTransactions.slice(0, 5).map((transaction) => transaction.id),
        sampleTransactions: sortedTransactions.slice(0, 5).map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          amount: transaction.amount,
          payee: transaction.payee_name || transaction.payee || null,
          imported_payee: transaction.imported_payee ?? null,
          notes: transaction.notes ?? null,
        })),
        flaggedReason,
      } satisfies HistoricalTransferFlaggedReviewGroup;
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.newestDate.localeCompare(left.newestDate);
    });
}

function buildAccountPairHotspots(
  candidates: HistoricalTransferCandidate[],
): HistoricalTransferAccountPairHotspot[] {
  const hotspots = new Map<string, HistoricalTransferAccountPairHotspot>();

  for (const candidate of candidates) {
    const accounts = [
      {
        id: candidate.outflowTransaction.accountId,
        name: candidate.outflowTransaction.accountName,
      },
      {
        id: candidate.inflowTransaction.accountId,
        name: candidate.inflowTransaction.accountName,
      },
    ].sort((left, right) => left.id.localeCompare(right.id));
    const key = `${accounts[0].id}:${accounts[1].id}`;
    const existing = hotspots.get(key);

    if (existing) {
      existing.candidateCount += 1;
      if (candidate.uncategorizedSideCount > 0) {
        existing.candidatesWithUncategorizedSide += 1;
      }
      continue;
    }

    hotspots.set(key, {
      accountIds: [accounts[0].id, accounts[1].id],
      accountNames: [accounts[0].name, accounts[1].name],
      candidateCount: 1,
      candidatesWithUncategorizedSide: candidate.uncategorizedSideCount > 0 ? 1 : 0,
    });
  }

  return [...hotspots.values()]
    .sort((left, right) => {
      if (right.candidateCount !== left.candidateCount) {
        return right.candidateCount - left.candidateCount;
      }

      return left.accountNames.join(':').localeCompare(right.accountNames.join(':'));
    })
    .slice(0, 10);
}

export function buildHistoricalTransferAudit(
  options: BuildHistoricalTransferAuditOptions,
): HistoricalTransferAuditResult {
  const candidateLimit = options.candidateLimit ?? DEFAULT_TRANSFER_CANDIDATE_LIMIT;
  const flaggedReviewLimit = options.flaggedReviewLimit ?? DEFAULT_TRANSFER_FLAGGED_REVIEW_LIMIT;
  const warnings = options.warnings ?? [];
  const accountsById = Object.fromEntries(options.accounts.map((account) => [account.id, account]));
  const transactions = annotateAccountNames(options.transactions, accountsById);
  const strictCandidates = buildStrictTransferCandidates(transactions, accountsById);
  const flaggedReviewGroups = buildFlaggedReviewGroups(transactions, strictCandidates);
  const candidatesWithUncategorizedSide = strictCandidates.filter(
    (candidate) => candidate.uncategorizedSideCount > 0,
  ).length;
  const candidatesWithBothSidesUncategorized = strictCandidates.filter(
    (candidate) => candidate.uncategorizedSideCount === 2,
  ).length;
  const returnedFlaggedReviewGroups = flaggedReviewGroups.slice(0, flaggedReviewLimit);

  return {
    summary: {
      startDate: options.startDate,
      endDate: options.endDate,
      accountScope: 'all-accounts',
      totalTransactionsAnalyzed: transactions.length,
      eligibleTransactionCount: transactions.filter(
        (transaction) =>
          !isStartingBalance(transaction) && isEligibleStrictTransferTransaction(transaction),
      ).length,
      strictCandidateCount: strictCandidates.length,
      returnedStrictCandidateCount: Math.min(strictCandidates.length, candidateLimit),
      candidatesWithUncategorizedSide,
      candidatesWithBothSidesUncategorized,
      flaggedReviewGroupCount: flaggedReviewGroups.length,
      returnedFlaggedReviewGroupCount: returnedFlaggedReviewGroups.length,
      topAccountPairHotspots: buildAccountPairHotspots(strictCandidates),
      warningCount: warnings.length,
    },
    strictCandidates: strictCandidates.slice(0, candidateLimit),
    flaggedReviewGroups: returnedFlaggedReviewGroups,
    warnings,
  };
}

export async function auditHistoricalTransfers(
  options: AuditHistoricalTransfersOptions = {},
): Promise<HistoricalTransferAuditResult> {
  const { startDate, endDate } = resolveHistoricalTransferAuditDateRange(
    options.startDate,
    options.endDate,
  );
  const accounts = await fetchAllAccounts();
  const result = await fetchAllTransactionsWithMetadata(accounts, startDate, endDate);
  const warnings = result.warnings.map(
    (warning) =>
      `${warning.accountName} (${warning.accountId}): ${warning.operation} fetch failed - ${warning.error}`,
  );

  return buildHistoricalTransferAudit({
    accounts,
    transactions: result.transactions,
    startDate,
    endDate,
    candidateLimit: options.candidateLimit,
    flaggedReviewLimit: options.flaggedReviewLimit,
    warnings,
  });
}
