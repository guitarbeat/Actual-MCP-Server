import type { Category, Transaction } from '../../types/domain.js';
import {
  BEAUTY_KEYWORDS,
  DINING_KEYWORDS,
  EXPERIENCE_KEYWORDS,
  EXTERNAL_CATEGORY_ALIASES,
  FAST_FOOD_KEYWORDS,
  FEE_KEYWORDS,
  GAS_KEYWORDS,
  GOVERNMENT_KEYWORDS,
  HEALTH_INSURANCE_KEYWORDS,
  HOME_GOODS_KEYWORDS,
  HOUSEHOLD_KEYWORDS,
  INELIGIBLE_MERCHANT_PATTERNS,
  INVESTMENT_KEYWORDS,
  MEDICINE_KEYWORDS,
  MIN_HISTORICAL_HINT_CONFIDENCE,
  MIN_HISTORICAL_HINT_COUNT,
  PET_KEYWORDS,
  RIDESHARE_KEYWORDS,
  SHOPPING_KEYWORDS,
  TECH_KEYWORDS,
  TIMELINE_NOTE_PREFIX,
} from './constants.js';
import {
  diffCalendarDays,
  merchantNamesCompatible,
  normalizeMerchantKey,
  normalizeString,
} from './shared.js';
import { findExactSupplementalMatch } from './supplemental.js';
import type {
  CategoryResolution,
  HistoricalCategoryHint,
  HistoricalHintIndex,
  NormalizedSupplementalRow,
  ParsedTimelineEntries,
  TimelineCategoryOverridesFile,
  TimelinePlaceCacheFile,
  TimelineReconCandidate,
  TimelineResolvedPlace,
  TimelineStay,
} from './types.js';

function keywordMatch(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(normalizeMerchantKey(keyword)));
}

function isFastFoodLike(text: string): boolean {
  return keywordMatch(text, FAST_FOOD_KEYWORDS);
}

function isDiningLike(text: string): boolean {
  return keywordMatch(text, DINING_KEYWORDS);
}

function isGasLike(text: string): boolean {
  return keywordMatch(text, GAS_KEYWORDS);
}

function isTransitLike(text: string): boolean {
  return keywordMatch(text, RIDESHARE_KEYWORDS);
}

function isHouseholdLike(text: string): boolean {
  return keywordMatch(text, HOUSEHOLD_KEYWORDS);
}

function isPetLike(text: string): boolean {
  return keywordMatch(text, PET_KEYWORDS);
}

function isBeautyLike(text: string): boolean {
  return keywordMatch(text, BEAUTY_KEYWORDS);
}

function isMedicineLike(text: string): boolean {
  return keywordMatch(text, MEDICINE_KEYWORDS);
}

function isInsuranceLike(text: string): boolean {
  return keywordMatch(text, HEALTH_INSURANCE_KEYWORDS);
}

function isInvestmentLike(text: string): boolean {
  return keywordMatch(text, INVESTMENT_KEYWORDS);
}

function isFeeLike(text: string): boolean {
  return keywordMatch(text, FEE_KEYWORDS);
}

function isGovernmentLike(text: string): boolean {
  return keywordMatch(text, GOVERNMENT_KEYWORDS);
}

function isExperienceLike(text: string): boolean {
  return keywordMatch(text, EXPERIENCE_KEYWORDS);
}

function isHomeGoodsLike(text: string): boolean {
  return keywordMatch(text, HOME_GOODS_KEYWORDS);
}

function isShoppingLike(text: string): boolean {
  return keywordMatch(text, SHOPPING_KEYWORDS);
}

function isTechLike(text: string): boolean {
  return keywordMatch(text, TECH_KEYWORDS);
}

function isTravelLikeMerchant(merchantText: string): boolean {
  const normalized = normalizeMerchantKey(merchantText);
  return (
    normalized.includes('airport') ||
    normalized.includes('airline') ||
    normalized.includes('hotel') ||
    normalized.includes('travel')
  );
}

function isDelayedPostingMerchant(merchantText: string): boolean {
  const normalized = normalizeMerchantKey(merchantText);
  return (
    isGovernmentLike(normalized) || normalized.includes('utility') || normalized.includes('clerk')
  );
}

export function isLocationEligibleTransaction(transaction: Transaction): boolean {
  if (
    transaction.category ||
    transaction.transfer_id ||
    transaction.is_child ||
    transaction.is_parent ||
    transaction.starting_balance_flag
  ) {
    return false;
  }

  const merchantText = normalizeMerchantKey(
    transaction.imported_payee ?? transaction.payee_name ?? '',
  );

  if (!merchantText) {
    return false;
  }

  return !INELIGIBLE_MERCHANT_PATTERNS.some((pattern) => merchantText.includes(pattern));
}

export function buildHistoricalHintIndex(
  transactions: Transaction[],
  categoriesById: Record<string, Category>,
): HistoricalHintIndex {
  const importedCounters = new Map<string, Map<string, number>>();
  const importedTotals = new Map<string, number>();
  const payeeCounters = new Map<string, Map<string, number>>();
  const payeeTotals = new Map<string, number>();

  const addCounter = (
    counters: Map<string, Map<string, number>>,
    totals: Map<string, number>,
    merchantKey: string,
    categoryId: string,
  ): void => {
    const bucket = counters.get(merchantKey) ?? new Map<string, number>();
    bucket.set(categoryId, (bucket.get(categoryId) ?? 0) + 1);
    counters.set(merchantKey, bucket);
    totals.set(merchantKey, (totals.get(merchantKey) ?? 0) + 1);
  };

  for (const transaction of transactions) {
    if (
      !transaction.category ||
      transaction.transfer_id ||
      transaction.is_child ||
      transaction.is_parent
    ) {
      continue;
    }

    const importedKey = normalizeMerchantKey(transaction.imported_payee);
    const payeeKey = normalizeMerchantKey(transaction.payee_name);

    if (importedKey) {
      addCounter(importedCounters, importedTotals, importedKey, transaction.category);
    }

    if (payeeKey) {
      addCounter(payeeCounters, payeeTotals, payeeKey, transaction.category);
    }
  }

  const buildHintMap = (
    counters: Map<string, Map<string, number>>,
    totals: Map<string, number>,
    source: HistoricalCategoryHint['source'],
  ): Map<string, HistoricalCategoryHint> => {
    const result = new Map<string, HistoricalCategoryHint>();

    for (const [merchantKey, bucket] of counters.entries()) {
      const total = totals.get(merchantKey) ?? 0;

      if (total < MIN_HISTORICAL_HINT_COUNT) {
        continue;
      }

      const topEntry = [...bucket.entries()].sort((left, right) => right[1] - left[1])[0];

      if (!topEntry) {
        continue;
      }

      const [categoryId, count] = topEntry;
      const confidence = count / total;
      const category = categoriesById[categoryId];

      if (!category || confidence < MIN_HISTORICAL_HINT_CONFIDENCE) {
        continue;
      }

      result.set(merchantKey, {
        categoryId,
        categoryName: category.name,
        count,
        total,
        confidence,
        source,
      });
    }

    return result;
  };

  return {
    importedPayee: buildHintMap(importedCounters, importedTotals, 'imported_payee'),
    payeeName: buildHintMap(payeeCounters, payeeTotals, 'payee_name'),
  };
}

function getHistoricalHint(
  transaction: Transaction,
  hints: HistoricalHintIndex,
): HistoricalCategoryHint | null {
  const importedKey = normalizeMerchantKey(transaction.imported_payee);
  const payeeKey = normalizeMerchantKey(transaction.payee_name);

  if (importedKey && hints.importedPayee.has(importedKey)) {
    return hints.importedPayee.get(importedKey) ?? null;
  }

  if (payeeKey && hints.payeeName.has(payeeKey)) {
    return hints.payeeName.get(payeeKey) ?? null;
  }

  return null;
}

function getRuleIdentity(
  transaction: Transaction,
): { field: 'payee' | 'imported_payee'; value: string } | null {
  const importedPayee = normalizeString(transaction.imported_payee);

  if (importedPayee) {
    return { field: 'imported_payee', value: importedPayee };
  }

  if (transaction.payee && transaction.payee_name) {
    return { field: 'payee', value: transaction.payee };
  }

  return null;
}

function findTimelineCandidatesForTransaction(
  transaction: Transaction,
  stays: TimelineStay[],
): TimelineStay[] {
  const merchantText = transaction.imported_payee ?? transaction.payee_name ?? '';
  const maxDiffDays =
    isTravelLikeMerchant(merchantText) || isDelayedPostingMerchant(merchantText) ? 2 : 1;

  return stays
    .filter((stay) => {
      const diffToStart = Math.abs(diffCalendarDays(transaction.date, stay.startDate));
      const diffToEnd = Math.abs(diffCalendarDays(transaction.date, stay.endDate));
      return Math.min(diffToStart, diffToEnd) <= maxDiffDays;
    })
    .sort((left, right) => {
      const leftDiff = Math.min(
        Math.abs(diffCalendarDays(transaction.date, left.startDate)),
        Math.abs(diffCalendarDays(transaction.date, left.endDate)),
      );
      const rightDiff = Math.min(
        Math.abs(diffCalendarDays(transaction.date, right.startDate)),
        Math.abs(diffCalendarDays(transaction.date, right.endDate)),
      );

      if (leftDiff !== rightDiff) {
        return leftDiff - rightDiff;
      }

      if (left.source !== right.source) {
        return left.source === 'visit' ? -1 : 1;
      }

      return right.durationMinutes - left.durationMinutes;
    });
}

function getOverrideCategory(
  transaction: Transaction,
  merchantKey: string,
  placeKey: string | null,
  overrides: TimelineCategoryOverridesFile,
): string | null {
  return (
    overrides.transactions[transaction.id] ??
    overrides.merchantNames[merchantKey] ??
    (placeKey ? overrides.placeKeys[placeKey] : null) ??
    null
  );
}

function resolveMappedCategoryName(
  merchantText: string,
  resolvedVenueName: string | null,
  resolvedMerchantClass: string | null,
  externalCategory: string | null,
  historicalHint: HistoricalCategoryHint | null,
  explicitOverride: string | null,
): CategoryResolution {
  if (explicitOverride) {
    return {
      categoryName: explicitOverride,
      requiresValidation: false,
      source: 'override',
    };
  }

  const normalizedMerchant = normalizeMerchantKey(
    [merchantText, resolvedVenueName ?? '', resolvedMerchantClass ?? ''].join(' '),
  );
  const normalizedExternalCategory = normalizeMerchantKey(externalCategory);
  const aliasedCategory = normalizedExternalCategory
    ? EXTERNAL_CATEGORY_ALIASES[normalizedExternalCategory]
    : undefined;

  if (historicalHint && (!normalizedExternalCategory || normalizedExternalCategory === 'other')) {
    return {
      categoryName: historicalHint.categoryName,
      requiresValidation: false,
      source: 'historical',
    };
  }

  if (aliasedCategory) {
    return {
      categoryName: aliasedCategory,
      requiresValidation: historicalHint ? aliasedCategory !== historicalHint.categoryName : false,
      source: 'supplemental',
    };
  }

  if (isPetLike(normalizedMerchant)) {
    return { categoryName: '🐈‍⬛ Nosferatu', requiresValidation: false, source: 'merchant' };
  }

  if (isBeautyLike(normalizedMerchant)) {
    return {
      categoryName: '🧴 Personal Care & Beauty',
      requiresValidation: false,
      source: 'merchant',
    };
  }

  if (isMedicineLike(normalizedMerchant)) {
    return { categoryName: '💊 Medicine', requiresValidation: false, source: 'merchant' };
  }

  if (isInsuranceLike(normalizedMerchant)) {
    return { categoryName: '🩺 Health Insurance', requiresValidation: false, source: 'merchant' };
  }

  if (isInvestmentLike(normalizedMerchant)) {
    return { categoryName: '📈 Investments', requiresValidation: false, source: 'merchant' };
  }

  if (isFeeLike(normalizedMerchant)) {
    return { categoryName: '💳 Bank Fees', requiresValidation: false, source: 'merchant' };
  }

  if (isTechLike(normalizedMerchant)) {
    return { categoryName: '🔌 Tech & Electronics', requiresValidation: false, source: 'merchant' };
  }

  if (isGasLike(normalizedMerchant)) {
    return { categoryName: '⛽ Gas', requiresValidation: false, source: 'merchant' };
  }

  if (isTransitLike(normalizedMerchant)) {
    return {
      categoryName: '🚕 Rideshare & Transit',
      requiresValidation: false,
      source: 'merchant',
    };
  }

  if (isFastFoodLike(normalizedMerchant)) {
    return { categoryName: '🍔 Fast Food', requiresValidation: false, source: 'merchant' };
  }

  if (isDiningLike(normalizedMerchant)) {
    return { categoryName: '🍽️ Dining Out', requiresValidation: false, source: 'merchant' };
  }

  if (isExperienceLike(normalizedMerchant)) {
    return { categoryName: '🎭 Experiences', requiresValidation: false, source: 'merchant' };
  }

  if (isHouseholdLike(normalizedMerchant)) {
    return {
      categoryName: '🧹 Household Supplies',
      requiresValidation: false,
      source: 'merchant',
    };
  }

  if (isHomeGoodsLike(normalizedMerchant)) {
    return {
      categoryName: '🪑 Home Goods & Furnishings',
      requiresValidation: false,
      source: 'merchant',
    };
  }

  if (isShoppingLike(normalizedMerchant)) {
    return {
      categoryName: '🛍️ Shopping / Marketplace',
      requiresValidation: false,
      source: 'merchant',
    };
  }

  switch (normalizedExternalCategory) {
    case 'groceries':
      return { categoryName: '🛒 Groceries', requiresValidation: false, source: 'supplemental' };
    case 'entertainment':
      return { categoryName: '🎭 Experiences', requiresValidation: false, source: 'supplemental' };
    case 'personal care':
      return {
        categoryName: '🧴 Personal Care & Beauty',
        requiresValidation: false,
        source: 'supplemental',
      };
    case 'travel vacation':
      return {
        categoryName: '✈️ One-Off / Travel',
        requiresValidation: false,
        source: 'supplemental',
      };
    case 'shopping':
      return {
        categoryName: '🛍️ Shopping / Marketplace',
        requiresValidation: false,
        source: 'supplemental',
      };
    case 'drinks dining':
      return {
        categoryName: '🍽️ Dining Out',
        requiresValidation: true,
        source: 'supplemental',
      };
    case 'auto transport':
    case 'household':
    case 'healthcare':
    case 'financial':
    case 'other':
      return { categoryName: null, requiresValidation: true, source: 'supplemental' };
    default:
      return {
        categoryName: historicalHint?.categoryName ?? null,
        requiresValidation: !historicalHint,
        source: historicalHint ? 'historical' : 'unknown',
      };
  }
}

function selectUniqueResolvedPlace(
  transaction: Transaction,
  candidateStays: TimelineStay[],
  placeCache: TimelinePlaceCacheFile,
): { place: TimelineResolvedPlace | null; blockedReason?: string } {
  const merchantText = transaction.imported_payee ?? transaction.payee_name ?? '';
  const resolvedCandidates = candidateStays
    .map((stay) => {
      const cacheEntry = placeCache.places[stay.placeKey];
      if (!cacheEntry) {
        return null;
      }

      return { stay, cacheEntry };
    })
    .filter((candidate): candidate is TimelineResolvedPlace => candidate !== null);

  if (resolvedCandidates.length === 0) {
    return { place: null };
  }

  const namedMatches = resolvedCandidates.filter((candidate) =>
    merchantNamesCompatible(merchantText, candidate.cacheEntry.resolvedName),
  );

  if (namedMatches.length === 1) {
    return { place: namedMatches[0] };
  }

  if (namedMatches.length > 1) {
    return {
      place: null,
      blockedReason: 'Multiple cached timeline venues matched this transaction.',
    };
  }
  return { place: null };
}

function buildTimelineNote(candidate: TimelineReconCandidate): string | null {
  if (candidate.status !== 'ready-confirmed' || !candidate.resolvedVenueName) {
    return null;
  }

  const location = candidate.resolvedMerchantClass
    ? `${candidate.resolvedVenueName} (${candidate.resolvedMerchantClass})`
    : candidate.resolvedVenueName;
  return `${TIMELINE_NOTE_PREFIX}${location}`;
}

export function mergeTimelineNotes(
  existing: string | null | undefined,
  noteText: string | null,
): string | undefined {
  if (!noteText) {
    return undefined;
  }

  const lines = (existing ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 && !line.startsWith(TIMELINE_NOTE_PREFIX));

  return [...lines, noteText].join('\n');
}

export function classifyTransaction(
  transaction: Transaction,
  accountNamesById: Map<string, string>,
  exactMatchLookup: Map<string, NormalizedSupplementalRow[]>,
  timeline: ParsedTimelineEntries,
  placeCache: TimelinePlaceCacheFile,
  categoryOverrides: TimelineCategoryOverridesFile,
  historicalHints: HistoricalHintIndex,
): TimelineReconCandidate {
  const payeeName = transaction.payee_name ?? transaction.imported_payee ?? '(Unknown payee)';
  const merchantKey = normalizeMerchantKey(transaction.imported_payee ?? transaction.payee_name);
  const historicalHint = getHistoricalHint(transaction, historicalHints);
  const exactMatch = findExactSupplementalMatch(transaction, exactMatchLookup);
  const candidateStays = findTimelineCandidatesForTransaction(transaction, timeline.stays);
  const resolvedPlaceResult = selectUniqueResolvedPlace(transaction, candidateStays, placeCache);
  const resolvedPlace = resolvedPlaceResult.place;
  const overrideCategory = getOverrideCategory(
    transaction,
    merchantKey,
    resolvedPlace?.stay.placeKey ?? null,
    categoryOverrides,
  );
  const resolution = resolveMappedCategoryName(
    payeeName,
    resolvedPlace?.cacheEntry.resolvedName ?? null,
    resolvedPlace?.cacheEntry.merchantClass ?? null,
    exactMatch.row?.category ?? null,
    historicalHint,
    overrideCategory,
  );
  const ruleIdentity = getRuleIdentity(transaction);

  const baseCandidate: TimelineReconCandidate = {
    transactionId: transaction.id,
    accountId: transaction.account,
    accountName:
      transaction.account_name ?? accountNamesById.get(transaction.account) ?? transaction.account,
    transactionDate: transaction.date,
    transactionAmountCents: transaction.amount,
    payeeName,
    importedPayee: transaction.imported_payee,
    currentCategoryName: transaction.category_name ?? null,
    supplementalCategory: exactMatch.row?.category ?? null,
    supplementalDescription: exactMatch.row?.description ?? null,
    supplementalStatementDescription: exactMatch.row?.statementDescription ?? null,
    exactMatchAccountName: exactMatch.row?.actualAccountName ?? null,
    historicalCategoryHintName: historicalHint?.categoryName ?? null,
    timelinePlaceKey: resolvedPlace?.stay.placeKey ?? candidateStays[0]?.placeKey ?? null,
    timelinePlaceId: resolvedPlace?.stay.placeId ?? candidateStays[0]?.placeId ?? null,
    timelineLatitude: resolvedPlace?.stay.latitude ?? candidateStays[0]?.latitude ?? null,
    timelineLongitude: resolvedPlace?.stay.longitude ?? candidateStays[0]?.longitude ?? null,
    timelineSearchUrl: resolvedPlace?.stay.searchUrl ?? candidateStays[0]?.searchUrl ?? null,
    resolvedVenueName: resolvedPlace?.cacheEntry.resolvedName ?? null,
    resolvedMerchantClass: resolvedPlace?.cacheEntry.merchantClass ?? null,
    confidenceTier: 'tier4-manual',
    status: 'manual',
    recommendedCategoryName: null,
    blockedReason: null,
    ruleField: ruleIdentity?.field,
    ruleValue: ruleIdentity?.value,
  };

  if (!isLocationEligibleTransaction(transaction)) {
    return {
      ...baseCandidate,
      blockedReason: 'Payment/transfer-style or otherwise location-ineligible transaction.',
    };
  }

  if (overrideCategory) {
    const noteText = buildTimelineNote({
      ...baseCandidate,
      status: 'ready-confirmed',
      resolvedVenueName: resolvedPlace?.cacheEntry.resolvedName ?? null,
      resolvedMerchantClass: resolvedPlace?.cacheEntry.merchantClass ?? null,
    });

    return {
      ...baseCandidate,
      status: 'ready-confirmed',
      confidenceTier: 'tier3-web-confirmed',
      recommendedCategoryName: overrideCategory,
      noteText,
    };
  }

  if (exactMatch.row) {
    if (resolution.categoryName && !resolution.requiresValidation) {
      return {
        ...baseCandidate,
        status: 'ready-exact',
        confidenceTier: 'tier1-exact',
        recommendedCategoryName: resolution.categoryName,
      };
    }

    if (resolution.categoryName && resolvedPlace) {
      const resolvedCategory = resolveMappedCategoryName(
        payeeName,
        resolvedPlace.cacheEntry.resolvedName,
        resolvedPlace.cacheEntry.merchantClass ?? null,
        exactMatch.row.category,
        historicalHint,
        null,
      );

      if (resolvedCategory.categoryName === resolution.categoryName) {
        const noteText = buildTimelineNote({
          ...baseCandidate,
          status: 'ready-confirmed',
          resolvedVenueName: resolvedPlace.cacheEntry.resolvedName,
          resolvedMerchantClass: resolvedPlace.cacheEntry.merchantClass ?? null,
        });

        return {
          ...baseCandidate,
          status: 'ready-confirmed',
          confidenceTier: 'tier2-validated',
          recommendedCategoryName: resolution.categoryName,
          noteText,
        };
      }
    }

    return {
      ...baseCandidate,
      blockedReason:
        exactMatch.blockedReason ??
        resolvedPlaceResult.blockedReason ??
        'Supplemental category requires timeline/web validation before apply.',
      recommendedCategoryName: resolution.categoryName,
    };
  }

  if (resolvedPlace && resolution.categoryName) {
    const noteText = buildTimelineNote({
      ...baseCandidate,
      status: 'ready-confirmed',
      resolvedVenueName: resolvedPlace.cacheEntry.resolvedName,
      resolvedMerchantClass: resolvedPlace.cacheEntry.merchantClass ?? null,
    });

    return {
      ...baseCandidate,
      status: 'ready-confirmed',
      confidenceTier: 'tier3-web-confirmed',
      recommendedCategoryName: resolution.categoryName,
      noteText,
    };
  }

  return {
    ...baseCandidate,
    blockedReason:
      exactMatch.blockedReason ??
      resolvedPlaceResult.blockedReason ??
      'No trustworthy supplemental or resolved timeline evidence.',
  };
}
