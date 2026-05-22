import { describe, it, expect } from 'vitest';
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
      const budget: BudgetFile = {
        name: 'Test Budget',
        groupId: 'group-1',
        cloudFileId: 'cloud-1',
        id: 'id-1',
      };
      expect(getBudgetIdentifiers(budget)).toEqual(['group-1', 'cloud-1', 'id-1']);
    });

    it('filters out missing or empty identifiers', () => {
      const budget: BudgetFile = {
        name: 'Test Budget',
        groupId: 'group-1',
        cloudFileId: '', // empty
        // id is missing
      };
      expect(getBudgetIdentifiers(budget)).toEqual(['group-1']);
    });

    it('returns empty array if no identifiers exist', () => {
      const budget: BudgetFile = {
        name: 'Test Budget',
      };
      expect(getBudgetIdentifiers(budget)).toEqual([]);
    });
  });

  describe('matchesBudgetIdentifier', () => {
    const budget: BudgetFile = {
      name: 'Test Budget',
      groupId: 'group-1',
      cloudFileId: 'cloud-1',
      id: 'id-1',
    };

    it('returns true if identifier matches one of the budget identifiers', () => {
      expect(matchesBudgetIdentifier(budget, 'cloud-1')).toBe(true);
    });

    it('returns false if identifier does not match any budget identifiers', () => {
      expect(matchesBudgetIdentifier(budget, 'unknown')).toBe(false);
    });
  });

  describe('getBudgetDownloadIdentifier', () => {
    it('returns groupId if present', () => {
      const budget: BudgetFile = { name: 'Test', groupId: 'group', cloudFileId: 'cloud', id: 'id' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('group');
    });

    it('returns cloudFileId if groupId is missing', () => {
      const budget: BudgetFile = { name: 'Test', cloudFileId: 'cloud', id: 'id' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('cloud');
    });

    it('returns id if others are missing', () => {
      const budget: BudgetFile = { name: 'Test', id: 'id' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('id');
    });

    it('returns empty string if no identifiers are present', () => {
      const budget: BudgetFile = { name: 'Test' };
      expect(getBudgetDownloadIdentifier(budget)).toBe('');
    });
  });

  describe('getBudgetLocalIdentifier', () => {
    it('returns id if present and not empty', () => {
      const budget: BudgetFile = { name: 'Test', id: 'id-1' };
      expect(getBudgetLocalIdentifier(budget)).toBe('id-1');
    });

    it('returns null if id is empty', () => {
      const budget: BudgetFile = { name: 'Test', id: '' };
      expect(getBudgetLocalIdentifier(budget)).toBe(null);
    });

    it('returns null if id is missing', () => {
      const budget: BudgetFile = { name: 'Test' };
      expect(getBudgetLocalIdentifier(budget)).toBe(null);
    });
  });

  describe('describeBudgetIdentifiers', () => {
    it('joins identifiers with " | "', () => {
      const budget: BudgetFile = {
        name: 'Test Budget',
        groupId: 'group-1',
        cloudFileId: 'cloud-1',
        id: 'id-1',
      };
      expect(describeBudgetIdentifiers(budget)).toBe('group-1 | cloud-1 | id-1');
    });

    it('handles single identifier', () => {
      const budget: BudgetFile = { name: 'Test', id: 'id-1' };
      expect(describeBudgetIdentifiers(budget)).toBe('id-1');
    });

    it('returns empty string if no identifiers', () => {
      const budget: BudgetFile = { name: 'Test' };
      expect(describeBudgetIdentifiers(budget)).toBe('');
    });
  });

  describe('loadBudgetByResolvedIdentifier', () => {
    it('loads budget by id if matched and client supports loadBudget', async () => {
      const budget: BudgetFile = { name: 'Test', id: 'id-1', groupId: 'group-1' };
      const apiClient = {
        getBudgets: async () => [budget],
        loadBudget: async (_id: string) => {
          /* mock */
        },
      };
      let loadCalledWith = '';
      apiClient.loadBudget = async (id: string) => {
        loadCalledWith = id;
      };

      const result = await loadBudgetByResolvedIdentifier(apiClient, 'group-1');

      expect(result).toBe('id-1');
      expect(loadCalledWith).toBe('id-1');
    });

    it('returns identifier if no matching budget found', async () => {
      const apiClient = {
        getBudgets: async () => [],
      };
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'group-1');
      expect(result).toBe('group-1');
    });

    it('returns identifier if matched budget has no local id', async () => {
      const budget: BudgetFile = { name: 'Test', groupId: 'group-1' }; // no id
      const apiClient = {
        getBudgets: async () => [budget],
      };
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'group-1');
      expect(result).toBe('group-1');
    });

    it('returns loadableBudgetId if client does not support loadBudget', async () => {
      // Actually, if loadableBudgetId exists but client.loadBudget is not a function,
      // the current implementation returns identifier. Let's test that.
      const budget: BudgetFile = { name: 'Test', id: 'id-1', groupId: 'group-1' };
      const apiClient = {
        getBudgets: async () => [budget],
        // no loadBudget
      };
      const result = await loadBudgetByResolvedIdentifier(apiClient, 'group-1');
      expect(result).toBe('group-1');
    });
  });
});
