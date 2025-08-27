// Unit tests for create-transaction data fetcher

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTransactionDataFetcher } from './data-fetcher.js';
import type { CreateTransactionInput } from './types.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getPayees: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
  createPayee: vi.fn(),
  createCategory: vi.fn(),
  addTransactions: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getPayees: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
  createPayee: vi.fn(),
  createCategory: vi.fn(),
  addTransactions: vi.fn(),
}));

vi.mock('../../actual-api.js', async () => mockApi);

describe('CreateTransactionDataFetcher', () => {
  const fetcher = new CreateTransactionDataFetcher();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensurePayeeExists - happy path', () => {
    it('should return existing payee when found', async () => {
      mockApi.getPayees.mockResolvedValue([
        { id: 'payee-1', name: 'Grocery Store' },
        { id: 'payee-2', name: 'Gas Station' },
      ]);

      const result = await fetcher.ensurePayeeExists('Grocery Store');

      expect(result).toEqual({ payeeId: 'payee-1', created: false });
      expect(mockApi.createPayee).not.toHaveBeenCalled();
    });

    it('should create new payee when not found', async () => {
      mockApi.getPayees.mockResolvedValue([{ id: 'payee-1', name: 'Grocery Store' }]);
      mockApi.createPayee.mockResolvedValue('payee-2');

      const result = await fetcher.ensurePayeeExists('New Restaurant');

      expect(result).toEqual({ payeeId: 'payee-2', created: true });
      expect(mockApi.createPayee).toHaveBeenCalledWith('New Restaurant');
    });

    it('should return no payee when name not provided', async () => {
      const result = await fetcher.ensurePayeeExists(undefined);

      expect(result).toEqual({ created: false });
      expect(mockApi.getPayees).not.toHaveBeenCalled();
    });
  });

  describe('ensureCategoryExists - happy path', () => {
    it('should return existing category when found', async () => {
      mockApi.getCategories.mockResolvedValue([
        { id: 'cat-1', name: 'Food', group_id: 'group-1' },
        { id: 'cat-2', name: 'Gas', group_id: 'group-1' },
      ]);
      mockApi.getCategoryGroups.mockResolvedValue([{ id: 'group-1', name: 'Expenses', is_income: false }]);

      const result = await fetcher.ensureCategoryExists('Food');

      expect(result).toEqual({ categoryId: 'cat-1', created: false });
      expect(mockApi.createCategory).not.toHaveBeenCalled();
    });

    it('should create new category in default group when not found', async () => {
      mockApi.getCategories.mockResolvedValue([]);
      mockApi.getCategoryGroups.mockResolvedValue([
        { id: 'group-1', name: 'Expenses', is_income: false },
        { id: 'group-2', name: 'Income', is_income: true },
      ]);
      mockApi.createCategory.mockResolvedValue('cat-3');

      const result = await fetcher.ensureCategoryExists('New Category');

      expect(result).toEqual({ categoryId: 'cat-3', created: true });
      expect(mockApi.createCategory).toHaveBeenCalledWith('New Category', 'group-1');
    });
  });

  describe('validateAccount - edge cases', () => {
    it('should throw error when account not found', async () => {
      mockApi.getAccounts.mockResolvedValue([{ id: 'account-1', name: 'Checking', closed: false }]);

      await expect(fetcher.validateAccount('nonexistent-account')).rejects.toThrow(
        'Account with ID nonexistent-account not found'
      );
    });

    it('should throw error when account is closed', async () => {
      mockApi.getAccounts.mockResolvedValue([{ id: 'account-1', name: 'Old Account', closed: true }]);

      await expect(fetcher.validateAccount('account-1')).rejects.toThrow('Account Old Account is closed');
    });

    it('should pass validation for open account', async () => {
      mockApi.getAccounts.mockResolvedValue([{ id: 'account-1', name: 'Checking', closed: false }]);

      await expect(fetcher.validateAccount('account-1')).resolves.not.toThrow();
    });
  });

  describe('createTransaction - failure case', () => {
    it('should handle transaction creation with all entities', async () => {
      const input: CreateTransactionInput = {
        accountId: 'account-1',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'New Store',
        category: 'New Category',
        notes: 'Test transaction',
        cleared: true,
      };

      // Mock all required API calls
      mockApi.getAccounts.mockResolvedValue([{ id: 'account-1', name: 'Checking', closed: false }]);
      mockApi.getPayees.mockResolvedValue([]);
      mockApi.createPayee.mockResolvedValue('payee-new');
      mockApi.getCategories.mockResolvedValue([]);
      mockApi.getCategoryGroups.mockResolvedValue([{ id: 'group-1', name: 'Expenses', is_income: false }]);
      mockApi.createCategory.mockResolvedValue('cat-new');
      mockApi.addTransactions.mockResolvedValue(undefined);

      const result = await fetcher.createTransaction(input);

      expect(result).toEqual({
        transactionId: 'created',
        payeeId: 'payee-new',
        categoryId: 'cat-new',
        createdPayee: true,
        createdCategory: true,
      });

      expect(mockApi.addTransactions).toHaveBeenCalledWith(
        'account-1',
        [
          {
            date: '2023-12-15',
            amount: 2550, // Amount in cents
            payee: 'payee-new',
            category: 'cat-new',
            notes: 'Test transaction',
            cleared: true,
          },
        ],
        { learnCategories: true }
      );
    });
  });
});
