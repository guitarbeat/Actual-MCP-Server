import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import fs from 'node:fs';
import api from '@actual-app/api';
import * as actualApi from './core/api/actual-client.js';
import { cacheService } from './core/cache/cache-service.js';
import { nameResolver } from './core/utils/name-resolver.js';

// Mock the @actual-app/api module
vi.mock('@actual-app/api', () => ({
  default: {
    init: vi.fn(),
    closeAccount: vi.fn(),
    createAccount: vi.fn(),
    createSchedule: vi.fn(),
    createTag: vi.fn(),
    deleteTag: vi.fn(),
    downloadBudget: vi.fn(),
    getAccounts: vi.fn().mockResolvedValue([]),
    getBudgets: vi.fn(),
    getPayees: vi.fn().mockResolvedValue([]),
    getTags: vi.fn().mockResolvedValue([]),
    internal: {
      send: vi.fn(),
      db: {
        all: vi.fn(),
        getTransaction: vi.fn(),
      },
    },
    loadBudget: vi.fn(),
    shutdown: vi.fn(),
    sync: vi.fn(),
    deleteTransaction: vi.fn(),
    importTransactions: vi.fn(),
    updateAccount: vi.fn(),
    updateSchedule: vi.fn(),
    updateTag: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

// Mock cache service
vi.mock('./core/cache/cache-service.js', () => ({
  cacheService: {
    clear: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
    getOrFetch: vi.fn().mockImplementation((_key, fetchFn) => fetchFn()),
  },
}));

vi.mock('./core/utils/name-resolver.js', () => ({
  nameResolver: {
    clearCache: vi.fn(),
  },
}));

type MockApiInitResult = Awaited<ReturnType<typeof api.init>>;

describe('Auto-load functionality', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    vi.mocked(api.getAccounts).mockResolvedValue([]);

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
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.init).toHaveBeenCalledWith({
        dataDir: '/test/data',
      });
      expect(api.downloadBudget).toHaveBeenCalledWith('test-sync-id');
    });

    it('should use ACTUAL_BUDGET_SYNC_ID even when multiple budgets exist', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'specific-budget-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'first-budget',
          name: 'First Budget',
        },
        {
          id: 'budget-2',
          cloudFileId: 'specific-budget-id',
          name: 'Specific Budget',
        },
        {
          id: 'budget-3',
          cloudFileId: 'third-budget',
          name: 'Third Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('specific-budget-id');
    });

    it('should match ACTUAL_BUDGET_SYNC_ID against groupId when provided by Actual', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'group-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'cloud-file-id',
          groupId: 'group-sync-id',
          name: 'Actual Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('group-sync-id');
    });

    it('should use budget password when ACTUAL_BUDGET_PASSWORD is set', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'encrypted-budget-id';
      process.env.ACTUAL_BUDGET_PASSWORD = 'secret-password';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'encrypted-budget-id',
          name: 'Encrypted Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('encrypted-budget-id', {
        password: 'secret-password',
      });
    });
  });

  describe('initActualApi without ACTUAL_BUDGET_SYNC_ID', () => {
    it('should load first budget when ACTUAL_BUDGET_SYNC_ID is not set', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'first-budget',
          name: 'First Budget',
        },
        {
          id: 'budget-2',
          cloudFileId: 'second-budget',
          name: 'Second Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('first-budget');
    });

    it('should use budget id when cloudFileId is not available', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        { id: 'local-budget-id', name: 'Local Budget' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('local-budget-id');
    });

    it('should prefer groupId when auto-selecting the first budget', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'cloud-file-id',
          groupId: 'group-sync-id',
          name: 'Actual Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.downloadBudget).toHaveBeenCalledWith('group-sync-id');
    });
  });

  describe('session token authentication', () => {
    it('should initialize with ACTUAL_SESSION_TOKEN when configured for a remote server', async () => {
      process.env.ACTUAL_SERVER_URL = 'https://actual.example.com';
      process.env.ACTUAL_SESSION_TOKEN = 'session-token';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(api.init).toHaveBeenCalledWith({
        dataDir: '/test/data',
        serverURL: 'https://actual.example.com',
        sessionToken: 'session-token',
      });

      const readiness = await actualApi.getReadinessStatus(true);
      expect(readiness.diagnostics.hasSessionToken).toBe(true);
      expect(readiness.diagnostics.hasPassword).toBe(false);
    });

    it('should reject remote configuration when both auth methods are set', async () => {
      process.env.ACTUAL_SERVER_URL = 'https://actual.example.com';
      process.env.ACTUAL_PASSWORD = 'password';
      process.env.ACTUAL_SESSION_TOKEN = 'session-token';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      await expect(actualApi.initActualApi()).rejects.toThrow(
        'Set exactly one of ACTUAL_PASSWORD or ACTUAL_SESSION_TOKEN when ACTUAL_SERVER_URL is configured',
      );
      expect(api.init).not.toHaveBeenCalled();
    });

    it('should reject remote configuration when no auth method is set', async () => {
      process.env.ACTUAL_SERVER_URL = 'https://actual.example.com';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      await expect(actualApi.initActualApi()).rejects.toThrow(
        'Set one of ACTUAL_PASSWORD or ACTUAL_SESSION_TOKEN when ACTUAL_SERVER_URL is configured',
      );
      expect(api.init).not.toHaveBeenCalled();
    });
  });

  describe('connection state and readiness', () => {
    it('should report ready state after successful initialization', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      const readiness = await actualApi.getReadinessStatus();
      expect(readiness.ready).toBe(true);
      expect(readiness.status).toBe('ready');
      expect(readiness.activeBudgetId).toBe('test-sync-id');
      expect(readiness.reason).toBe('ready');
      expect(readiness.lastReadyAt).toBeTruthy();
      expect(readiness.lastSyncAt).toBeTruthy();
    });

    it('should report error state when initialization fails', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.init).mockRejectedValue(new Error('Connection failed'));

      await expect(actualApi.initActualApi()).rejects.toThrow('Connection failed');

      const readiness = await actualApi.getReadinessStatus();
      expect(readiness.ready).toBe(false);
      expect(readiness.status).toBe('error');
      expect(readiness.lastError).toBe('connection_failed');
    });

    it('should mark readiness unhealthy when a forced health check loses the budget', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();
      vi.mocked(api.getAccounts).mockRejectedValueOnce(new Error('No budget file is open'));

      const readiness = await actualApi.getReadinessStatus(true);
      expect(readiness.ready).toBe(false);
      expect(readiness.status).toBe('error');
      expect(readiness.reason).toBe('budget_not_loaded');
    });

    it('should include the active read freshness mode in readiness diagnostics', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_READ_FRESHNESS_MODE = 'strict-live';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      const readiness = await actualApi.getReadinessStatus(true);
      expect(readiness.diagnostics.readFreshnessMode).toBe('strict-live');
    });
  });

  describe('single-flight initialization', () => {
    it('should reuse the same initialization promise for concurrent callers', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      const initResult = {} as MockApiInitResult;
      let resolveInit: (() => void) | undefined;
      vi.mocked(api.init).mockImplementation(
        () =>
          new Promise<MockApiInitResult>((resolve) => {
            resolveInit = () => resolve(initResult);
          }),
      );
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      const firstInit = actualApi.initActualApi();
      const secondInit = actualApi.initActualApi();

      resolveInit?.();
      await Promise.all([firstInit, secondInit]);

      expect(api.init).toHaveBeenCalledTimes(1);
      expect(api.getBudgets).toHaveBeenCalledTimes(1);
      expect(api.downloadBudget).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should throw error when no budgets are found', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);

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
        {
          id: 'budget-1',
          cloudFileId: 'valid-budget',
          name: 'Valid Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockRejectedValue(new Error('Budget not found'));

      await expect(actualApi.initActualApi()).rejects.toThrow('Budget not found');
    });
  });

  describe('Data directory creation', () => {
    it('should create data directory if it does not exist', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/new-data';

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      await actualApi.initActualApi();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/new-data', {
        recursive: true,
      });
    });

    it('should not create data directory if it already exists', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/existing-data';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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

  describe('cache invalidation for sync and budget switching', () => {
    beforeEach(async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.loadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);

      await actualApi.initActualApi();
      vi.mocked(cacheService.clear).mockClear();
      vi.mocked(nameResolver.clearCache).mockClear();
    });

    it('should clear cached read state after sync', async () => {
      await actualApi.sync();

      expect(cacheService.clear).toHaveBeenCalled();
      expect(nameResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear cached read state after downloadBudget', async () => {
      await actualApi.downloadBudget('budget-2');

      expect(api.downloadBudget).toHaveBeenCalledWith('budget-2');
      expect(cacheService.clear).toHaveBeenCalled();
      expect(nameResolver.clearCache).toHaveBeenCalled();
    });

    it('should clear cached read state after loadBudget', async () => {
      await actualApi.loadBudget('budget-3');

      expect(api.loadBudget).toHaveBeenCalledWith('budget-3');
      expect(cacheService.clear).toHaveBeenCalled();
      expect(nameResolver.clearCache).toHaveBeenCalled();
    });
  });

  describe('strict live read mode', () => {
    beforeEach(async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-sync-id',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.sync).mockResolvedValue(undefined);
      vi.mocked(api.getAccounts).mockResolvedValue([
        {
          id: 'account-1',
          name: 'Checking',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      await actualApi.initActualApi();
      vi.mocked(api.sync).mockClear();
      vi.mocked(api.getAccounts).mockClear();
      vi.mocked(cacheService.getOrFetch).mockClear();
      vi.mocked(cacheService.clear).mockClear();
    });

    it('should keep cached mode behavior by default', async () => {
      const accounts = await actualApi.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(api.sync).not.toHaveBeenCalled();
      expect(cacheService.getOrFetch).toHaveBeenCalledWith(
        'accounts:all',
        expect.any(Function),
        undefined,
      );
      expect(api.getAccounts).toHaveBeenCalledTimes(1);
    });

    it('should sync before reads and bypass cache in strict-live mode', async () => {
      process.env.ACTUAL_READ_FRESHNESS_MODE = 'strict-live';

      const accounts = await actualApi.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(api.sync).toHaveBeenCalledTimes(1);
      expect(cacheService.getOrFetch).not.toHaveBeenCalled();
      expect(api.getAccounts).toHaveBeenCalledTimes(2);
      expect(cacheService.clear).toHaveBeenCalled();
    });

    it('should sync before every repeated read in strict-live mode', async () => {
      process.env.ACTUAL_READ_FRESHNESS_MODE = 'strict-live';

      await actualApi.getAccounts();
      await actualApi.getAccounts();

      expect(api.sync).toHaveBeenCalledTimes(2);
      expect(api.getAccounts).toHaveBeenCalledTimes(4);
      expect(cacheService.getOrFetch).not.toHaveBeenCalled();
    });

    it('should fail closed when live sync fails', async () => {
      process.env.ACTUAL_READ_FRESHNESS_MODE = 'strict-live';
      vi.mocked(api.sync).mockRejectedValueOnce(new Error('Sync unavailable'));

      await expect(actualApi.getAccounts()).rejects.toThrow(
        'Live sync required before read failed: Sync unavailable',
      );

      expect(cacheService.getOrFetch).not.toHaveBeenCalled();
      expect(api.getAccounts).toHaveBeenCalledTimes(1);

      const readiness = await actualApi.getReadinessStatus();
      expect(readiness.lastError).toBe('live_sync_failed');
    });

    it('should preserve structured non-Error failures from read operations', async () => {
      vi.mocked(api.getAccounts).mockRejectedValueOnce({
        message: 'Accounts unavailable',
        code: 'E_ACCOUNTS',
      });

      await expect(actualApi.getAccounts()).rejects.toThrow(
        '{"message":"Accounts unavailable","code":"E_ACCOUNTS"}',
      );
    });

    it('should serialize connection-like object failures into readiness debug state', async () => {
      vi.mocked(api.getAccounts).mockRejectedValue({
        message: 'Network timeout',
        code: 'ETIMEDOUT',
      });

      await expect(actualApi.getAccounts()).rejects.toThrow(
        '{"message":"Network timeout","code":"ETIMEDOUT"}',
      );

      const readiness = await actualApi.getReadinessStatus();
      expect(readiness.lastError).toBe('connection_timeout');
      expect(readiness.debugError).toBe('{"message":"Network timeout","code":"ETIMEDOUT"}');
    });
  });

  describe('updateTransaction', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
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

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('transactions:*');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
    });

    it('should handle update errors', async () => {
      const mockUpdateTransaction = vi.fn().mockRejectedValue(new Error('Transaction not found'));
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      await expect(actualApi.updateTransaction('invalid-id', { amount: 5000 })).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('should not retry writes after a dispatched connection error', async () => {
      const mockUpdateTransaction = vi.fn().mockRejectedValue(new Error('Network timeout'));
      vi.mocked(api).updateTransaction = mockUpdateTransaction;

      await expect(actualApi.updateTransaction('txn-123', { amount: 5000 })).rejects.toThrow(
        'Network timeout',
      );

      expect(mockUpdateTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTransaction', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.deleteTransaction).mockResolvedValue(undefined as any);
    });

    it('should call API initialization before deletion', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(api.init).toHaveBeenCalled();
    });

    it('should call api.deleteTransaction with correct parameters', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(api.deleteTransaction).toHaveBeenCalledWith('txn-123');
    });

    it('should invalidate transaction cache after deletion', async () => {
      await actualApi.deleteTransaction('txn-123');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('transactions:*');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(api.deleteTransaction).mockRejectedValue(new Error('Transaction not found'));

      await expect(actualApi.deleteTransaction('invalid-id')).rejects.toThrow(
        'Transaction not found',
      );
    });
  });

  describe('importTransactions', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(cacheService.invalidate).mockClear();
      vi.mocked(api.importTransactions).mockResolvedValue({
        added: ['txn-1'],
        updated: [],
      });
    });

    it('should import transactions and invalidate caches', async () => {
      const result = await actualApi.importTransactions('account-123', [
        {
          date: '2024-01-10',
          amount: -1234,
          notes: 'Test',
        },
      ]);

      expect(api.importTransactions).toHaveBeenCalledWith(
        'account-123',
        [
          expect.objectContaining({
            account: 'account-123',
            amount: -1234,
            date: '2024-01-10',
          }),
        ],
        undefined,
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('transactions:*');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
      expect(result).toEqual({ added: ['txn-1'], updated: [] });
    });

    it('should pass opts parameter to API', async () => {
      const result = await actualApi.importTransactions(
        'account-123',
        [
          {
            date: '2024-01-10',
            amount: -1234,
          },
        ],
        { defaultCleared: true },
      );

      expect(api.importTransactions).toHaveBeenCalledWith(
        'account-123',
        [
          expect.objectContaining({
            account: 'account-123',
            amount: -1234,
            date: '2024-01-10',
          }),
        ],
        { defaultCleared: true },
      );
      expect(result).toEqual({ added: ['txn-1'], updated: [] });
    });

    it('should throw when API reports errors', async () => {
      vi.mocked(api.importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: [{ message: 'duplicate transaction' }],
      });

      await expect(
        actualApi.importTransactions('account-123', [
          {
            date: '2024-01-10',
            amount: -1234,
          },
        ]),
      ).rejects.toThrow('importTransactions reported errors: duplicate transaction');
    });

    it('should handle multiple errors correctly', async () => {
      vi.mocked(api.importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: [{ message: 'duplicate transaction' }, { message: 'invalid amount' }],
      });

      await expect(
        actualApi.importTransactions('account-123', [
          {
            date: '2024-01-10',
            amount: -1234,
          },
        ]),
      ).rejects.toThrow(
        'importTransactions reported errors: duplicate transaction; invalid amount',
      );
    });
  });

  describe('batchBudgetUpdates', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);

      // Setup batchBudgetUpdates mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api as any).batchBudgetUpdates = vi.fn().mockImplementation(async (cb) => {
        return cb();
      });
    });

    it('should call API initialization before batch updates', async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      await actualApi.batchBudgetUpdates(callback);

      expect(api.init).toHaveBeenCalled();
    });

    it('should call api.batchBudgetUpdates with the callback', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      const result = await actualApi.batchBudgetUpdates(callback);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((api as any).batchBudgetUpdates).toHaveBeenCalledWith(callback);
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should throw if api.batchBudgetUpdates is not a function', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api as any).batchBudgetUpdates = undefined;
      const callback = vi.fn().mockResolvedValue(undefined);

      await expect(actualApi.batchBudgetUpdates(callback)).rejects.toThrow(
        'batchBudgetUpdates method is not available in this version of the API',
      );
    });
  });

  describe('tag wrappers', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.getTags).mockResolvedValue([
        {
          id: 'tag-1',
          tag: 'reimbursable',
          color: '#ff0000',
          description: 'Expense to reimburse',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      vi.mocked(api.createTag).mockResolvedValue('tag-1');
      vi.mocked(api.updateTag).mockResolvedValue(undefined);
      vi.mocked(api.deleteTag).mockResolvedValue(undefined);
    });

    it('should return tags through the Actual client wrapper', async () => {
      const tags = await actualApi.getTags();

      expect(tags).toEqual([
        {
          id: 'tag-1',
          tag: 'reimbursable',
          color: '#ff0000',
          description: 'Expense to reimburse',
        },
      ]);
      expect(cacheService.getOrFetch).toHaveBeenCalledWith(
        'tags:all',
        expect.any(Function),
        undefined,
      );
    });

    it('should create a tag and invalidate tag caches', async () => {
      const tagId = await actualApi.createTag({
        tag: 'reimbursable',
        color: '#ff0000',
      });

      expect(tagId).toBe('tag-1');
      expect(api.createTag).toHaveBeenCalledWith({
        tag: 'reimbursable',
        color: '#ff0000',
      });
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('tags:*');
    });

    it('should update and delete tags through the wrapper', async () => {
      await actualApi.updateTag('tag-1', { color: '#00ff00' });
      await actualApi.deleteTag('tag-1');

      expect(api.updateTag).toHaveBeenCalledWith('tag-1', { color: '#00ff00' });
      expect(api.deleteTag).toHaveBeenCalledWith('tag-1');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('tags:*');
    });
  });

  describe('account and schedule wrapper passthroughs', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.closeAccount).mockResolvedValue(undefined);
      vi.mocked(api.updateSchedule).mockResolvedValue('schedule-1');
    });

    it('should pass transfer arguments through closeAccount', async () => {
      await actualApi.closeAccount('account-1', 'account-2', 'category-1');

      expect(api.closeAccount).toHaveBeenCalledWith('account-1', 'account-2', 'category-1');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
    });

    it('should pass resetNextDate through updateSchedule', async () => {
      await actualApi.updateSchedule('schedule-1', { amount: -2500 }, true);

      expect(api.updateSchedule).toHaveBeenCalledWith('schedule-1', { amount: -2500 }, true);
    });
  });

  describe('historical transfer application', () => {
    beforeEach(async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      vi.mocked(api.getBudgets).mockResolvedValue([
        {
          id: 'budget-1',
          cloudFileId: 'test-budget',
          name: 'Test Budget',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(api.init).mockResolvedValue(undefined as any);
      vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
      vi.mocked(api.getAccounts).mockResolvedValue([
        { id: 'checking', name: 'Checking', offbudget: false, closed: false },
        { id: 'credit', name: 'Credit Card', offbudget: false, closed: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      vi.mocked(api.getPayees).mockResolvedValue([
        { id: 'payee-checking', name: 'Transfer: Checking', transfer_acct: 'checking' },
        { id: 'payee-credit', name: 'Transfer: Credit Card', transfer_acct: 'credit' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      const internalDb = api.internal.db;
      vi.mocked(internalDb.getTransaction).mockImplementation(async (id: string) => {
        if (id === 'txn-out') {
          return {
            id,
            account: 'checking',
            amount: -1234,
            date: '2025-01-15',
            category: 'cat-1',
            transfer_id: null,
            starting_balance_flag: false,
            is_parent: false,
            is_child: false,
            tombstone: false,
          };
        }

        if (id === 'txn-in') {
          return {
            id,
            account: 'credit',
            amount: 1234,
            date: '2025-01-16',
            category: 'cat-2',
            transfer_id: null,
            starting_balance_flag: false,
            is_parent: false,
            is_child: false,
            tombstone: false,
          };
        }

        return null;
      });
      vi.mocked(internalDb.all).mockImplementation(async (_sql: string, params: unknown[]) => {
        const transactionId = params[0];

        if (transactionId === 'txn-out') {
          return [{ id: 'txn-in' }];
        }

        if (transactionId === 'txn-in') {
          return [{ id: 'txn-out' }];
        }

        return [];
      });
      vi.mocked(api.internal.send).mockResolvedValue({
        updated: [],
      });
    });

    it('links strict candidates through the internal batch update path and clears categories when budget status matches', async () => {
      const result = await actualApi.applyHistoricalTransfers(['txn-in::txn-out']);

      expect(result).toEqual({
        requestedCandidateCount: 1,
        appliedCount: 1,
        rejectedCount: 0,
        results: [
          {
            candidateId: 'txn-in::txn-out',
            transactionIds: ['txn-in', 'txn-out'],
            status: 'applied',
            categoriesCleared: true,
          },
        ],
      });
      expect(api.internal.send).toHaveBeenCalledWith('transactions-batch-update', {
        updated: [
          {
            id: 'txn-in',
            payee: 'payee-checking',
            transfer_id: 'txn-out',
            category: null,
          },
          {
            id: 'txn-out',
            payee: 'payee-credit',
            transfer_id: 'txn-in',
            category: null,
          },
        ],
        runTransfers: false,
      });
      expect(api.internal.db.all).toHaveBeenNthCalledWith(1, expect.any(String), [
        'txn-in',
        'credit',
        -1234,
        20250113,
        20250119,
      ]);
      expect(api.internal.db.all).toHaveBeenNthCalledWith(2, expect.any(String), [
        'txn-out',
        'checking',
        1234,
        20250112,
        20250118,
      ]);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('transactions:*');
      expect(cacheService.invalidate).toHaveBeenCalledWith('accounts:all');
    });

    it('rejects candidates that no longer have a unique exact counterpart', async () => {
      vi.mocked(api.internal.db.all).mockImplementation(async (_sql: string, params: unknown[]) => {
        const transactionId = params[0];

        if (transactionId === 'txn-out') {
          return [{ id: 'txn-in' }, { id: 'txn-other' }];
        }

        if (transactionId === 'txn-in') {
          return [{ id: 'txn-out' }];
        }

        return [];
      });

      const result = await actualApi.applyHistoricalTransfers(['txn-in::txn-out']);

      expect(result.appliedCount).toBe(0);
      expect(result.rejectedCount).toBe(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          candidateId: 'txn-in::txn-out',
          status: 'rejected',
          reason: expect.stringContaining('unique exact inverse counterpart'),
        }),
      );
      expect(api.internal.send).not.toHaveBeenCalled();
    });
  });
});
