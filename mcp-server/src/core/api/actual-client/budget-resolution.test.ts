import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBudgetIdentifiers,
  matchesBudgetIdentifier,
  getBudgetDownloadIdentifier,
  getBudgetLocalIdentifier,
  describeBudgetIdentifiers,
  loadBudgetByResolvedIdentifier,
} from './budget-resolution.js';
import type { BudgetFile } from '../../types/index.js';

describe('budget-resolution', () => {
  describe('getBudgetIdentifiers', () => {
    it('returns an array of valid identifiers in priority order', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        groupId: 'group-123',
        cloudFileId: 'cloud-456',
        id: 'local-789',
      };

      expect(getBudgetIdentifiers(budget)).toEqual(['group-123', 'cloud-456', 'local-789']);
    });

    it('filters out empty string identifiers', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        groupId: '',
        cloudFileId: 'cloud-456',
        id: undefined,
      };

      expect(getBudgetIdentifiers(budget)).toEqual(['cloud-456']);
    });

    it('returns empty array if no identifiers exist', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
      };

      expect(getBudgetIdentifiers(budget)).toEqual([]);
    });
  });

  describe('matchesBudgetIdentifier', () => {
    const budget: BudgetFile = {
      name: 'My Budget',
      groupId: 'group-123',
      cloudFileId: 'cloud-456',
    };

    it('returns true if the identifier matches one of the budget identifiers', () => {
      expect(matchesBudgetIdentifier(budget, 'group-123')).toBe(true);
      expect(matchesBudgetIdentifier(budget, 'cloud-456')).toBe(true);
    });

    it('returns false if the identifier does not match any budget identifiers', () => {
      expect(matchesBudgetIdentifier(budget, 'local-789')).toBe(false);
      expect(matchesBudgetIdentifier(budget, 'My Budget')).toBe(false);
    });
  });

  describe('getBudgetDownloadIdentifier', () => {
    it('returns groupId if available', () => {
      const budget: BudgetFile = { name: 'Budget', groupId: 'g1', cloudFileId: 'c1', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('g1');
    });

    it('returns cloudFileId if groupId is missing', () => {
      const budget: BudgetFile = { name: 'Budget', cloudFileId: 'c1', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('c1');
    });

    it('returns id if others are missing', () => {
      const budget: BudgetFile = { name: 'Budget', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('i1');
    });

    it('returns empty string if no identifiers are available', () => {
      const budget: BudgetFile = { name: 'Budget' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('');
    });
  });

  describe('getBudgetLocalIdentifier', () => {
    it('returns id if it is a non-empty string', () => {
      const budget: BudgetFile = { name: 'Budget', id: 'local-123' };
      expect(getBudgetLocalIdentifier(budget)).toBe('local-123');
    });

    it('returns null if id is missing', () => {
      const budget: BudgetFile = { name: 'Budget', cloudFileId: 'c1' };
      expect(getBudgetLocalIdentifier(budget)).toBe(null);
    });

    it('returns null if id is an empty string', () => {
      const budget: BudgetFile = { name: 'Budget', id: '' };
      expect(getBudgetLocalIdentifier(budget)).toBe(null);
    });
  });

  describe('describeBudgetIdentifiers', () => {
    it('returns a pipe-separated string of identifiers', () => {
      const budget: BudgetFile = { name: 'Budget', groupId: 'g1', cloudFileId: 'c1', id: 'i1' };
      expect(describeBudgetIdentifiers(budget)).toBe('g1 | c1 | i1');
    });

    it('returns only available identifiers', () => {
      const budget: BudgetFile = { name: 'Budget', cloudFileId: 'c1' };
      expect(describeBudgetIdentifiers(budget)).toBe('c1');
    });

    it('returns empty string if no identifiers exist', () => {
      const budget: BudgetFile = { name: 'Budget' };
      expect(describeBudgetIdentifiers(budget)).toBe('');
    });
  });

  describe('loadBudgetByResolvedIdentifier', () => {
    let apiClient: {
      getBudgets: ReturnType<typeof vi.fn>;
      loadBudget: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      apiClient = {
        getBudgets: vi.fn(),
        loadBudget: vi.fn(),
      };
    });

    it('loads budget by loadable budget id if matching budget is found', async () => {
      const budgets: BudgetFile[] = [
        { name: 'Budget 1', id: 'local-1' },
        { name: 'Budget 2', cloudFileId: 'cloud-2', id: 'local-2' },
      ];
      apiClient.getBudgets.mockResolvedValue(budgets);
      apiClient.loadBudget.mockResolvedValue(undefined);

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-2');

      expect(apiClient.getBudgets).toHaveBeenCalledOnce();
      expect(apiClient.loadBudget).toHaveBeenCalledWith('local-2');
      expect(result).toBe('local-2');
    });

    it('returns passed identifier if no matching budget is found', async () => {
      const budgets: BudgetFile[] = [{ name: 'Budget 1', id: 'local-1' }];
      apiClient.getBudgets.mockResolvedValue(budgets);

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'non-existent');

      expect(apiClient.getBudgets).toHaveBeenCalledOnce();
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('non-existent');
    });

    it('returns passed identifier if matching budget has no local id', async () => {
      const budgets: BudgetFile[] = [{ name: 'Budget 1', cloudFileId: 'cloud-1' }];
      apiClient.getBudgets.mockResolvedValue(budgets);

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-1');

      expect(apiClient.getBudgets).toHaveBeenCalledOnce();
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('cloud-1');
    });

    it('returns passed identifier without calling loadBudget if loadBudget is not provided', async () => {
      const budgets: BudgetFile[] = [{ name: 'Budget 1', id: 'local-1', cloudFileId: 'cloud-1' }];

      const clientWithoutLoad = {
        getBudgets: vi.fn().mockResolvedValue(budgets),
      };

      const result = await loadBudgetByResolvedIdentifier(clientWithoutLoad, 'cloud-1');

      expect(clientWithoutLoad.getBudgets).toHaveBeenCalledOnce();
      expect(result).toBe('cloud-1');
    });
  });
});
