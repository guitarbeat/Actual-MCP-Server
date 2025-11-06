import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as actualApi from './actual-api.js';

// Mock the @actual-app/api module
vi.mock('@actual-app/api', () => ({
  default: {
    init: vi.fn(),
    downloadBudget: vi.fn(),
    getBudgets: vi.fn(),
    shutdown: vi.fn(),
    sync: vi.fn(),
    deleteTransaction: vi.fn(),
    importTransactions: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

import api from '@actual-app/api';
import fs from 'fs';
import { cacheService } from './core/cache/cache-service.js';

// Mock cache service
vi.mock('./core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: vi.fn(),
  },
}));

describe('Auto-load functionality', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();

    // Reset initialization state by calling shutdown
    await actualApi.shutdownActualApi();
    actualApi.resetInitializationStats();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await actualApi.shutdownActualApi();
  });

  describe('initActualApi with ACTUAL_BUDGET_SYNC_ID', () => {
    it('should auto-load budget when ACTUAL_BUDGET_SYNC_ID is set', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-sync-id', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.init).toHaveBeenCalledWith({
        dataDir: '/test/data',
        serverURL: undefined,
        password: undefined,
      });
      expect(api.downloadBudget).toHaveBeenCalledWith('test-sync-id');
    });

    it('should use ACTUAL_BUDGET_SYNC_ID even when multiple budgets exist', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'specific-budget-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'first-budget', name: 'First Budget' },
        { id: 'budget-2', cloudFileId: 'specific-budget-id', name: 'Specific Budget' },
        { id: 'budget-3', cloudFileId: 'third-budget', name: 'Third Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('specific-budget-id');
    });

    it('should use budget password when ACTUAL_BUDGET_PASSWORD is set', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'encrypted-budget-id';
      process.env.ACTUAL_BUDGET_PASSWORD = 'secret-password';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'encrypted-budget-id', name: 'Encrypted Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('encrypted-budget-id', { password: 'secret-password' });
    });
  });

  describe('initActualApi without ACTUAL_BUDGET_SYNC_ID', () => {
    it('should load first budget when ACTUAL_BUDGET_SYNC_ID is not set', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'first-budget', name: 'First Budget' },
        { id: 'budget-2', cloudFileId: 'second-budget', name: 'Second Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('first-budget');
    });

    it('should use budget id when cloudFileId is not available', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'local-budget-id', name: 'Local Budget' }]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('local-budget-id');
    });
  });

  describe('Error handling', () => {
    it('should throw error when no budgets are found', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([]);
      vi.mocked(api.init).mockResolvedValue(undefined);

      await expect(actualApi.initActualApi()).rejects.toThrow('No budgets found');
    });

    it('should throw error when api.init fails', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.init).mockRejectedValue(new Error('Connection failed'));

      await expect(actualApi.initActualApi()).rejects.toThrow('Connection failed');
    });

    it('should throw error when downloadBudget fails', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'invalid-budget-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'valid-budget', name: 'Valid Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockRejectedValue(new Error('Budget not found'));

      await expect(actualApi.initActualApi()).rejects.toThrow('Budget not found');
    });
  });

  describe('Data directory creation', () => {
    it('should create data directory if it does not exist', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/new-data';

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/new-data', { recursive: true });
    });

    it('should not create data directory if it already exists', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/existing-data';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Auto-sync functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should setup auto-sync when AUTO_SYNC_INTERVAL_MINUTES is set', async () => {
      process.env.AUTO_SYNC_INTERVAL_MINUTES = '5';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      // Fast-forward time by 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(api.sync).toHaveBeenCalledTimes(1);

      // Fast-forward another 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(api.sync).toHaveBeenCalledTimes(2);
    });

    it('should not setup auto-sync when AUTO_SYNC_INTERVAL_MINUTES is 0', async () => {
      process.env.AUTO_SYNC_INTERVAL_MINUTES = '0';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      // Fast-forward time by 10 minutes
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect(api.sync).not.toHaveBeenCalled();
    });

    it('should not setup auto-sync when AUTO_SYNC_INTERVAL_MINUTES is not set', async () => {
      delete process.env.AUTO_SYNC_INTERVAL_MINUTES;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      // Fast-forward time by 10 minutes
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect(api.sync).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      process.env.AUTO_SYNC_INTERVAL_MINUTES = '1';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockRejectedValue(new Error('Sync failed'));

      await actualApi.initActualApi();

      // Fast-forward time by 1 minute
      await vi.advanceTimersByTimeAsync(1 * 60 * 1000);

      // Should not throw, just log error
      expect(api.sync).toHaveBeenCalledTimes(1);
    });

    it('should clean up auto-sync interval on shutdown', async () => {
      process.env.AUTO_SYNC_INTERVAL_MINUTES = '5';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);
      vi.mocked(api.shutdown).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      // Shutdown the API
      await actualApi.shutdownActualApi();

      // Fast-forward time by 10 minutes
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      // Sync should not be called after shutdown
      expect(api.sync).not.toHaveBeenCalled();
    });
  });

  describe('updateTransaction', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
    });

    it('should call API initialization before update', async () => {
      const mockUpdateTransaction = vi.fn().mockResolvedValue(undefined);
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      await actualApi.updateTransaction('txn-123', { amount: 5000 });

      expect(api.init).toHaveBeenCalled();
    });

    it('should call api.updateTransaction with correct parameters', async () => {
      const mockUpdateTransaction = vi.fn().mockResolvedValue(undefined);
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      const updates = { amount: 5000, notes: 'Updated note' };
      await actualApi.updateTransaction('txn-123', updates);

      expect(mockUpdateTransaction).toHaveBeenCalledWith('txn-123', updates);
    });

    it('should invalidate transaction cache after update', async () => {
      const mockUpdateTransaction = vi.fn().mockResolvedValue(undefined);
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      await actualApi.updateTransaction('txn-123', { amount: 5000 });

      expect(cacheService.invalidate).toHaveBeenCalledWith('transactions');
    });

    it('should handle update errors', async () => {
      const mockUpdateTransaction = vi.fn().mockRejectedValue(new Error('Transaction not found'));
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      await expect(actualApi.updateTransaction('invalid-id', { amount: 5000 })).rejects.toThrow(
        'Transaction not found'
      );
    });
  });

  describe('deleteTransaction', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.deleteTransaction).mockResolvedValue(undefined);
    });

    it('should call API initialization before deletion', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(api.init).toHaveBeenCalled();
    });

    it('should call api.deleteTransaction with correct parameters', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(api.deleteTransaction).toHaveBeenCalledWith({ id: 'txn-123' });
    });

    it('should invalidate transaction cache after deletion', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(cacheService.invalidate).toHaveBeenCalledWith('transactions');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(api.deleteTransaction).mockRejectedValue(new Error('Transaction not found'));

      await expect(actualApi.deleteTransaction('invalid-id')).rejects.toThrow('Transaction not found');
    });
  });

  describe('importTransactions', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'budget-1', cloudFileId: 'test-budget', name: 'Test Budget' },
      ]);
      vi.mocked(api.init).mockResolvedValue(undefined);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(cacheService.invalidate).mockClear();
      vi.mocked(api.importTransactions).mockResolvedValue({ added: ['txn-1'], updated: [] });
    });

    it('should import transactions and invalidate caches', async () => {
      const result = await actualApi.importTransactions('account-123', [
        {
          date: '2024-01-10',
          amount: -1234,
          notes: 'Test',
        },
      ]);

      expect(api.importTransactions).toHaveBeenCalledWith('account-123', [
        expect.objectContaining({
          account: 'account-123',
          amount: -1234,
          date: '2024-01-10',
        }),
      ]);
      expect(cacheService.invalidate).toHaveBeenCalledWith('transactions');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
      expect(result).toEqual({ added: ['txn-1'], updated: [] });
    });

    it('should throw when API reports errors', async () => {
      vi.mocked(api.importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: ['duplicate transaction'],
      });

      await expect(
        actualApi.importTransactions('account-123', [
          {
            date: '2024-01-10',
            amount: -1234,
          },
        ])
      ).rejects.toThrow('importTransactions reported errors: duplicate transaction');
    });
  });
});
