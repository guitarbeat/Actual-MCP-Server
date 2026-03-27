import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import type { Account, Category, Transaction } from '../../types/domain.js';

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

export interface CurrentTransactionSnapshot {
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

export interface CategoryResolution {
  categoryName: string | null;
  requiresValidation: boolean;
  source: string;
}

export interface SupplementalExactMatchResult {
  row: NormalizedSupplementalRow | null;
  blockedReason?: string;
}

export interface HistoricalHintIndex {
  importedPayee: Map<string, HistoricalCategoryHint>;
  payeeName: Map<string, HistoricalCategoryHint>;
}
