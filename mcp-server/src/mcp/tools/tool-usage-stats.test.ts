import { afterEach, beforeEach, describe, expect, it, vi, MockInstance } from 'vitest';
import {
  recordToolInvocation,
  peekToolInvocationStats,
  resetToolInvocationStats,
  scheduleToolUsageSummaryIfEnabled,
  shutdownToolUsageSummary,
} from './tool-usage-stats.js';

describe('Tool Usage Stats', () => {
  let consoleErrorMock: MockInstance;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    resetToolInvocationStats();
    shutdownToolUsageSummary();
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    resetToolInvocationStats();
    shutdownToolUsageSummary();
    consoleErrorMock.mockRestore();
    process.env = originalEnv;
    vi.useRealTimers();
  });

  describe('Core Stats Tracking', () => {
    it('should record tool invocations and peek stats', () => {
      recordToolInvocation('tool_a');
      recordToolInvocation('tool_b');
      recordToolInvocation('tool_a');

      const stats = peekToolInvocationStats();
      expect(stats).toEqual({
        tool_a: 2,
        tool_b: 1,
      });
    });

    it('should peek stats in alphabetical order', () => {
      recordToolInvocation('tool_z');
      recordToolInvocation('tool_a');
      recordToolInvocation('tool_b');

      const stats = peekToolInvocationStats();
      const keys = Object.keys(stats);
      expect(keys).toEqual(['tool_a', 'tool_b', 'tool_z']);
    });

    it('should clear stats when resetToolInvocationStats is called', () => {
      recordToolInvocation('tool_a');
      resetToolInvocationStats();
      expect(peekToolInvocationStats()).toEqual({});
    });
  });

  describe('Summary Scheduling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should not schedule if MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC is not set', () => {
      delete process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC;
      scheduleToolUsageSummaryIfEnabled();
      vi.advanceTimersByTime(100000);
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('should not schedule if MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC is invalid or non-positive', () => {
      const invalidValues = ['not-a-number', '0', '-5', ''];

      for (const val of invalidValues) {
        process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = val;
        scheduleToolUsageSummaryIfEnabled();
        vi.advanceTimersByTime(100000);
        expect(consoleErrorMock).not.toHaveBeenCalled();
      }
    });

    it('should schedule logging interval and log top tools', () => {
      process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = '10';
      scheduleToolUsageSummaryIfEnabled();

      recordToolInvocation('tool_most_used');
      recordToolInvocation('tool_most_used');
      recordToolInvocation('tool_least_used');

      vi.advanceTimersByTime(10000);

      expect(consoleErrorMock).toHaveBeenCalledWith(
        '[TOOL_USAGE_SUMMARY] top_counts={"tool_most_used":2,"tool_least_used":1} tracked_unique=2',
      );
    });

    it('should log empty message if no tools recorded', () => {
      process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = '10';
      scheduleToolUsageSummaryIfEnabled();

      vi.advanceTimersByTime(10000);

      expect(consoleErrorMock).toHaveBeenCalledWith(
        '[TOOL_USAGE_SUMMARY] (no MCP tool executions recorded yet)',
      );
    });

    it('should only log the top 35 tools', () => {
      process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = '10';
      scheduleToolUsageSummaryIfEnabled();

      // Record 40 distinct tools
      for (let i = 0; i < 40; i++) {
        // give the first 35 slightly higher counts to ensure predictable ordering
        // Actually, just record them linearly. The higher index will have fewer counts? No, just loop.
        const count = 40 - i; // so tool_0 gets 40, tool_39 gets 1
        for (let c = 0; c < count; c++) {
          recordToolInvocation(`tool_${i}`);
        }
      }

      vi.advanceTimersByTime(10000);

      expect(consoleErrorMock).toHaveBeenCalled();

      const args = consoleErrorMock.mock.calls[0][0];
      expect(args).toContain('tracked_unique=40');

      // Parse out the JSON payload
      const jsonMatch = args.match(/top_counts=(\{.*\})\stracked_unique=/);
      expect(jsonMatch).toBeTruthy();

      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[1]);
        expect(Object.keys(payload).length).toBe(35);
        expect(payload.tool_0).toBe(40);
        expect(payload.tool_34).toBe(6);
        expect(payload.tool_35).toBeUndefined();
      }
    });

    it('should shutdown interval when requested', () => {
      process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = '10';
      scheduleToolUsageSummaryIfEnabled();

      recordToolInvocation('tool_a');

      shutdownToolUsageSummary();

      vi.advanceTimersByTime(10000);
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('should not create multiple intervals on repeated schedule calls', () => {
      process.env.MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC = '10';

      scheduleToolUsageSummaryIfEnabled();
      scheduleToolUsageSummaryIfEnabled(); // second call should return early

      recordToolInvocation('tool_a');

      vi.advanceTimersByTime(10000);

      // should only be called once per 10s interval, not twice
      expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
