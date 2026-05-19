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
  const mockBudget: BudgetFile = {
    id: 'local-id',
    groupId: 'group-id',
    cloudFileId: 'cloud-id',
    name: 'Test Budget',
  };

  describe('getBudgetIdentifiers', () => {
    it('returns array of valid identifiers', () => {
      expect(getBudgetIdentifiers(mockBudget)).toEqual(['group-id', 'cloud-id', 'local-id']);
    });

    it('filters out empty or non-string values', () => {
      const budget: BudgetFile = { id: '', groupId: undefined, name: 'Empty' };
      expect(getBudgetIdentifiers(budget)).toEqual([]);
    });
  });

  describe('matchesBudgetIdentifier', () => {
    it('returns true if identifier matches any valid identifier', () => {
      expect(matchesBudgetIdentifier(mockBudget, 'cloud-id')).toBe(true);
      expect(matchesBudgetIdentifier(mockBudget, 'local-id')).toBe(true);
      expect(matchesBudgetIdentifier(mockBudget, 'group-id')).toBe(true);
    });

    it('returns false if identifier does not match', () => {
      expect(matchesBudgetIdentifier(mockBudget, 'other-id')).toBe(false);
    });
  });

  describe('getBudgetDownloadIdentifier', () => {
    it('returns groupId if available', () => {
      expect(getBudgetDownloadIdentifier(mockBudget)).toBe('group-id');
    });

    it('falls back to cloudFileId', () => {
      const budget: BudgetFile = { ...mockBudget, groupId: undefined };
      expect(getBudgetDownloadIdentifier(budget)).toBe('cloud-id');
    });

    it('falls back to id', () => {
      const budget: BudgetFile = { ...mockBudget, groupId: undefined, cloudFileId: undefined };
      expect(getBudgetDownloadIdentifier(budget)).toBe('local-id');
    });

    it('returns empty string if no identifier is available', () => {
      const budget: BudgetFile = { name: 'Empty' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('');
    });
  });

  describe('getBudgetLocalIdentifier', () => {
    it('returns id if it is a non-empty string', () => {
      expect(getBudgetLocalIdentifier(mockBudget)).toBe('local-id');
    });

    it('returns null if id is empty', () => {
      const budget: BudgetFile = { ...mockBudget, id: '' };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });

    it('returns null if id is missing', () => {
      const budget: BudgetFile = { name: 'Empty' };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });
  });

  describe('describeBudgetIdentifiers', () => {
    it('joins identifiers with pipe', () => {
      expect(describeBudgetIdentifiers(mockBudget)).toBe('group-id | cloud-id | local-id');
    });
  });

  describe('loadBudgetByResolvedIdentifier', () => {
    let apiClient: {
      getBudgets: ReturnType<typeof vi.fn>;
      loadBudget?: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      apiClient = {
        getBudgets: vi.fn().mockResolvedValue([mockBudget]),
        loadBudget: vi.fn().mockResolvedValue(undefined),
      };
    });

    it('returns original identifier if no budgets match', async () => {
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'non-existent-id');
      expect(result).toBe('non-existent-id');
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
    });

    it('returns original identifier if getBudgets returns empty array', async () => {
      apiClient.getBudgets = vi.fn().mockResolvedValue([]);
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'group-id');
      expect(result).toBe('group-id');
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
    });

    it('calls loadBudget with local id and returns it if matched', async () => {
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-id');
      expect(result).toBe('local-id');
      expect(apiClient.loadBudget).toHaveBeenCalledWith('local-id');
    });

    it('returns original identifier if matching budget has no local id', async () => {
      const budgetNoLocalId: BudgetFile = { ...mockBudget, id: '' };
      apiClient.getBudgets = vi.fn().mockResolvedValue([budgetNoLocalId]);
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-id');
      expect(result).toBe('cloud-id');
      expect(apiClient.loadBudget).not.toHaveBeenCalled();
    });

    it('returns original identifier if loadBudget is not provided on apiClient', async () => {
      delete apiClient.loadBudget;
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'cloud-id');
      expect(result).toBe('cloud-id');
    });
  });
});
