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
        categoriesById: {},
        supplementalRows: [],
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
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
            amount: 1500,
            payee_name: 'Test Payee',
            account: 'a1',
            account_name: 'Test Account',
            imported_payee: 'Imported Test Payee',
            notes: 'Test Note',
            transferId: null,
            isParent: false,
            isChild: false,
            categoryName: null,
            category: null,
          },
        ],
        accounts: [{ id: 'a1', name: 'Test Account', type: 'checking', closed: false }],
        categoriesById: new Map([['c1', { id: 'c1', name: 'Test Category', is_income: false }]]),
        supplementalRows: [],
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
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
      const paths: any = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      } as any;
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const mockInput = {
        transactions: [],
        accounts: [],
        categoriesById: {},
        supplementalRows: [],
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
        placeCache: {} as any,
        categoryOverrides: {} as any,
      } as any;
      vi.mocked(ioModule.loadReconInputs).mockResolvedValue(
        mockInput as any as BuildTimelineReconAuditInput,
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
      const paths: any = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      } as any;
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
            account: 'a1',
            account_name: 'Test Account',
            payee_name: 'Test Payee',
            imported_payee: 'Imported Test Payee',
            status: 'ready-exact',
            recommendedCategoryName: 'Test Category',
            noteText: 'Reconciled',
            placeId: null,
            placeName: null,
            ruleField: undefined as any,
            ruleValue: undefined as any,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          } as any,
        ],
        manualReviews: [],
        warnings: [],
      } as any;

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        { transactions: [], successfulAccountIds: [], warnings: [] },
      );

      const mockCurrentTransaction = {
        id: 't1',
        date: '2025-01-15',
        amount: 1500,
        payee_name: 'Test Payee',
        account: 'a1',
        account_name: 'Test Account',
        imported_payee: 'Imported Test Payee',
        notes: 'Test Note',
        transferId: null,
        isParent: false,
        isChild: false,
        categoryName: null,
        category: null,
      } as any;

      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(
        new Map([['t1', mockCurrentTransaction as unknown as CurrentTransactionSnapshot]]),
      );
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);
      vi.mocked(actualClientModule.updateTransaction).mockResolvedValue();

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
      const paths: any = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      } as any;
      vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths);

      const invalidAudit = { version: 999 } as any;
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidAudit));

      await expect(applyTimelineReconAudit(paths)).rejects.toThrow(
        'Unsupported timeline recon audit version 999',
      );
    });

    it('should skip manual candidates', async () => {
      const paths: any = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      } as any;
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
            account: 'a1',
            account_name: 'Test Account',
            payee_name: 'Test Payee',
            imported_payee: 'Imported Test Payee',
            status: 'manual',
            recommendedCategoryName: 'Test Category',
            noteText: 'Needs review',
            placeId: null,
            placeName: null,
            ruleField: undefined as any,
            ruleValue: undefined as any,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          } as any,
        ],
        manualReviews: [],
        warnings: [],
      } as any;

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        { transactions: [], successfulAccountIds: [], warnings: [] },
      );
      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue({} as any);
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);

      const result = await applyTimelineReconAudit(paths);

      expect(result.skippedManualCandidates).toBe(1);
      expect(actualClientModule.updateTransaction).not.toHaveBeenCalled();
    });

    it('should skip missing transactions', async () => {
      const paths: any = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      } as any;
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
            account: 'a1',
            account_name: 'Test Account',
            payee_name: 'Test Payee',
            imported_payee: 'Imported Test Payee',
            status: 'ready-exact',
            recommendedCategoryName: 'Test Category',
            noteText: 'Reconciled',
            placeId: null,
            placeName: null,
            ruleField: undefined as any,
            ruleValue: undefined as any,
            blockedReason: null,
            reconciliationStrategy: 'exact',
          } as any,
        ],
        manualReviews: [],
        warnings: [],
      } as any;

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockAudit));
      vi.mocked(fetchAccountsModule.fetchAllAccounts).mockResolvedValue([]);
      vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
        { transactions: [], successfulAccountIds: [], warnings: [] },
      );
      // Return empty map so the transaction is "missing"
      vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue({} as any);
      vi.mocked(actualClientModule.getCategories).mockResolvedValue([
        { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' },
      ]);
      vi.mocked(fetchRulesModule.fetchAllRules).mockResolvedValue([]);

      const result = await applyTimelineReconAudit(paths);

      expect(result.skippedMissingTransactions).toBe(1);
      expect(actualClientModule.updateTransaction).not.toHaveBeenCalled();
    });
  });
});
