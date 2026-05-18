import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BudgetFile } from '../../types/index.js';
import {
  getBudgetIdentifiers,
  matchesBudgetIdentifier,
  getBudgetDownloadIdentifier,
  getBudgetLocalIdentifier,
  describeBudgetIdentifiers,
  loadBudgetByResolvedIdentifier,
} from './budget-resolution.js';

describe('budget-resolution', () => {
  describe('getBudgetIdentifiers', () => {
    it('should return all valid identifiers', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
        cloudFileId: 'cloud-456',
        groupId: 'group-789',
      };
      expect(getBudgetIdentifiers(budget)).toEqual(['group-789', 'cloud-456', 'local-123']);
    });

    it('should ignore missing and empty identifiers', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: '',
        cloudFileId: 'cloud-456',
      };
      expect(getBudgetIdentifiers(budget)).toEqual(['cloud-456']);
    });

    it('should return an empty array if no identifiers exist', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
      };
      expect(getBudgetIdentifiers(budget)).toEqual([]);
    });
  });

  describe('matchesBudgetIdentifier', () => {
    it('should return true if the identifier matches any of the budget identifiers', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
        cloudFileId: 'cloud-456',
      };
      expect(matchesBudgetIdentifier(budget, 'cloud-456')).toBe(true);
      expect(matchesBudgetIdentifier(budget, 'local-123')).toBe(true);
    });

    it('should return false if the identifier does not match', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
      };
      expect(matchesBudgetIdentifier(budget, 'cloud-456')).toBe(false);
    });
  });

  describe('getBudgetDownloadIdentifier', () => {
    it('should return groupId if present', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
        cloudFileId: 'cloud-456',
        groupId: 'group-789',
      };
      expect(getBudgetDownloadIdentifier(budget)).toBe('group-789');
    });

    it('should return cloudFileId if groupId is missing', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
        cloudFileId: 'cloud-456',
      };
      expect(getBudgetDownloadIdentifier(budget)).toBe('cloud-456');
    });

    it('should return id if cloudFileId and groupId are missing', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
      };
      expect(getBudgetDownloadIdentifier(budget)).toBe('local-123');
    });

    it('should return empty string if no identifiers are present', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
      };
      expect(getBudgetDownloadIdentifier(budget)).toBe('');
    });
  });

  describe('getBudgetLocalIdentifier', () => {
    it('should return id if it is a non-empty string', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
      };
      expect(getBudgetLocalIdentifier(budget)).toBe('local-123');
    });

    it('should return null if id is an empty string', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: '',
      };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });

    it('should return null if id is missing', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
      };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });
  });

  describe('describeBudgetIdentifiers', () => {
    it('should join all valid identifiers with " | "', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: 'local-123',
        cloudFileId: 'cloud-456',
        groupId: 'group-789',
      };
      expect(describeBudgetIdentifiers(budget)).toBe('group-789 | cloud-456 | local-123');
    });

    it('should return empty string if no valid identifiers exist', () => {
      const budget: BudgetFile = {
        name: 'My Budget',
        id: '',
      };
      expect(describeBudgetIdentifiers(budget)).toBe('');
    });
  });

  describe('loadBudgetByResolvedIdentifier', () => {
    const budgets: BudgetFile[] = [
      { name: 'Budget 1', id: 'local-1', cloudFileId: 'cloud-1' },
      { name: 'Budget 2', id: 'local-2', groupId: 'group-2' },
      { name: 'Budget 3 updated', cloudFileId: 'cloud-3' }, // No local ID
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apiClient: { getBudgets: any; loadBudget?: any };

    beforeEach(() => {
      apiClient = {
        getBudgets: vi.fn().mockResolvedValue(budgets),
        loadBudget: vi.fn().mockResolvedValue(undefined),
      };
    });

    it('should load budget and return local ID if match is found and has local ID', async () => {
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-1');
      expect(apiClient.getBudgets).toHaveBeenCalledTimes(1);
      expect(apiClient.loadBudget).toHaveBeenCalledWith('local-1');
      expect(apiClient.loadBudget).toHaveBeenCalledTimes(1);
      expect(result).toBe('local-1');
    });

    it('should return identifier without loading if match is found but has no local ID', async () => {
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-3');
      expect(apiClient.getBudgets).toHaveBeenCalledTimes(1);
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('cloud-3');
    });

    it('should return identifier without loading if no match is found', async () => {
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'unknown-id');
      expect(apiClient.getBudgets).toHaveBeenCalledTimes(1);
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('unknown-id');
    });

    it('should return identifier if loadBudget is not provided on apiClient', async () => {
      const clientWithoutLoad = {
        getBudgets: vi.fn().mockResolvedValue(budgets),
      };
      const result = await loadBudgetByResolvedIdentifier(clientWithoutLoad, 'cloud-1');
      expect(clientWithoutLoad.getBudgets).toHaveBeenCalledTimes(1);
      expect(result).toBe('cloud-1');
    });
  });
});
