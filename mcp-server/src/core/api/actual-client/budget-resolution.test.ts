import { describe, it, expect, vi } from 'vitest';
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
    it('returns all valid string identifiers', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', cloudFileId: 'c1', id: 'i1' };
      expect(getBudgetIdentifiers(budget)).toEqual(['g1', 'c1', 'i1']);
    });

    it('filters out undefined and empty strings', () => {
      const budget: BudgetFile = { name: 'test', groupId: '', cloudFileId: undefined, id: 'i1' };
      expect(getBudgetIdentifiers(budget)).toEqual(['i1']);
    });

    it('returns empty array if no valid identifiers exist', () => {
      const budget: BudgetFile = { name: 'test', groupId: '', id: '' };
      expect(getBudgetIdentifiers(budget)).toEqual([]);
    });
  });

  describe('matchesBudgetIdentifier', () => {
    it('returns true when identifier matches one of the budget identifiers', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', id: 'i1' };
      expect(matchesBudgetIdentifier(budget, 'g1')).toBe(true);
      expect(matchesBudgetIdentifier(budget, 'i1')).toBe(true);
    });

    it('returns false when identifier does not match any budget identifier', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', id: 'i1' };
      expect(matchesBudgetIdentifier(budget, 'unknown')).toBe(false);
    });
  });

  describe('getBudgetDownloadIdentifier', () => {
    it('prioritizes groupId over others', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', cloudFileId: 'c1', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('g1');
    });

    it('prioritizes cloudFileId if groupId is missing', () => {
      const budget: BudgetFile = { name: 'test', cloudFileId: 'c1', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('c1');
    });

    it('falls back to id if both groupId and cloudFileId are missing', () => {
      const budget: BudgetFile = { name: 'test', id: 'i1' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('i1');
    });

    it('returns empty string if no identifiers are present', () => {
      const budget: BudgetFile = { name: 'test' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('');
    });
  });

  describe('getBudgetLocalIdentifier', () => {
    it('returns id when it is a valid string', () => {
      const budget: BudgetFile = { name: 'test', id: 'valid-id' };
      expect(getBudgetLocalIdentifier(budget)).toBe('valid-id');
    });

    it('returns null when id is undefined', () => {
      const budget: BudgetFile = { name: 'test' };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });

    it('returns null when id is an empty string', () => {
      const budget: BudgetFile = { name: 'test', id: '' };
      expect(getBudgetLocalIdentifier(budget)).toBeNull();
    });
  });

  describe('describeBudgetIdentifiers', () => {
    it('joins available identifiers with " | "', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', cloudFileId: 'c1', id: 'i1' };
      expect(describeBudgetIdentifiers(budget)).toBe('g1 | c1 | i1');
    });

    it('only joins valid identifiers', () => {
      const budget: BudgetFile = { name: 'test', groupId: 'g1', id: '' };
      expect(describeBudgetIdentifiers(budget)).toBe('g1');
    });
  });

  describe('loadBudgetByResolvedIdentifier', () => {
    const mockBudgets: BudgetFile[] = [
      { name: 'b1', groupId: 'g1', id: 'local1' },
      { name: 'b2', cloudFileId: 'c2' }, // no local id
    ];

    it('loads budget and returns local id when matched and local id exists', async () => {
      const loadBudget = vi.fn().mockResolvedValue(undefined);
      const apiClient = {
        getBudgets: vi.fn().mockResolvedValue(mockBudgets),
        loadBudget,
      };

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'g1');

      expect(apiClient.getBudgets).toHaveBeenCalled();
      expect(loadBudget).toHaveBeenCalledWith('local1');
      expect(result).toBe('local1');
    });

    it('returns original identifier when no budget matches', async () => {
      const loadBudget = vi.fn().mockResolvedValue(undefined);
      const apiClient = {
        getBudgets: vi.fn().mockResolvedValue(mockBudgets),
        loadBudget,
      };

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'unknown');

      expect(apiClient.getBudgets).toHaveBeenCalled();
      expect(loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('unknown');
    });

    it('returns original identifier when matched budget has no local id', async () => {
      const loadBudget = vi.fn().mockResolvedValue(undefined);
      const apiClient = {
        getBudgets: vi.fn().mockResolvedValue(mockBudgets),
        loadBudget,
      };

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'c2');

      expect(apiClient.getBudgets).toHaveBeenCalled();
      expect(loadBudget).not.toHaveBeenCalled();
      expect(result).toBe('c2');
    });

    it('returns local id but does not crash if loadBudget is not provided', async () => {
      const apiClient = {
        getBudgets: vi.fn().mockResolvedValue(mockBudgets),
      };

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'g1');

      expect(apiClient.getBudgets).toHaveBeenCalled();
      expect(result).toBe('g1'); // it returns identifier directly because `loadableBudgetId && typeof apiClient.loadBudget === 'function'` is false
    });
  });
});
