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
});
