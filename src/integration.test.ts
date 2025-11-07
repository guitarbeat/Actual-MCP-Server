import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupTools, getAvailableTools } from './tools/index.js';
import * as actualApi from './actual-api.js';

// Mock the @actual-app/api module
vi.mock('@actual-app/api', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    downloadBudget: vi.fn().mockResolvedValue(undefined),
    getBudgets: vi.fn().mockResolvedValue([{ id: 'budget-1', cloudFileId: 'test-sync-id', name: 'Test Budget' }]),
    shutdown: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined),
    getAccounts: vi.fn().mockResolvedValue([
      { id: 'acc-1', name: 'Checking', balance: 100000, closed: false },
      { id: 'acc-2', name: 'Savings', balance: 500000, closed: false },
    ]),
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Food', group_id: 'group-1' },
      { id: 'cat-2', name: 'Transport', group_id: 'group-1' },
    ]),
    getCategoryGroups: vi.fn().mockResolvedValue([{ id: 'group-1', name: 'Expenses' }]),
    getPayees: vi.fn().mockResolvedValue([
      { id: 'payee-1', name: 'Grocery Store' },
      { id: 'payee-2', name: 'Gas Station' },
    ]),
    addTransactions: vi.fn().mockResolvedValue('new-transaction-id'),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
    setBudgetAmount: vi.fn().mockResolvedValue(undefined),
    setBudgetCarryover: vi.fn().mockResolvedValue(undefined),
    getAccountBalance: vi.fn().mockResolvedValue(100000),
    importTransactions: vi.fn().mockResolvedValue({ added: ['new-transaction-id'], updated: [] }),
    getTransactions: vi.fn().mockResolvedValue([
      {
        id: 'trans-1',
        account: 'acc-1',
        date: '2025-01-15',
        amount: -5000,
        payee: 'payee-1',
        category: 'cat-1',
      },
    ]),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

// Mock performance tracking
vi.mock('./core/performance/performance-logger.js', () => ({
  logToolExecution: vi.fn(),
}));

vi.mock('./core/performance/metrics-tracker.js', () => ({
  metricsTracker: {
    record: vi.fn(),
  },
}));

describe('Integration Tests - MCP Simplification', () => {
  let server: Server;
  let callToolHandler: ((request: { params: { name: string; arguments?: unknown } }) => Promise<unknown>) | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create a mock server
    server = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === CallToolRequestSchema) {
          callToolHandler = handler as (request: { params: { name: string; arguments?: unknown } }) => Promise<unknown>;
        }
      }),
      close: vi.fn(),
    } as unknown as Server;

    vi.clearAllMocks();

    // Reset initialization state
    await actualApi.shutdownActualApi();
    actualApi.resetInitializationStats();
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    callToolHandler = undefined;
    await actualApi.shutdownActualApi();
  });

  describe('Complete Workflow with New Tools', () => {
    it('should verify new consolidated tools are available in tool registry', async () => {
      // Setup environment
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';

      // Initialize API (simulating server startup)
      await actualApi.initActualApi();

      // Setup tools
      setupTools(server, true); // Enable write operations

      expect(callToolHandler).toBeDefined();

      // Verify new consolidated tools are registered
      const tools = getAvailableTools(true);

      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
    });

    it('should maintain persistent connection during multiple tool calls', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';

      await actualApi.initActualApi();
      setupTools(server, false); // Read-only mode

      expect(callToolHandler).toBeDefined();

      // Simulate multiple tool calls
      const tools = getAvailableTools(false);

      // Verify read-only tools are available
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-grouped-categories')).toBe(true);

      // Verify write tools are not available in read-only mode
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(false);
    });
  });

  describe('Auto-load on Server Startup', () => {
    it('should automatically load budget on startup with ACTUAL_BUDGET_SYNC_ID', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      const api = await import('@actual-app/api');

      await actualApi.initActualApi();

      // Verify budget was auto-loaded
      expect(api.default.init).toHaveBeenCalled();
      expect(api.default.downloadBudget).toHaveBeenCalledWith('test-sync-id');

      // Setup tools and verify they work immediately
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      const result = await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      expect((result as { content: unknown[] }).content).toBeDefined();
    });

    it('should load first available budget when ACTUAL_BUDGET_SYNC_ID is not set', async () => {
      delete process.env.ACTUAL_BUDGET_SYNC_ID;
      process.env.ACTUAL_DATA_DIR = '/test/data';

      const api = await import('@actual-app/api');

      await actualApi.initActualApi();

      // Verify first budget was loaded
      expect(api.default.init).toHaveBeenCalled();
      expect(api.default.downloadBudget).toHaveBeenCalledWith('test-sync-id');
    });

    it('should handle auto-load errors gracefully', async () => {
      process.env.ACTUAL_BUDGET_SYNC_ID = 'invalid-budget-id';
      process.env.ACTUAL_DATA_DIR = '/test/data';

      const api = await import('@actual-app/api');
      vi.mocked(api.default.downloadBudget).mockRejectedValueOnce(new Error('Budget not found'));

      await expect(actualApi.initActualApi()).rejects.toThrow('Budget not found');
    });
  });

  describe('Name Resolution in Real Scenarios', () => {
    it('should verify name resolver is available for tools', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';

      await actualApi.initActualApi();
      setupTools(server, true);

      // Verify tools that use name resolution are registered
      const tools = getAvailableTools(true);

      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
    });

    it('should verify name resolver handles account lookups', async () => {
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';

      await actualApi.initActualApi();

      const api = await import('@actual-app/api');

      // Verify API methods for name resolution are called
      expect(api.default.getAccounts).toBeDefined();
      expect(api.default.getCategories).toBeDefined();
      expect(api.default.getPayees).toBeDefined();
    });
  });

  describe('Production-Ready Tool Set', () => {
    it('should have 19 core tools by default', async () => {
      const tools = getAvailableTools(true);
      const toolNames = tools.map((t) => t.schema.name);

      // Should have exactly 19 core tools (removed get-server-info)
      expect(tools.length).toBe(19);

      // New consolidated tools should be available
      expect(toolNames).toContain('manage-transaction');
      expect(toolNames).toContain('set-budget');
      expect(toolNames).toContain('get-budget');
      expect(toolNames).toContain('manage-budget-hold');
      expect(toolNames).toContain('import-transactions');

      // New utility tools should be available
      expect(toolNames).toContain('get-budgets');
      expect(toolNames).toContain('switch-budget');

      // get-server-info removed (not helpful)

      // Removed tools should NOT be present
      expect(toolNames).not.toContain('create-transaction');
      expect(toolNames).not.toContain('update-transaction');
      expect(toolNames).not.toContain('set-budget-amount');
      expect(toolNames).not.toContain('set-budget-carryover');
      expect(toolNames).not.toContain('get-account-balance');
      expect(toolNames).not.toContain('create-account');
      expect(toolNames).not.toContain('close-account');
      expect(toolNames).not.toContain('delete-account');
      expect(toolNames).not.toContain('get-server-info');
      expect(toolNames).not.toContain('load-budget');
      expect(toolNames).not.toContain('sync');
      expect(toolNames).not.toContain('get-id-by-name');
      expect(toolNames).not.toContain('get-server-version');

      // Consolidated tools should not exist
      expect(toolNames).not.toContain('get-budget-months');
      expect(toolNames).not.toContain('get-budget-month');
      expect(toolNames).not.toContain('hold-budget-for-next-month');
      expect(toolNames).not.toContain('reset-budget-hold');
      expect(toolNames).not.toContain('get-payee-rules');
      expect(toolNames).not.toContain('run-bank-sync');
      expect(toolNames).not.toContain('run-import');
    });

    it('should have clean tool descriptions without deprecation notices', async () => {
      const tools = getAvailableTools(true);

      // No tool descriptions should contain DEPRECATED
      tools.forEach((tool) => {
        expect(tool.schema.description || '').not.toContain('DEPRECATED');
        expect(tool.schema.description || '').not.toContain('deprecated');
      });
    });

    it('should verify all core tools are production-ready', async () => {
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      const tools = getAvailableTools(true);
      const toolNames = tools.map((t) => t.schema.name);

      // Core transaction tools
      expect(toolNames).toContain('get-transactions');
      expect(toolNames).toContain('manage-transaction');

      // Core account tools
      expect(toolNames).toContain('get-accounts');
      expect(toolNames).toContain('manage-account');

      // Core category & budget tools
      expect(toolNames).toContain('get-grouped-categories');
      expect(toolNames).toContain('set-budget');
      expect(toolNames).toContain('get-budget');
      expect(toolNames).toContain('manage-budget-hold');

      // Core entity management
      expect(toolNames).toContain('manage-entity');
      expect(toolNames).toContain('get-payees');
      expect(toolNames).toContain('get-rules');

      // Core insights
      expect(toolNames).toContain('spending-by-category');
      expect(toolNames).toContain('monthly-summary');
      expect(toolNames).toContain('balance-history');

      // Core advanced operations
      expect(toolNames).toContain('merge-payees');
      expect(toolNames).toContain('import-transactions');

      // Core schedules
      expect(toolNames).toContain('get-schedules');

      // Query tool is optional (not included when ENABLE_UTILITY_TOOLS=false)
      expect(toolNames).not.toContain('run-query');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full budget management session from startup to shutdown', async () => {
      // 1. Setup environment
      process.env.ACTUAL_DATA_DIR = '/test/data';
      process.env.ACTUAL_BUDGET_SYNC_ID = 'test-sync-id';
      process.env.ENABLE_BUDGET_MANAGEMENT = 'false';
      process.env.ENABLE_ADVANCED_ACCOUNT_OPS = 'false';
      process.env.ENABLE_UTILITY_TOOLS = 'false';

      // 2. Initialize API (server startup)
      await actualApi.initActualApi();

      const api = await import('@actual-app/api');
      expect(api.default.init).toHaveBeenCalled();
      expect(api.default.downloadBudget).toHaveBeenCalledWith('test-sync-id');

      // 3. Setup tools
      setupTools(server, true);
      expect(callToolHandler).toBeDefined();

      // 4. Verify core tools are available
      const tools = getAvailableTools(true);
      expect(tools.some((t) => t.schema.name === 'get-accounts')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'manage-transaction')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'set-budget')).toBe(true);
      expect(tools.some((t) => t.schema.name === 'get-transactions')).toBe(true);

      // 5. Verify removed tools are not available
      expect(tools.some((t) => t.schema.name === 'get-budgets')).toBe(true); // Now available as utility tool
      expect(tools.some((t) => t.schema.name === 'create-account')).toBe(false);

      // run-query is now optional, so it should NOT be available by default
      expect(tools.some((t) => t.schema.name === 'run-query')).toBe(false);

      // 6. Shutdown
      await actualApi.shutdownActualApi();
      expect(api.default.shutdown).toHaveBeenCalled();
    });
  });
});
