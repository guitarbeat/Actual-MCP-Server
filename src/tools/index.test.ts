import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupTools } from './index.js';
import * as actualApi from '../actual-api.js';
import { MCPResponse } from '../core/response/index.js';

// Mock the actual-api module
vi.mock('../actual-api.js', () => ({
  initActualApi: vi.fn().mockResolvedValue(undefined),
  shutdownActualApi: vi.fn().mockResolvedValue(undefined),
}));

// Mock performance tracking
vi.mock('../core/performance/performance-logger.js', () => ({
  logToolExecution: vi.fn(),
}));

vi.mock('../core/performance/metrics-tracker.js', () => ({
  metricsTracker: {
    record: vi.fn(),
  },
}));

// Mock a sample read tool
vi.mock('./get-accounts/index.js', () => ({
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

// Mock a sample write tool
vi.mock('./accounts/create-account/index.js', () => ({
  schema: {
    name: 'create-account',
    description: 'Create a new account',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  },
  handler: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Account created' }],
  }),
}));

describe('Tool Registration System', () => {
  let server: Server;
  let listToolsHandler: (() => Promise<{ tools: unknown[] }>) | undefined;
  let callToolHandler:
    | ((request: { params: { name: string; arguments?: unknown } }) => Promise<MCPResponse>)
    | undefined;

  beforeEach(() => {
    // Create a mock server
    server = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === ListToolsRequestSchema) {
          listToolsHandler = handler as () => Promise<{ tools: unknown[] }>;
        } else if (schema === CallToolRequestSchema) {
          callToolHandler = handler as (request: {
            params: { name: string; arguments?: unknown };
          }) => Promise<MCPResponse>;
        }
      }),
    } as unknown as Server;

    vi.clearAllMocks();
  });

  afterEach(() => {
    listToolsHandler = undefined;
    callToolHandler = undefined;
  });

  describe('Tool Discovery', () => {
    it('should register list-tools handler', () => {
      setupTools(server, false);

      expect(server.setRequestHandler).toHaveBeenCalledWith(ListToolsRequestSchema, expect.any(Function));
    });

    it('should list only read tools when write is disabled', async () => {
      setupTools(server, false);

      expect(listToolsHandler).toBeDefined();
      const result = await listToolsHandler!();

      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);

      // Check that write tools are not included
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get-accounts');
      expect(toolNames).not.toContain('create-account');
    });

    it('should list all tools when write is enabled', async () => {
      setupTools(server, true);

      expect(listToolsHandler).toBeDefined();
      const result = await listToolsHandler!();

      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);

      // Check that both read and write tools are included
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get-accounts');
      expect(toolNames).toContain('create-account');
    });
  });

  describe('Tool Execution', () => {
    it('should register call-tool handler', () => {
      setupTools(server, false);

      expect(server.setRequestHandler).toHaveBeenCalledWith(CallToolRequestSchema, expect.any(Function));
    });

    it('should execute read tool successfully', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      expect(actualApi.initActualApi).toHaveBeenCalled();
      expect(actualApi.shutdownActualApi).toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toEqual({ type: 'text', text: 'Accounts retrieved' });
    });

    it('should execute write tool when write is enabled', async () => {
      setupTools(server, true);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'create-account', arguments: { name: 'Test Account' } },
      });

      expect(actualApi.initActualApi).toHaveBeenCalled();
      expect(actualApi.shutdownActualApi).toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toEqual({ type: 'text', text: 'Account created' });
    });

    it('should return error for unknown tool', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'non-existent-tool', arguments: {} },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toContain('Unknown tool');
      expect(payload.message).toContain('non-existent-tool');
    });
  });

  describe('Write Permission Enforcement', () => {
    it('should block write tool when write is disabled', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'create-account', arguments: { name: 'Test Account' } },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toContain('requires write permission');
      expect(payload.suggestion).toContain('--enable-write');
    });

    it('should allow read tool when write is disabled', async () => {
      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
    });

    it('should allow write tool when write is enabled', async () => {
      setupTools(server, true);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'create-account', arguments: { name: 'Test Account' } },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      // Mock a tool that throws an error
      const { handler: getAccountsHandler } = await import('./get-accounts/index.js');
      vi.mocked(getAccountsHandler).mockRejectedValueOnce(new Error('Database connection failed'));

      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      const result = await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text);
      expect(payload.message).toContain('Database connection failed');
      expect(payload.suggestion).toBeDefined();
    });

    it('should ensure API cleanup even on error', async () => {
      // Mock a tool that throws an error
      const { handler: getAccountsHandler } = await import('./get-accounts/index.js');
      vi.mocked(getAccountsHandler).mockRejectedValueOnce(new Error('Test error'));

      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      // Verify cleanup was called
      expect(actualApi.shutdownActualApi).toHaveBeenCalled();
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a tool that throws an error
      const { handler: getAccountsHandler } = await import('./get-accounts/index.js');
      vi.mocked(getAccountsHandler).mockRejectedValueOnce(new Error('Test error'));

      setupTools(server, false);

      expect(callToolHandler).toBeDefined();
      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      // Verify error was logged with context (new format includes timestamp and context)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));

      consoleErrorSpy.mockRestore();
    });
  });
});
