import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseCsv } from 'csv-parse/sync';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { createRule, getCategories, updateTransaction } from '../api/actual-client.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategoriesMap } from '../data/fetch-categories.js';
import { fetchAllRules } from '../data/fetch-rules.js';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../data/fetch-transactions.js';
import type { Account, Category, Transaction } from '../types/domain.js';
import type { RuleCondition, RuleData } from '../../tools/manage-entity/types.js';

const TIMELINE_ANALYSIS_VERSION = 1;
const RECON_START_DATE = '2025-08-01';
const RECON_END_DATE = '2026-03-26';
const TIMELINE_RECON_AUDIT_FILENAME = 'timeline-recon-audit.json';
const TIMELINE_RECON_CANDIDATES_FILENAME = 'timeline-recon-candidates.csv';
const TIMELINE_RECON_MANUAL_REVIEW_FILENAME = 'timeline-recon-manual-review.csv';
const TIMELINE_PLACE_CACHE_FILENAME = 'timeline-place-cache.json';
const TIMELINE_CATEGORY_OVERRIDES_FILENAME = 'timeline-category-overrides.json';
const SUPPLEMENTAL_TRANSACTIONS_FILENAME = '2026-03-26 23_17_40-transactions.csv';
const LOCATION_HISTORY_FILENAME = 'location-history.json';
const TIMELINE_NOTE_PREFIX = '[Timeline] ';
const MIN_PSEUDO_STAY_MINUTES = 30;
const MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS = 150;
const EXACT_MATCH_SHORT_TEXT_LENGTH = 5;
const MIN_HISTORICAL_HINT_COUNT = 2;
const MIN_HISTORICAL_HINT_CONFIDENCE = 0.75;
const MIN_RULE_CONFIRMATION_COUNT = 2;

const FAST_FOOD_KEYWORDS = [
  'taco',
  'burger',
  'pizza',
  'donut',
  'coffee',
  'tea',
  'boba',
  'ice cream',
  'frozen yogurt',
  'yogurt',
  'smoothie',
  'juice',
  'popeyes',
  'taco bell',
  'mcdonald',
  'wendy',
  'chipotle',
  'starbucks',
  'tim hortons',
  'happy lemon',
];

const DINING_KEYWORDS = [
  'restaurant',
  'bar',
  'cafe',
  'grill',
  'cantina',
  'kitchen',
  'beer garden',
  'food truck',
  'bakery',
];

const GAS_KEYWORDS = [
  'gas',
  'fuel',
  'shell',
  'chevron',
  'exxon',
  'murphy',
  'valero',
  'love',
  'stop',
  'convenience',
  'travel stop',
  'arco',
  '76',
  'select stop',
];

const RIDESHARE_KEYWORDS = ['uber', 'lyft', 'transit', 'metro', 'parking', 'toll', 'lime'];

const HOUSEHOLD_KEYWORDS = [
  'hardware',
  'home depot',
  'lowe',
  'ace',
  'ikea',
  'furniture',
  'world market',
  'detergent',
  'cleaner',
  'household',
  'paper towels',
  'toilet paper',
];

const PET_KEYWORDS = ['pretty litter', 'litter', 'cat', 'pet', 'vet', 'dog', 'aquacatsusa'];
const BEAUTY_KEYWORDS = ['beauty', 'salon', 'cosmetic', 'skin', 'hair', 'makeup', 'spa'];
const MEDICINE_KEYWORDS = ['pharmacy', 'medical', 'medicine', 'clinic', 'urgent care', 'drug'];
const HEALTH_INSURANCE_KEYWORDS = ['healthplan', 'insurance', 'health plan'];
const INVESTMENT_KEYWORDS = ['robinhood', 'kalshi', 'broker', 'stock', 'crypto', 'investment'];
const FEE_KEYWORDS = ['fee', 'interest', 'late fee', 'returned payment', 'payment returned'];
const GOVERNMENT_KEYWORDS = [
  'department',
  'dmv',
  'clerk',
  'county',
  'state',
  'city',
  'office',
  'permit',
  'tax',
  'public safety',
];
const EXPERIENCE_KEYWORDS = [
  'venue',
  'music',
  'concert',
  'theater',
  'museum',
  'festival',
  'club',
  'lounge',
  'stage',
  'cinema',
  'gallery',
];
const HOME_GOODS_KEYWORDS = ['furnishing', 'decor', 'home good', 'appliance', 'houseware'];
const SHOPPING_KEYWORDS = [
  'market',
  'store',
  'shop',
  'boutique',
  'mall',
  'retail',
  'target',
  'ross',
  'crocs',
];
const TECH_KEYWORDS = ['electronic', 'tech', 'apple store', 'best buy', 'oculus'];

const INELIGIBLE_MERCHANT_PATTERNS = [
  'payment',
  'bill payment',
  'automatic payment',
  'credit card payment',
  'balance transfer',
  'transfer',
  'to chase',
  'venmo',
  'zelle',
  'cash app',
  'apple cash',
  'alipay',
  'statebankin',
  'facebooktec',
  'pyl',
  'housing',
  'autopay',
  'statement',
  'ba electronic payment',
];

const EXTERNAL_CATEGORY_ALIASES: Record<string, string> = {
  groceries: '🛒 Groceries',
  shopping: '🛍️ Shopping / Marketplace',
  entertainment: '🎭 Experiences',
  'personal care': '🧴 Personal Care & Beauty',
  'travel vacation': '✈️ One-Off / Travel',
};

export interface TimelineReconPaths {
  repoRoot: string;
  reconDir: string;
  supplementalCsvPath: string;
  timelinePath: string;
  auditPath: string;
  candidatesPath: string;
  manualReviewPath: string;
  placeCachePath: string;
  categoryOverridesPath: string;
}

export interface TimelineVisitCandidate {
  probability?: string;
  semanticType?: string;
  placeID?: string;
  placeLocation?: string;
}

export interface TimelineVisitData {
  hierarchyLevel?: string;
  probability?: string;
  isTimelessVisit?: boolean;
  topCandidate?: TimelineVisitCandidate;
}

export interface TimelineActivityCandidate {
  probability?: string;
  type?: string;
}

export interface TimelineActivityData {
  probability?: string;
  start?: string;
  end?: string;
  distanceMeters?: string;
  topCandidate?: TimelineActivityCandidate;
}

export interface TimelinePathPoint {
  point: string;
  durationMinutesOffsetFromStartTime?: string;
}

export interface TimelineRawEntry {
  startTime?: string;
  endTime?: string;
  visit?: TimelineVisitData;
  activity?: TimelineActivityData;
  timelinePath?: TimelinePathPoint[];
}

export interface TimelineStay {
  source: 'visit' | 'timelinePath';
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  latitude: number;
  longitude: number;
  placeKey: string;
  placeId?: string;
  semanticType?: string;
  probability?: number;
  searchUrl: string;
}

export interface TimelineActivitySegment {
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  mode?: string;
  probability?: number;
  distanceMeters?: number;
}

export interface ParsedTimelineEntries {
  stays: TimelineStay[];
  activities: TimelineActivitySegment[];
}

export interface TimelinePlaceCacheEntry {
  resolvedName: string;
  merchantClass?: string;
  notes?: string;
  source?: string;
}

export interface TimelinePlaceCacheFile {
  places: Record<string, TimelinePlaceCacheEntry>;
}

export interface TimelineCategoryOverridesFile {
  transactions: Record<string, string>;
  merchantNames: Record<string, string>;
  placeKeys: Record<string, string>;
}

export interface SupplementalCsvRow {
  Date: string;
  Description: string;
  'Statement description': string;
  Type: string;
  Category: string;
  Amount: string;
  Account: string;
  Tags: string;
  Notes: string;
}

export interface NormalizedSupplementalRow {
  date: string;
  description: string;
  statementDescription: string;
  normalizedDescription: string;
  normalizedStatementDescription: string;
  type: string;
  category: string;
  amountCents: number;
  accountName: string;
  actualAccountId: string | null;
  actualAccountName: string | null;
  notes: string;
}

export interface HistoricalCategoryHint {
  categoryId: string;
  categoryName: string;
  count: number;
  total: number;
  confidence: number;
  source: 'imported_payee' | 'payee_name';
}

export interface TimelineResolvedPlace {
  stay: TimelineStay;
  cacheEntry: TimelinePlaceCacheEntry;
}

export type TimelineReconStatus = 'ready-exact' | 'ready-confirmed' | 'manual';
export type TimelineReconConfidenceTier =
  | 'tier1-exact'
  | 'tier2-validated'
  | 'tier3-web-confirmed'
  | 'tier4-manual';

export interface TimelineReconCandidate {
  transactionId: string;
  accountId: string;
  accountName: string;
  transactionDate: string;
  transactionAmountCents: number;
  payeeName: string;
  importedPayee?: string | null;
  currentCategoryName?: string | null;
  supplementalCategory?: string | null;
  supplementalDescription?: string | null;
  supplementalStatementDescription?: string | null;
  exactMatchAccountName?: string | null;
  historicalCategoryHintName?: string | null;
  timelinePlaceKey?: string | null;
  timelinePlaceId?: string | null;
  timelineLatitude?: number | null;
  timelineLongitude?: number | null;
  timelineSearchUrl?: string | null;
  resolvedVenueName?: string | null;
  resolvedMerchantClass?: string | null;
  confidenceTier: TimelineReconConfidenceTier;
  status: TimelineReconStatus;
  recommendedCategoryName?: string | null;
  blockedReason?: string | null;
  ruleField?: 'payee' | 'imported_payee';
  ruleValue?: string;
  noteText?: string | null;
}

export interface TimelineReconAuditSummary {
  startDate: string;
  endDate: string;
  totalUncategorizedTransactions: number;
  locationEligibleTransactions: number;
  locationIneligibleTransactions: number;
  exactReadyCount: number;
  confirmedReadyCount: number;
  manualCount: number;
  ruleEligibleCount: number;
  warningCount: number;
}

export interface TimelineReconAuditFile {
  version: number;
  generatedAt: string;
  startDate: string;
  endDate: string;
  summary: TimelineReconAuditSummary;
  candidates: TimelineReconCandidate[];
  manualReviews: TimelineReconCandidate[];
  warnings: string[];
}

export interface BuildTimelineReconAuditInput {
  accounts: Account[];
  transactions: Transaction[];
  categoriesById: Record<string, Category>;
  supplementalRows: NormalizedSupplementalRow[];
  timeline: ParsedTimelineEntries;
  placeCache?: TimelinePlaceCacheFile;
  categoryOverrides?: TimelineCategoryOverridesFile;
  rules?: RuleEntity[];
  startDate?: string;
  endDate?: string;
}

export interface TimelineApplyResult {
  exactUpdatesApplied: number;
  confirmedUpdatesApplied: number;
  skippedMissingTransactions: number;
  skippedChangedTransactions: number;
  skippedManualCandidates: number;
  rulesCreated: string[];
}

interface CurrentTransactionSnapshot {
  id: string;
  date: string;
  amountCents: number;
  payeeName: string;
  importedPayee: string | null;
  categoryName: string | null;
  notes: string | null;
  isParent: boolean;
  isChild: boolean;
  transferId: string | null;
}

interface CategoryResolution {
  categoryName: string | null;
  requiresValidation: boolean;
  source: string;
}

interface SupplementalExactMatchResult {
  row: NormalizedSupplementalRow | null;
  blockedReason?: string;
}

interface HistoricalHintIndex {
  importedPayee: Map<string, HistoricalCategoryHint>;
  payeeName: Map<string, HistoricalCategoryHint>;
}

function repoRootFromModule(): string {
  return resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
}

export function resolveTimelineReconPaths(repoRoot = repoRootFromModule()): TimelineReconPaths {
  const reconDir = resolve(repoRoot, '3-26-recon');

  return {
    repoRoot,
    reconDir,
    supplementalCsvPath: resolve(reconDir, SUPPLEMENTAL_TRANSACTIONS_FILENAME),
    timelinePath: resolve(reconDir, LOCATION_HISTORY_FILENAME),
    auditPath: resolve(reconDir, TIMELINE_RECON_AUDIT_FILENAME),
    candidatesPath: resolve(reconDir, TIMELINE_RECON_CANDIDATES_FILENAME),
    manualReviewPath: resolve(reconDir, TIMELINE_RECON_MANUAL_REVIEW_FILENAME),
    placeCachePath: resolve(reconDir, TIMELINE_PLACE_CACHE_FILENAME),
    categoryOverridesPath: resolve(reconDir, TIMELINE_CATEGORY_OVERRIDES_FILENAME),
  };
}

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComparisonText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeMerchantKey(value: string | null | undefined): string {
  return normalizeComparisonText(value).replace(/\s+/g, ' ');
}

function parseMoneyToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, ''));

  if (!Number.isFinite(parsed)) {
    throw new Error(`Unable to parse monetary value: ${value}`);
  }

  return Math.round(parsed * 100);
}

function parseProbability(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toLocalDateKey(timestamp: string | undefined): string | null {
  return timestamp && /^\d{4}-\d{2}-\d{2}/.test(timestamp) ? timestamp.slice(0, 10) : null;
}

function dateKeyToMillis(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function diffCalendarDays(dateA: string, dateB: string): number {
  return Math.round((dateKeyToMillis(dateA) - dateKeyToMillis(dateB)) / (1000 * 60 * 60 * 24));
}

function isDateRangeOverlapping(
  startDate: string | null,
  endDate: string | null,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  return !(endDate < rangeStart || startDate > rangeEnd);
}

function parseGeoPoint(value: string | undefined): { latitude: number; longitude: number } | null {
  if (!value) {
    return null;
  }

  const match = /^geo:([-0-9.]+),([-0-9.]+)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const latitude = Number.parseFloat(match[1]);
  const longitude = Number.parseFloat(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function buildMapsSearchUrl(latitude: number, longitude: number, placeId?: string): string {
  const coords = `${latitude},${longitude}`;
  return placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}&query_place_id=${encodeURIComponent(placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
}

function buildPlaceKey(placeId: string | undefined, latitude: number, longitude: number): string {
  return placeId ? `place:${placeId}` : `coord:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function haversineDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const lat1 = toRadians(left.latitude);
  const lat2 = toRadians(right.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function meanCoordinate(points: Array<{ latitude: number; longitude: number }>): {
  latitude: number;
  longitude: number;
} {
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
}

function buildVisitStay(entry: TimelineRawEntry): TimelineStay | null {
  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);
  const point = parseGeoPoint(entry.visit?.topCandidate?.placeLocation);

  if (!entry.startTime || !entry.endTime || !startDate || !endDate || !point) {
    return null;
  }

  const durationMinutes = Math.max(
    1,
    Math.round((Date.parse(entry.endTime) - Date.parse(entry.startTime)) / (1000 * 60)),
  );
  const placeId = normalizeString(entry.visit?.topCandidate?.placeID ?? undefined) ?? undefined;
  const placeKey = buildPlaceKey(placeId, point.latitude, point.longitude);

  return {
    source: 'visit',
    startTime: entry.startTime,
    endTime: entry.endTime,
    startDate,
    endDate,
    durationMinutes,
    latitude: point.latitude,
    longitude: point.longitude,
    placeKey,
    placeId,
    semanticType:
      normalizeString(entry.visit?.topCandidate?.semanticType ?? undefined) ?? undefined,
    probability: parseProbability(entry.visit?.topCandidate?.probability),
    searchUrl: buildMapsSearchUrl(point.latitude, point.longitude, placeId),
  };
}

function buildActivitySegment(entry: TimelineRawEntry): TimelineActivitySegment | null {
  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);

  if (!entry.startTime || !entry.endTime || !startDate || !endDate) {
    return null;
  }

  const start = parseGeoPoint(entry.activity?.start);
  const end = parseGeoPoint(entry.activity?.end);

  return {
    startTime: entry.startTime,
    endTime: entry.endTime,
    startDate,
    endDate,
    startLatitude: start?.latitude,
    startLongitude: start?.longitude,
    endLatitude: end?.latitude,
    endLongitude: end?.longitude,
    mode: normalizeString(entry.activity?.topCandidate?.type ?? undefined) ?? undefined,
    probability: parseProbability(entry.activity?.topCandidate?.probability),
    distanceMeters: parseProbability(entry.activity?.distanceMeters),
  };
}

function buildTimelinePathPseudoStays(entry: TimelineRawEntry): TimelineStay[] {
  if (
    !entry.startTime ||
    !entry.endTime ||
    !entry.timelinePath ||
    entry.timelinePath.length === 0
  ) {
    return [];
  }

  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);

  if (!startDate || !endDate) {
    return [];
  }

  const totalDurationMinutes = Math.max(
    0,
    Math.round((Date.parse(entry.endTime) - Date.parse(entry.startTime)) / (1000 * 60)),
  );

  const points = entry.timelinePath
    .map((point) => {
      const coords = parseGeoPoint(point.point);

      if (!coords) {
        return null;
      }

      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        offsetMinutes: parseInteger(point.durationMinutesOffsetFromStartTime) ?? 0,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .sort((left, right) => left.offsetMinutes - right.offsetMinutes);

  if (points.length === 0) {
    return [];
  }

  if (points.length === 1 && totalDurationMinutes >= MIN_PSEUDO_STAY_MINUTES) {
    const point = points[0];
    const placeKey = buildPlaceKey(undefined, point.latitude, point.longitude);

    return [
      {
        source: 'timelinePath',
        startTime: entry.startTime,
        endTime: entry.endTime,
        startDate,
        endDate,
        durationMinutes: totalDurationMinutes,
        latitude: point.latitude,
        longitude: point.longitude,
        placeKey,
        searchUrl: buildMapsSearchUrl(point.latitude, point.longitude),
      },
    ];
  }

  const clusters: Array<{
    startOffset: number;
    endOffset: number;
    points: Array<{ latitude: number; longitude: number }>;
  }> = [];
  let currentCluster: {
    startOffset: number;
    endOffset: number;
    points: Array<{ latitude: number; longitude: number }>;
  } | null = null;

  points.forEach((point, index) => {
    const nextOffset = points[index + 1]?.offsetMinutes ?? totalDurationMinutes;

    if (!currentCluster) {
      currentCluster = {
        startOffset: point.offsetMinutes,
        endOffset: nextOffset,
        points: [{ latitude: point.latitude, longitude: point.longitude }],
      };
      return;
    }

    const centroid = meanCoordinate(currentCluster.points);
    const distance = haversineDistanceMeters(centroid, point);

    if (distance <= MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS) {
      currentCluster.points.push({ latitude: point.latitude, longitude: point.longitude });
      currentCluster.endOffset = nextOffset;
      return;
    }

    clusters.push(currentCluster);
    currentCluster = {
      startOffset: point.offsetMinutes,
      endOffset: nextOffset,
      points: [{ latitude: point.latitude, longitude: point.longitude }],
    };
  });

  if (currentCluster) {
    clusters.push(currentCluster);
  }

  const pseudoStays: TimelineStay[] = [];

  for (const cluster of clusters) {
    const durationMinutes = cluster.endOffset - cluster.startOffset;

    if (durationMinutes < MIN_PSEUDO_STAY_MINUTES) {
      continue;
    }

    const centroid = meanCoordinate(cluster.points);
    const placeKey = buildPlaceKey(undefined, centroid.latitude, centroid.longitude);
    const clusterStartTime = new Date(
      Date.parse(entry.startTime) + cluster.startOffset * 60 * 1000,
    ).toISOString();
    const clusterEndTime = new Date(
      Date.parse(entry.startTime) + cluster.endOffset * 60 * 1000,
    ).toISOString();

    pseudoStays.push({
      source: 'timelinePath',
      startTime: clusterStartTime,
      endTime: clusterEndTime,
      startDate: toLocalDateKey(clusterStartTime) ?? startDate,
      endDate: toLocalDateKey(clusterEndTime) ?? endDate,
      durationMinutes,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      placeKey,
      searchUrl: buildMapsSearchUrl(centroid.latitude, centroid.longitude),
    });
  }

  return pseudoStays;
}

export function parseTimelineEntries(
  rawEntries: TimelineRawEntry[],
  startDate = RECON_START_DATE,
  endDate = RECON_END_DATE,
): ParsedTimelineEntries {
  const stays: TimelineStay[] = [];
  const activities: TimelineActivitySegment[] = [];

  for (const entry of rawEntries) {
    const entryStartDate = toLocalDateKey(entry.startTime);
    const entryEndDate = toLocalDateKey(entry.endTime);

    if (!isDateRangeOverlapping(entryStartDate, entryEndDate, startDate, endDate)) {
      continue;
    }

    if (entry.visit) {
      const stay = buildVisitStay(entry);
      if (stay) {
        stays.push(stay);
      }
      continue;
    }

    if (entry.activity) {
      const activity = buildActivitySegment(entry);
      if (activity) {
        activities.push(activity);
      }
      continue;
    }

    if (entry.timelinePath) {
      stays.push(...buildTimelinePathPseudoStays(entry));
    }
  }

  stays.sort((left, right) => left.startTime.localeCompare(right.startTime));
  activities.sort((left, right) => left.startTime.localeCompare(right.startTime));

  return { stays, activities };
}

function parseCsvRows<T>(csvText: string): T[] {
  return parseCsv(csvText, {
    bom: true,
    columns: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as T[];
}

function tokenizeForMatching(value: string): string[] {
  return normalizeComparisonText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function resolveSupplementalAccount(
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

function normalizeSupplementalRows(
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

function merchantNamesCompatible(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeMerchantKey(left);
  const normalizedRight = normalizeMerchantKey(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorter =
    normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft;

  if (shorter.length >= EXACT_MATCH_SHORT_TEXT_LENGTH && longer.includes(shorter)) {
    return true;
  }

  const leftTokens = tokenizeForMatching(normalizedLeft);
  const rightTokens = tokenizeForMatching(normalizedRight);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
  return overlap >= Math.min(leftTokens.length, rightTokens.length);
}

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

function isLocationEligibleTransaction(transaction: Transaction): boolean {
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

function buildHistoricalHintIndex(
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

function parseTimelineJson(contents: string): TimelineRawEntry[] {
  const parsed = JSON.parse(contents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Timeline export must be a JSON array.');
  }

  return parsed as TimelineRawEntry[];
}

function buildSupplementalLookupKey(
  date: string,
  amountCents: number,
  accountId: string | null,
): string {
  return [date, amountCents, accountId ?? 'unmapped'].join('|');
}

function findExactSupplementalMatch(
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

function mergeTimelineNotes(
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

function classifyTransaction(
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
        const order: TimelineReconStatus[] = ['ready-exact', 'ready-confirmed', 'manual'];
        return order.indexOf(left.status) - order.indexOf(right.status);
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
  const locationEligibleTransactions = uncategorized.filter(isLocationEligibleTransaction).length;
  const warnings: string[] = [];

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
      ruleEligibleCount: candidates.filter(
        (candidate) =>
          candidate.status !== 'manual' && candidate.ruleField !== undefined && candidate.ruleValue,
      ).length,
      warningCount: warnings.length,
    },
    candidates,
    manualReviews,
    warnings,
  };
}

async function ensureJsonFile<T>(path: string, defaultValue: T): Promise<T> {
  await mkdir(dirname(path), { recursive: true });

  if (!existsSync(path)) {
    await writeFile(path, `${JSON.stringify(defaultValue, null, 2)}\n`, 'utf8');
    return defaultValue;
  }

  const contents = await readFile(path, 'utf8');
  return JSON.parse(contents) as T;
}

async function writeAuditOutputs(
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

function buildCurrentTransactionMap(
  transactions: Transaction[],
): Map<string, CurrentTransactionSnapshot> {
  return new Map(
    transactions.map((transaction) => [
      transaction.id,
      {
        id: transaction.id,
        date: transaction.date,
        amountCents: transaction.amount,
        payeeName: transaction.payee_name ?? '',
        importedPayee: transaction.imported_payee ?? null,
        categoryName: transaction.category_name ?? null,
        notes: transaction.notes ?? null,
        isParent: Boolean(transaction.is_parent),
        isChild: Boolean(transaction.is_child),
        transferId: transaction.transfer_id ?? null,
      },
    ]),
  );
}

function buildRulePayload(candidate: TimelineReconCandidate, categoryId: string): RuleData | null {
  if (!candidate.ruleField || !candidate.ruleValue) {
    return null;
  }

  const conditions: RuleCondition[] = [
    {
      field: 'account',
      op: 'is',
      value: candidate.accountId,
    },
    {
      field: candidate.ruleField,
      op: 'is',
      value: candidate.ruleValue,
    },
  ];

  return {
    stage: 'default',
    conditionsOp: 'and',
    conditions,
    actions: [
      {
        field: 'category',
        op: 'set',
        value: categoryId,
      },
    ],
  };
}

function hasExistingExactRule(
  rules: RuleEntity[],
  candidate: TimelineReconCandidate,
  categoryId: string,
): boolean {
  if (!candidate.ruleField || !candidate.ruleValue) {
    return true;
  }

  return rules.some((rule) => {
    const conditions = rule.conditions ?? [];
    const actions = rule.actions ?? [];
    const hasAccountCondition = conditions.some(
      (condition) =>
        condition.field === 'account' &&
        condition.op === 'is' &&
        condition.value === candidate.accountId,
    );
    const hasMerchantCondition = conditions.some(
      (condition) =>
        condition.field === candidate.ruleField &&
        condition.op === 'is' &&
        condition.value === candidate.ruleValue,
    );
    const hasCategoryAction = actions.some(
      (action) =>
        'field' in action &&
        action.field === 'category' &&
        action.op === 'set' &&
        action.value === categoryId,
    );

    return hasAccountCondition && hasMerchantCondition && hasCategoryAction;
  });
}

async function loadReconInputs(paths: TimelineReconPaths): Promise<{
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
