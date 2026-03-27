import { parse as parseCsv } from 'csv-parse/sync';
import { RECON_END_DATE, RECON_START_DATE } from './constants.js';
import {
  merchantNamesCompatible,
  normalizeComparisonText,
  normalizeMerchantKey,
  parseMoneyToCents,
  tokenizeForMatching,
} from './shared.js';
import type {
  NormalizedSupplementalRow,
  SupplementalCsvRow,
  SupplementalExactMatchResult,
} from './types.js';
import type { Account, Transaction } from '../../types/domain.js';

export function parseCsvRows<T>(csvText: string): T[] {
  return parseCsv(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true,
  }) as T[];
}

export function resolveSupplementalAccount(
  externalAccountName: string,
  accounts: Account[],
): { actualAccountId: string | null; actualAccountName: string | null } {
  const normalizedExternal = normalizeComparisonText(externalAccountName);
  const externalTokens = tokenizeForMatching(externalAccountName);
  let bestMatch: Account | null = null;
  let bestScore = 0;

  for (const account of accounts) {
    const internalNormalized = normalizeComparisonText(account.name);
    const internalTokens = tokenizeForMatching(account.name);
    const overlap = internalTokens.filter((token) => externalTokens.includes(token)).length;
    const containmentBonus =
      normalizedExternal.includes(internalNormalized) ||
      internalNormalized.includes(normalizedExternal)
        ? 2
        : 0;
    const score = overlap + containmentBonus;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = account;
    } else if (score === bestScore) {
      bestMatch = null;
    }
  }

  if (!bestMatch || bestScore < 2) {
    return { actualAccountId: null, actualAccountName: null };
  }

  return { actualAccountId: bestMatch.id, actualAccountName: bestMatch.name };
}

export function normalizeSupplementalRows(
  rows: SupplementalCsvRow[],
  accounts: Account[],
  startDate = RECON_START_DATE,
  endDate = RECON_END_DATE,
): NormalizedSupplementalRow[] {
  return rows
    .filter((row) => row.Date >= startDate && row.Date <= endDate)
    .map((row) => {
      const accountMatch = resolveSupplementalAccount(row.Account, accounts);

      return {
        date: row.Date,
        description: row.Description ?? '',
        statementDescription: row['Statement description'] ?? '',
        normalizedDescription: normalizeMerchantKey(row.Description),
        normalizedStatementDescription: normalizeMerchantKey(row['Statement description']),
        type: row.Type ?? '',
        category: row.Category ?? '',
        amountCents: parseMoneyToCents(row.Amount),
        accountName: row.Account ?? '',
        actualAccountId: accountMatch.actualAccountId,
        actualAccountName: accountMatch.actualAccountName,
        notes: row.Notes ?? '',
      };
    });
}

export function buildSupplementalLookupKey(
  date: string,
  amountCents: number,
  accountId: string | null,
): string {
  return [date, amountCents, accountId ?? 'unmapped'].join('|');
}

export function findExactSupplementalMatch(
  transaction: Transaction,
  matchesByKey: Map<string, NormalizedSupplementalRow[]>,
): SupplementalExactMatchResult {
  const key = buildSupplementalLookupKey(transaction.date, transaction.amount, transaction.account);
  const candidates = matchesByKey.get(key) ?? [];

  if (candidates.length === 0) {
    return { row: null };
  }

  const merchantText = transaction.imported_payee ?? transaction.payee_name ?? '';
  const filtered = candidates.filter(
    (candidate) =>
      merchantNamesCompatible(candidate.description, merchantText) ||
      merchantNamesCompatible(candidate.statementDescription, merchantText),
  );

  if (filtered.length === 1) {
    return { row: filtered[0] };
  }

  if (filtered.length > 1) {
    return { row: null, blockedReason: 'Multiple supplemental CSV rows matched this transaction.' };
  }

  return {
    row: null,
    blockedReason: 'Supplemental CSV row exists but merchant text did not match.',
  };
}
