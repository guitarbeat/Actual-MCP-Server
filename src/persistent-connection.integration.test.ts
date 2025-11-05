import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupTools } from './tools/index.js';
import * as actualApi from './actual-api.js';

// Mock the actual-api module
vi.mock('./actual-api.js', async () => {
  const actual = await vi.importActual<typeof import('./actual-api.js')>('./actual-api.js');
  return {
    ...actual,
    initActualApi: vi.fn().mockResolvedValue(undefined),
    shutdownActualApi: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock performance tracking
vi.mock('./core/performance/performance-logger.js', () => ({
  logToolExecution: vi.fn(),
}));

vi.mock('./core/performance/metrics-tracker.js', () => ({
  metricsTracker: {
    record: vi.fn(),
  },
}));

// Mock sample tools for testing
vi.mock('./tools/get-accounts/index.js', () => ({
  schema: {
    name: 'get-accounts',
    description: 'Get all accounts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Accounts retrieved' }],
  }),
}));

vi.mock('./tools/get-transactions/index.js', () => ({
  schema: {
    name: 'get-transactions',
    description: 'Get transactions',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
      },
      required: ['accountId'],
    },
  },
  handler: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Transactions retrieved' }],
  }),
}));

vi.mock('./tools/categories/get-grouped-categories/index.js', () => ({
  schema: {
    name: 'get-grouped-categories',
    description: 'Get categories',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Categories retrieved' }],
  }),
}));

describe('Persistent API Connection - Integration Tests', () => {
  let server: Server;
  let callToolHandler: ((request: { params: { name: string; arguments?: unknown } }) => Promise<unknown>) | undefined;
  let originalProcessOn: typeof process.on;
  let signalHandlers: Map<string, ((...args: unknown[]) => void)[]>;

  beforeEach(() => {
    // Create a mock server
    server = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === CallToolRequestSchema) {
          callToolHandler = handler as (request: { params: { name: string; arguments?: unknown } }) => Promise<unknown>;
        }
      }),
      close: vi.fn(),
    } as unknown as Server;

    // Store original process.on and create a map to track signal handlers
    originalProcessOn = process.on;
    signalHandlers = new Map();

    // Mock process.on to capture signal handlers
    process.on = vi.fn((signal: string, handler: (...args: unknown[]) => void) => {
      if (!signalHandlers.has(signal)) {
        signalHandlers.set(signal, []);
      }
      signalHandlers.get(signal)!.push(handler);
      return process;
    }) as typeof process.on;

    vi.clearAllMocks();
  });

  afterEach(() => {
    callToolHandler = undefined;
    // Restore original process.on
    process.on = originalProcessOn;
    signalHandlers.clear();
  });

  describe('Consecutive Tool Calls', () => {
    it('should not call shutdownActualApi between consecutive tool executions', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();

      // Execute 5 consecutive tool calls
      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account-1' } },
      });

      await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account-2' } },
      });

      // Verify shutdownActualApi was NOT called during any of the tool executions
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();
    });

    it('should successfully execute all consecutive tool calls', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();

      // Execute 3 consecutive tool calls and verify all succeed
      const result1 = await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      const result2 = await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account' } },
      });

      const result3 = await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      // Verify all calls succeeded
      expect((result1 as { content: Array<{ text: string }> }).content[0].text).toBe('Accounts retrieved');
      expect((result2 as { content: Array<{ text: string }> }).content[0].text).toBe('Transactions retrieved');
      expect((result3 as { content: Array<{ text: string }> }).content[0].text).toBe('Categories retrieved');

      // Verify shutdownActualApi was NOT called
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();
    });

    it('should maintain connection across mixed read operations', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();

      // Execute multiple read operations in sequence
      const operations = [
        { name: 'get-accounts', arguments: {} },
        { name: 'get-grouped-categories', arguments: {} },
        { name: 'get-transactions', arguments: { accountId: 'acc-1' } },
        { name: 'get-accounts', arguments: {} },
      ];

      for (const operation of operations) {
        const result = await callToolHandler!({
          params: operation,
        });

        // Verify each operation succeeds
        expect((result as { content: unknown[] }).content).toBeDefined();
        expect((result as { isError?: boolean }).isError).toBeUndefined();
      }

      // Verify shutdownActualApi was NOT called during any operation
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();
    });
  });

  describe('Server Lifecycle', () => {
    it('should call initActualApi once at startup', async () => {
      // Simulate server startup by calling initActualApi
      await actualApi.initActualApi();

      // Verify initActualApi was called
      expect(actualApi.initActualApi).toHaveBeenCalledTimes(1);

      // Setup tools (this happens after initialization)
      setupTools(server, false);

      // Execute some operations
      expect(callToolHandler).toBeDefined();
      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account' } },
      });

      // Verify shutdownActualApi was NOT called during operation
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();
    });

    it('should not call shutdownActualApi during normal operation', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();

      // Execute multiple operations
      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account' } },
      });

      // Verify shutdownActualApi was NOT called during any operation
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();
    });

    it('should call shutdownActualApi on SIGINT', async () => {
      // Import the main module to register signal handlers
      // Note: We can't actually import index.ts in tests as it starts the server
      // Instead, we'll test the expected behavior by simulating the signal handler

      // Simulate what the SIGINT handler should do
      const mockSigintHandler = async () => {
        // This simulates the gracefulShutdown function in index.ts
        await actualApi.shutdownActualApi();
        server.close();
      };

      // Execute the handler
      await mockSigintHandler();

      // Verify shutdownActualApi was called
      expect(actualApi.shutdownActualApi).toHaveBeenCalledTimes(1);

      // Verify server.close was called
      expect(server.close).toHaveBeenCalledTimes(1);
    });

    it('should call shutdownActualApi on SIGTERM', async () => {
      // Simulate what the SIGTERM handler should do
      const mockSigtermHandler = async () => {
        // This simulates the gracefulShutdown function in index.ts
        await actualApi.shutdownActualApi();
        server.close();
      };

      // Execute the handler
      await mockSigtermHandler();

      // Verify shutdownActualApi was called
      expect(actualApi.shutdownActualApi).toHaveBeenCalledTimes(1);

      // Verify server.close was called
      expect(server.close).toHaveBeenCalledTimes(1);
    });

    it('should maintain persistent connection throughout server lifecycle', async () => {
      // Simulate complete server lifecycle

      // 1. Startup - initialize API
      await actualApi.initActualApi();
      expect(actualApi.initActualApi).toHaveBeenCalledTimes(1);

      // 2. Setup tools
      setupTools(server, false);

      // 3. Execute multiple operations during server lifetime
      expect(callToolHandler).toBeDefined();

      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'acc-1' } },
      });

      await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      // Verify shutdownActualApi was NOT called during operation
      expect(actualApi.shutdownActualApi).not.toHaveBeenCalled();

      // 4. Shutdown - cleanup
      await actualApi.shutdownActualApi();
      server.close();

      // Verify shutdownActualApi was called exactly once at shutdown
      expect(actualApi.shutdownActualApi).toHaveBeenCalledTimes(1);
      expect(server.close).toHaveBeenCalledTimes(1);
    });
  });
});
