import { describe, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { applyTimelineReconAudit } from './internal.js';
import * as actualClientModule from '../../api/actual-client.js';
import * as fetchAccountsModule from '../../data/fetch-accounts.js';
import * as fetchRulesModule from '../../data/fetch-rules.js';
import * as fetchTransactionsModule from '../../data/fetch-transactions.js';
import { TIMELINE_ANALYSIS_VERSION } from './constants.js';

describe('applyTimelineReconAudit Benchmark', () => {
  it('should run quickly for many rules', async () => {
    vi.spyOn(actualClientModule, 'updateTransaction').mockResolvedValue(undefined);
    vi.spyOn(actualClientModule, 'createRule').mockImplementation(async () => {
      // simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return undefined;
    });
    vi.spyOn(actualClientModule, 'getCategories').mockResolvedValue([
      { id: 'c1', name: 'Category 1', is_income: false, is_hidden: false, group_id: 'g1' },
    ]);
    vi.spyOn(fetchAccountsModule, 'fetchAllAccounts').mockResolvedValue([]);
    vi.spyOn(fetchRulesModule, 'fetchAllRules').mockResolvedValue([]);
    vi.spyOn(fetchTransactionsModule, 'fetchAllOnBudgetTransactionsWithMetadata').mockResolvedValue(
      { transactions: [], accounts: [] },
    );

    const mockAudit = {
      version: TIMELINE_ANALYSIS_VERSION,
      candidates: [],
    };

    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 3; j++) {
        // @ts-expect-error - testing mock
        mockAudit.candidates.push({
          status: 'ready-exact',
          transactionId: `t${i}_${j}`,
          accountId: 'a1',
          ruleField: 'payeeName',
          ruleValue: `Payee ${i}`,
          recommendedCategoryName: 'Category 1',
          accountName: 'Account 1',
          transactionDate: '2023-01-01',
          transactionAmountCents: 100,
          payeeName: `Payee ${i}`,
        });
      }
    }

    await fs.writeFile('test-audit-bench.json', JSON.stringify(mockAudit));

    const paths = {
      baseDir: '.',
      auditPath: 'test-audit-bench.json',
      supplementalCsvPath: '',
      placeCachePath: '',
      categoryOverridesPath: '',
      manualReviewCsvPath: '',
      candidatesCsvPath: '',
      locationHistoryPath: '',
    };

    const start = Date.now();
    await applyTimelineReconAudit(paths);
    const end = Date.now();
    console.log(`Execution time for 50 rules: ${end - start} ms`);

    await fs.unlink('test-audit-bench.json');
  });
});
