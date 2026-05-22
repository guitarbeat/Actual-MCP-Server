import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import type {
  CurrentTransactionSnapshot,
  BuildTimelineReconAuditInput,
  TimelineReconAuditFile,
} from './types.js';
import {
  buildTimelineReconAudit,
  applyTimelineReconAudit,
  generateTimelineReconAudit,
} from './internal.js';
import { TIMELINE_ANALYSIS_VERSION } from './constants.js';
import * as ioModule from './io.js';
import * as applySupportModule from './apply-support.js';
import * as pathsModule from './paths.js';
import * as actualClientModule from '../../api/actual-client.js';
import * as fetchAccountsModule from '../../data/fetch-accounts.js';
import * as fetchRulesModule from '../../data/fetch-rules.js';
import * as fetchTransactionsModule from '../../data/fetch-transactions.js';

vi.mock('node:fs/promises');

vi.mock('./io.js', () => ({
  loadReconInputs: vi.fn(),
  writeAuditOutputs: vi.fn(),
}));

vi.mock('../../api/actual-client.js', () => ({
  createRule: vi.fn(),
  getCategories: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock('../../data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../../data/fetch-rules.js', () => ({
  fetchAllRules: vi.fn(),
}));

vi.mock('../../data/fetch-transactions.js', () => ({
  fetchAllOnBudgetTransactionsWithMetadata: vi.fn(),
}));

vi.mock('./paths.js', () => ({
  resolveTimelineReconPaths: vi.fn(),
}));

vi.mock('./apply-support.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./apply-support.js')>();
  return {
    ...actual,
    buildCurrentTransactionMap: vi.fn(),
    hasExistingExactRule: vi.fn(),
    buildRulePayload: vi.fn(),
  };
});

describe('Timeline Reconciliation Internal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('buildTimelineReconAudit', () => {
    it('should build an empty audit correctly', () => {
      const input: BuildTimelineReconAuditInput = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        transactions: [],
        accounts: [],
        // @ts-expect-error - testing mock
        categoriesById: new Map(),
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
      };

      const audit = buildTimelineReconAudit(input);

      expect(audit.version).toBe(TIMELINE_ANALYSIS_VERSION);
      expect(audit.startDate).toBe('2025-01-01');
      expect(audit.endDate).toBe('2025-01-31');
      expect(audit.summary.totalUncategorizedTransactions).toBe(0);
      expect(audit.candidates).toEqual([]);
      expect(audit.manualReviews).toEqual([]);
      expect(audit.warnings).toEqual([]);
    });

    it('should process uncategorized transactions and populate candidates', () => {
      const input: BuildTimelineReconAuditInput = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        transactions: [
          {
            id: 't1',
            date: '2025-01-15',
            // @ts-expect-error - testing mock
            amountCents: 1500,
            payeeName: 'Test Payee',
            accountId: 'a1',
            accountName: 'Test Account',
            importedPayee: 'Imported Test Payee',
            notes: 'Test Note',
            transferId: null,
            isParent: false,
            isChild: false,
            categoryName: null,
            category: null,
          },
        ],
        accounts: [{ id: 'a1', name: 'Test Account', type: 'checking', closed: false }],
        // @ts-expect-error - testing mock
        categoriesById: new Map([['c1', { id: 'c1', name: 'Test Category', is_income: false }]]),
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
        placeCache: { places: {} },
        categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} },
      };

      const audit = buildTimelineReconAudit(input);

      expect(audit.summary.totalUncategorizedTransactions).toBe(1);
      expect(audit.candidates).toHaveLength(1);
      expect(audit.candidates[0].transactionId).toBe('t1');
      expect(audit.candidates[0].status).toBe('manual'); // Since there's no matching exact rule or hint
      expect(audit.manualReviews).toHaveLength(1);
    });
  });

  describe('generateTimelineReconAudit', () => {
    it('should generate audit and write outputs', async () => {
      const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };
      // @ts-expect-error - testing mock
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const mockInput = {
        transactions: [],
        accounts: [],
        categoriesById: new Map(),
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
      };
      vi.mocked(ioModule.loadReconInputs).mockResolvedValue(
        // @ts-expect-error - testing mock
        mockInput as unknown as BuildTimelineReconAuditInput,
      );
      vi.mocked(ioModule.writeAuditOutputs).mockResolvedValue(undefined);

      const audit = await generateTimelineReconAudit();

      expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths);
      expect(ioModule.writeAuditOutputs).toHaveBeenCalledWith(expect.anything(), paths);
      expect(audit.version).toBe(TIMELINE_ANALYSIS_VERSION);
    });
  });

  describe('applyTimelineReconAudit', () => {
    it('should apply audit and update transactions', async () => {
      const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };
      // @ts-expect-error - testing mock
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const mockAudit: TimelineReconAuditFile = {
        version: TIMELINE_ANALYSIS_VERSION,
        generatedAt: '2025-01-01T00:00:00Z',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        summary: {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          totalUncategorizedTransactions: 1,
          locationEligibleTransactions: 1,
          locationIneligibleTransactions: 0,
          exactReadyCount: 1,
          confirmedReadyCount: 0,
          manualCount: 0,
          ruleEligibleCount: 0,
          warningCount: 0,
        },
        candidates: [
          {
            transactionId: 't1',
            transactionDate: '2025-01-15',
            transactionAmountCents: 1500,
            accountId: 'a1',
            accountName: 'Test Account',
            payeeName: 'Test Payee',
            importedPayee: 'Imported Test Payee',
            status: 'ready-exact',
            recommendedCategoryName: 'Test Category',
            noteText: 'Reconciled',
            matchedPlaceKey: null,
            matchedMerchant: null,
            // @ts-expect-error - testing mock
            ruleField: null,
            // @ts-expect-error - testing mock
            ruleValue: null,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          },
        ],
        manualReviews: [],
        warnings: [],
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        // @ts-expect-error - testing mock
        { transactions: [] },
      );

      const mockCurrentTransaction = {
        id: 't1',
        date: '2025-01-15',
        amountCents: 1500,
        payeeName: 'Test Payee',
        accountId: 'a1',
        accountName: 'Test Account',
        importedPayee: 'Imported Test Payee',
        notes: 'Test Note',
        transferId: null,
        isParent: false,
        isChild: false,
        categoryName: null,
        category: null,
      };

      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(
        new Map([['t1', mockCurrentTransaction as unknown as CurrentTransactionSnapshot]]),
      );
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        // @ts-expect-error - testing mock
        { id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);
      vi.mocked(actualClientModule.updateTransaction).mockResolvedValue();

      // @ts-expect-error - testing mock
      const result = await applyTimelineReconAudit(paths);

      expect(actualClientModule.updateTransaction).toHaveBeenCalledWith('t1', {
        category: 'c1',
        notes: expect.stringContaining('Reconciled'),
        subtransactions: undefined,
      });

      expect(result.exactUpdatesApplied).toBe(1);
      expect(result.skippedMissingTransactions).toBe(0);
      expect(result.skippedChangedTransactions).toBe(0);
      expect(result.skippedManualCandidates).toBe(0);
      expect(result.rulesCreated).toEqual([]);
    });

    it('should throw an error for unsupported audit version', async () => {
      const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };
      // @ts-expect-error - testing mock
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const invalidAudit = { version: 999 };
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidAudit));

      // @ts-expect-error - testing mock
      await expect(applyTimelineReconAudit(paths)).rejects.toThrow(
        'Unsupported timeline recon audit version 999',
      );
    });

    it('should skip manual candidates', async () => {
      const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };
      // @ts-expect-error - testing mock
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const mockAudit: TimelineReconAuditFile = {
        version: TIMELINE_ANALYSIS_VERSION,
        generatedAt: '2025-01-01T00:00:00Z',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        summary: {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          totalUncategorizedTransactions: 1,
          locationEligibleTransactions: 1,
          locationIneligibleTransactions: 0,
          exactReadyCount: 0,
          confirmedReadyCount: 0,
          manualCount: 1,
          ruleEligibleCount: 0,
          warningCount: 0,
        },
        candidates: [
          {
            transactionId: 't1',
            transactionDate: '2025-01-15',
            transactionAmountCents: 1500,
            accountId: 'a1',
            accountName: 'Test Account',
            payeeName: 'Test Payee',
            importedPayee: 'Imported Test Payee',
            status: 'manual',
            recommendedCategoryName: 'Test Category',
            noteText: 'Needs review',
            matchedPlaceKey: null,
            matchedMerchant: null,
            // @ts-expect-error - testing mock
            ruleField: null,
            // @ts-expect-error - testing mock
            ruleValue: null,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          },
        ],
        manualReviews: [],
        warnings: [],
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        // @ts-expect-error - testing mock
        { transactions: [] },
      );
      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(new Map());
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        // @ts-expect-error - testing mock
        { id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);

      // @ts-expect-error - testing mock
      const result = await applyTimelineReconAudit(paths);

      expect(result.skippedManualCandidates).toBe(1);
      expect(actualClientModule.updateTransaction).not.toHaveBeenCalled();
    });

    it('should skip missing transactions', async () => {
      const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };
      // @ts-expect-error - testing mock
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const mockAudit: TimelineReconAuditFile = {
        version: TIMELINE_ANALYSIS_VERSION,
        generatedAt: '2025-01-01T00:00:00Z',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        summary: {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          totalUncategorizedTransactions: 1,
          locationEligibleTransactions: 1,
          locationIneligibleTransactions: 0,
          exactReadyCount: 1,
          confirmedReadyCount: 0,
          manualCount: 0,
          ruleEligibleCount: 0,
          warningCount: 0,
        },
        candidates: [
          {
            transactionId: 't1',
            transactionDate: '2025-01-15',
            transactionAmountCents: 1500,
            accountId: 'a1',
            accountName: 'Test Account',
            payeeName: 'Test Payee',
            importedPayee: 'Imported Test Payee',
            status: 'ready-exact',
            recommendedCategoryName: 'Test Category',
            noteText: 'Reconciled',
            matchedPlaceKey: null,
            matchedMerchant: null,
            // @ts-expect-error - testing mock
            ruleField: null,
            // @ts-expect-error - testing mock
            ruleValue: null,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          },
        ],
        manualReviews: [],
        warnings: [],
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        // @ts-expect-error - testing mock
        { transactions: [] },
      );
      // Return empty map so the transaction is "missing"
      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(new Map());
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        // @ts-expect-error - testing mock
        { id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);

      // @ts-expect-error - testing mock
      const result = await applyTimelineReconAudit(paths);

      expect(result.skippedMissingTransactions).toBe(1);
      expect(actualClientModule.updateTransaction).not.toHaveBeenCalled();
    });
  });
});
