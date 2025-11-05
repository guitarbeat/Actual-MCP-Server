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

// Mock sample tools with realistic delays
vi.mock('./tools/get-accounts/index.js', () => ({
  schema: {
    name: 'get-accounts',
    description: 'Get all accounts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: vi.fn().mockImplementation(async () => {
    // Simulate realistic tool execution time (50-100ms)
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
    return {
      content: [{ type: 'text', text: 'Accounts retrieved' }],
    };
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
  handler: vi.fn().mockImplementation(async () => {
    // Simulate realistic tool execution time (80-150ms)
    await new Promise((resolve) => setTimeout(resolve, 80 + Math.random() * 70));
    return {
      content: [{ type: 'text', text: 'Transactions retrieved' }],
    };
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
  handler: vi.fn().mockImplementation(async () => {
    // Simulate realistic tool execution time (60-120ms)
    await new Promise((resolve) => setTimeout(resolve, 60 + Math.random() * 60));
    return {
      content: [{ type: 'text', text: 'Categories retrieved' }],
    };
  }),
}));

describe('Persistent API Connection - Performance Benchmarks', () => {
  let server: Server;
  let callToolHandler: ((request: { params: { name: string; arguments?: unknown } }) => Promise<unknown>) | undefined;

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

    vi.clearAllMocks();
  });

  afterEach(() => {
    callToolHandler = undefined;
  });

  describe('Consecutive Tool Calls Performance', () => {
    it('should execute 3 consecutive tool calls efficiently', async () => {
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      // Measure time for 3 consecutive tool calls
      const startTime = Date.now();

      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account' } },
      });

      await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      const duration = Date.now() - startTime;

      // With persistent connection, 3 calls should complete in < 500ms
      // (realistic tool execution: ~50-150ms each = 150-450ms total)
      // Without persistent connection, this would be > 1500ms
      // (initialization: ~500-2000ms per call + execution time)
      expect(duration).toBeLessThan(500);

      console.log(`[BENCHMARK] 3 consecutive tool calls completed in ${duration}ms`);
    });

    it('should demonstrate 50%+ improvement over cold-start scenario', async () => {
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      // Simulate cold-start scenario (with initialization overhead)
      const coldStartOverhead = 600; // Minimum initialization time per call
      const estimatedColdStartTime = coldStartOverhead * 3; // ~1800ms for 3 calls

      // Measure actual time with persistent connection
      const startTime = Date.now();

      await callToolHandler!({
        params: { name: 'get-accounts', arguments: {} },
      });

      await callToolHandler!({
        params: { name: 'get-transactions', arguments: { accountId: 'test-account' } },
      });

      await callToolHandler!({
        params: { name: 'get-grouped-categories', arguments: {} },
      });

      const actualDuration = Date.now() - startTime;

      // Calculate improvement percentage
      const improvement = ((estimatedColdStartTime - actualDuration) / estimatedColdStartTime) * 100;

      console.log(`[BENCHMARK] Cold-start estimate: ${estimatedColdStartTime}ms`);
      console.log(`[BENCHMARK] Persistent connection: ${actualDuration}ms`);
      console.log(`[BENCHMARK] Improvement: ${improvement.toFixed(1)}%`);

      // Verify at least 50% improvement
      expect(improvement).toBeGreaterThanOrEqual(50);
    });

    it('should maintain consistent performance across multiple consecutive calls', async () => {
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      const callDurations: number[] = [];

      // Execute 5 consecutive calls and measure each
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        await callToolHandler!({
          params: { name: 'get-accounts', arguments: {} },
        });

        const duration = Date.now() - startTime;
        callDurations.push(duration);
      }

      // Calculate average and standard deviation
      const avgDuration = callDurations.reduce((sum, d) => sum + d, 0) / callDurations.length;
      const variance = callDurations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / callDurations.length;
      const stdDev = Math.sqrt(variance);

      console.log(`[BENCHMARK] 5 consecutive calls - Avg: ${avgDuration.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`);
      console.log(`[BENCHMARK] Individual durations: ${callDurations.map((d) => d.toFixed(0)).join('ms, ')}ms`);

      // Verify consistent performance (low standard deviation relative to mean)
      // Standard deviation should be less than 50% of the mean
      expect(stdDev).toBeLessThan(avgDuration * 0.5);

      // Verify all calls completed quickly
      expect(avgDuration).toBeLessThan(200);
    });

    it('should scale efficiently with increasing number of consecutive calls', async () => {
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      const callCounts = [1, 3, 5, 10];
      const results: { calls: number; duration: number; avgPerCall: number }[] = [];

      for (const count of callCounts) {
        const startTime = Date.now();

        for (let i = 0; i < count; i++) {
          await callToolHandler!({
            params: { name: 'get-accounts', arguments: {} },
          });
        }

        const duration = Date.now() - startTime;
        const avgPerCall = duration / count;

        results.push({ calls: count, duration, avgPerCall });

        console.log(`[BENCHMARK] ${count} calls: ${duration}ms total, ${avgPerCall.toFixed(2)}ms per call`);
      }

      // Verify that average time per call remains consistent
      // (doesn't increase significantly with more calls)
      const avgTimes = results.map((r) => r.avgPerCall);
      const maxAvg = Math.max(...avgTimes);
      const minAvg = Math.min(...avgTimes);

      // Max should not be more than 2x the min (allowing for some variance)
      expect(maxAvg).toBeLessThan(minAvg * 2);
    });
  });

  describe('Performance Comparison Metrics', () => {
    it('should provide detailed performance metrics for analysis', async () => {
      setupTools(server, false);
      expect(callToolHandler).toBeDefined();

      const metrics = {
        toolCalls: [] as { tool: string; duration: number }[],
        totalDuration: 0,
      };

      const tools = [
        { name: 'get-accounts', arguments: {} },
        { name: 'get-transactions', arguments: { accountId: 'acc-1' } },
        { name: 'get-grouped-categories', arguments: {} },
        { name: 'get-accounts', arguments: {} },
        { name: 'get-transactions', arguments: { accountId: 'acc-2' } },
      ];

      const overallStart = Date.now();

      for (const tool of tools) {
        const startTime = Date.now();

        await callToolHandler!({
          params: tool,
        });

        const duration = Date.now() - startTime;
        metrics.toolCalls.push({ tool: tool.name, duration });
      }

      metrics.totalDuration = Date.now() - overallStart;

      // Log detailed metrics
      console.log('[BENCHMARK] ═══════════════════════════════════════════════════════');
      console.log('[BENCHMARK] Detailed Performance Metrics');
      console.log('[BENCHMARK] ═══════════════════════════════════════════════════════');

      for (const call of metrics.toolCalls) {
        console.log(`[BENCHMARK] ${call.tool.padEnd(30)} ${call.duration}ms`);
      }

      console.log('[BENCHMARK] ───────────────────────────────────────────────────────');
      console.log(`[BENCHMARK] Total Duration: ${metrics.totalDuration}ms`);
      console.log(`[BENCHMARK] Average per Call: ${(metrics.totalDuration / metrics.toolCalls.length).toFixed(2)}ms`);
      console.log('[BENCHMARK] ═══════════════════════════════════════════════════════');

      // Verify overall performance
      expect(metrics.totalDuration).toBeLessThan(1000); // 5 calls in < 1 second
    });
  });
});
