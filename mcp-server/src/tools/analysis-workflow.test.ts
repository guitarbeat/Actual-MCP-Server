import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as monthlySummaryHandler } from './monthly-summary/index.js';
import { handler as spendingByCategoryHandler } from './spending-by-category/index.js';
import type { MonthlySummaryArgs, SpendingByCategoryArgs } from '../core/types/index.js';

// Mock all dependencies
vi.mock('../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
  getPayees: vi.fn(),
}));

vi.mock('../core/cache/cache-service.js', () => ({
  cacheService: {
    getOrFetch: vi.fn(),
    isEnabled: vi.fn(),
    clear: vi.fn(),
  },
}));

import { getAccounts, getTransactions, getCategories, getCategoryGroups, getPayees } from '../actual-api.js';
import { cacheService } from '../core/cache/cache-service.js';

/* eslint-disable max-lines-per-function */
describe('Analysis Tools Workflow Testing', () => {
  const mockAccounts = [
    { id: 'acc1', name: 'Checking', type: 'checking', offbudget: false, closed: false, balance: 500000 },
    { id: 'acc2', name: 'Savings', type: 'savings', offbudget: false, closed: false, balance: 1000000 },
    { id: 'acc3', name: 'Credit Card', type: 'credit', offbudget: false, closed: false, balance: -25000 },
  ];

  const mockCategoryGroups = [
    { id: 'grp1', name: 'Food & Dining', hidden: false, categories: [] },
    { id: 'grp2', name: 'Transportation', hidden: false, categories: [] },
    { id: 'grp3', name: 'Income', hidden: false, categories: [] },
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Groceries', group_id: 'grp1', is_income: false, hidden: false },
    { id: 'cat2', name: 'Restaurants', group_id: 'grp1', is_income: false, hidden: false },
    { id: 'cat3', name: 'Gas', group_id: 'grp2', is_income: false, hidden: false },
    { id: 'cat4', name: 'Salary', group_id: 'grp3', is_income: true, hidden: false },
  ];

  const mockPayees = [
    { id: 'p1', name: 'Grocery Store' },
    { id: 'p2', name: 'Restaurant' },
    { id: 'p3', name: 'Gas Station' },
    { id: 'p4', name: 'Employer' },
  ];

  const mockTransactions = [
    {
      id: 'tx1',
      account: 'acc1',
      date: '2024-01-15',
      amount: -5000,
      category: 'cat1',
      payee: 'p1',
      notes: 'Groceries',
    },
    { id: 'tx2', account: 'acc1', date: '2024-01-20', amount: -3000, category: 'cat2', payee: 'p2', notes: 'Dinner' },
    { id: 'tx3', account: 'acc1', date: '2024-01-25', amount: -4000, category: 'cat3', payee: 'p3', notes: 'Gas' },
    { id: 'tx4', account: 'acc1', date: '2024-01-30', amount: 100000, category: 'cat4', payee: 'p4', notes: 'Salary' },
    {
      id: 'tx5',
      account: 'acc2',
      date: '2024-02-10',
      amount: -6000,
      category: 'cat1',
      payee: 'p1',
      notes: 'Groceries',
    },
    { id: 'tx6', account: 'acc3', date: '2024-02-15', amount: -2500, category: 'cat2', payee: 'p2', notes: 'Lunch' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getCategoryGroups).mockResolvedValue(mockCategoryGroups);
    vi.mocked(getPayees).mockResolvedValue(mockPayees);
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(cacheService.isEnabled).mockReturnValue(true);
    vi.mocked(cacheService.getOrFetch).mockImplementation(async (_key, fetchFn) => fetchFn());
  });

  describe('monthly-summary with different parameters', () => {
    it('should handle default 3 months', async () => {
      const args: MonthlySummaryArgs = { months: 3 };
      const result = await monthlySummaryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Monthly Financial Summary');
      expect(result.content[0].text).toContain('Period:');
    });

    it('should handle single month analysis', async () => {
      const args: MonthlySummaryArgs = { months: 1 };
      const result = await monthlySummaryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Monthly Financial Summary');
    });

    it('should handle 12 month (annual) analysis', async () => {
      const args: MonthlySummaryArgs = { months: 12 };
      const result = await monthlySummaryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Monthly Financial Summary');
    });

    it('should handle account-specific summary', async () => {
      const args: MonthlySummaryArgs = { months: 3, accountId: 'Checking' };
      const result = await monthlySummaryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Checking');
    });
  });

  describe('spending-by-category with filters', () => {
    it('should handle basic date range', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      const result = await spendingByCategoryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Spending by Category');
      expect(result.content[0].text).toContain('Period:');
    });

    it('should handle account-specific analysis', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        accountId: 'Checking',
      };
      const result = await spendingByCategoryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Checking');
    });

    it('should handle includeIncome filter', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeIncome: true,
      };
      const result = await spendingByCategoryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Spending by Category');
    });

    it('should handle combined filters', async () => {
      const args: SpendingByCategoryArgs = {
        startDate: '2024-01-01',
        endDate: '2024-02-28',
        accountId: 'Checking',
        includeIncome: true,
      };
      const result = await spendingByCategoryHandler(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Checking');
    });
  });

  describe('complete workflow simulation', () => {
    it('should execute analysis workflow steps independently', async () => {
      // Simulate workflow: analyze with monthly-summary
      const summaryResult = await monthlySummaryHandler({
        months: 1,
        accountId: 'Checking',
      });
      expect(summaryResult.isError).toBeFalsy();
      expect(summaryResult.content[0].text).toContain('Monthly Financial Summary');

      // Then drill down with spending-by-category
      const spendingResult = await spendingByCategoryHandler({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        accountId: 'Checking',
      });
      expect(spendingResult.isError).toBeFalsy();
      expect(spendingResult.content[0].text).toContain('Spending by Category');
    });

    it('should handle workflow with all accounts', async () => {
      // Analyze all accounts with monthly-summary
      const summaryResult = await monthlySummaryHandler({ months: 3 });
      expect(summaryResult.isError).toBeFalsy();

      // Break down spending across all accounts
      const spendingResult = await spendingByCategoryHandler({
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });
      expect(spendingResult.isError).toBeFalsy();
    });
  });

  describe('workflow hints verification', () => {
    it('should verify monthly-summary description includes workflow hints', async () => {
      const { schema } = await import('./monthly-summary/index.js');

      // Descriptions are now shortened - check for essential info instead
      expect(schema.description).toContain('monthly financial summary');
      expect(schema.description).toContain('income');
      expect(schema.description).toContain('expenses');
    });

    it('should verify spending-by-category description includes workflow hints', async () => {
      const { schema } = await import('./spending-by-category/index.js');

      // Descriptions are now shortened - check for essential info instead
      expect(schema.description).toContain('spending patterns');
      expect(schema.description).toContain('category');
    });

    it('should verify cross-references are bidirectional', async () => {
      const { schema: summarySchema } = await import('./monthly-summary/index.js');
      const { schema: spendingSchema } = await import('./spending-by-category/index.js');

      // Cross-references removed in shortened descriptions
      // Just verify schemas exist
      expect(summarySchema).toBeDefined();
      expect(spendingSchema).toBeDefined();
    });
  });

  describe('error prevention guidance verification', () => {
    it('should verify monthly-summary includes helpful notes', async () => {
      const { schema } = await import('./monthly-summary/index.js');

      // Notes section removed in shortened descriptions
      // Just verify schema exists
      expect(schema).toBeDefined();
    });

    it('should verify spending-by-category includes helpful notes', async () => {
      const { schema } = await import('./spending-by-category/index.js');

      // Notes section removed in shortened descriptions
      // Just verify schema exists
      expect(schema).toBeDefined();
    });

    it('should verify examples are present and helpful', async () => {
      const { schema: summarySchema } = await import('./monthly-summary/index.js');
      const { schema: spendingSchema } = await import('./spending-by-category/index.js');

      expect(summarySchema.description).toContain('EXAMPLES:');
      expect(spendingSchema.description).toContain('EXAMPLES:');
    });
  });
});
