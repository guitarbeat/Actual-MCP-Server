import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsTracker, type PerformanceSummary } from './metrics-tracker.js';

describe('MetricsTracker', () => {
  let tracker: MetricsTracker;

  beforeEach(() => {
    // Create a fresh instance for each test
    tracker = new MetricsTracker();
    tracker.clear();
  });

  describe('record', () => {
    it('should record a performance metric', () => {
      tracker.record('test-operation', 100, true);

      const summary = tracker.getSummary('test-operation');
      expect(summary).not.toBeNull();
      expect(summary?.count).toBe(1);
      expect(summary?.avgDuration).toBe(100);
    });

    it('should record multiple metrics for the same operation', () => {
      tracker.record('test-operation', 100, true);
      tracker.record('test-operation', 200, true);
      tracker.record('test-operation', 150, true);

      const summary = tracker.getSummary('test-operation');
      expect(summary?.count).toBe(3);
      expect(summary?.avgDuration).toBe(150);
    });

    it('should track success and failure separately', () => {
      tracker.record('test-operation', 100, true);
      tracker.record('test-operation', 200, false);
      tracker.record('test-operation', 150, true);

      const summary = tracker.getSummary('test-operation');
      expect(summary?.successRate).toBe(66.67);
    });
  });

  describe('getSummary', () => {
    it('should return null for non-existent operation', () => {
      const summary = tracker.getSummary('non-existent');
      expect(summary).toBeNull();
    });

    it('should calculate correct statistics', () => {
      tracker.record('test-operation', 100, true);
      tracker.record('test-operation', 200, true);
      tracker.record('test-operation', 300, false);

      const summary = tracker.getSummary('test-operation');
      expect(summary).toEqual({
        operation: 'test-operation',
        count: 3,
        avgDuration: 200,
        minDuration: 100,
        maxDuration: 300,
        successRate: 66.67,
      });
    });

    it('should handle single metric correctly', () => {
      tracker.record('single-op', 150, true);

      const summary = tracker.getSummary('single-op');
      expect(summary).toEqual({
        operation: 'single-op',
        count: 1,
        avgDuration: 150,
        minDuration: 150,
        maxDuration: 150,
        successRate: 100,
      });
    });
  });

  describe('getAllSummaries', () => {
    it('should return empty array when no metrics recorded', () => {
      const summaries = tracker.getAllSummaries();
      expect(summaries).toEqual([]);
    });

    it('should return summaries for all operations', () => {
      tracker.record('operation-1', 100, true);
      tracker.record('operation-2', 200, true);
      tracker.record('operation-1', 150, true);

      const summaries = tracker.getAllSummaries();
      expect(summaries).toHaveLength(2);

      const op1Summary = summaries.find((s: PerformanceSummary) => s.operation === 'operation-1');
      const op2Summary = summaries.find((s: PerformanceSummary) => s.operation === 'operation-2');

      expect(op1Summary?.count).toBe(2);
      expect(op2Summary?.count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      tracker.record('operation-1', 100, true);
      tracker.record('operation-2', 200, true);

      tracker.clear();

      const summaries = tracker.getAllSummaries();
      expect(summaries).toEqual([]);
      expect(tracker.getSummary('operation-1')).toBeNull();
    });
  });

  describe('measure', () => {
    it('should measure successful operation', async () => {
      const testFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      });

      const result = await tracker.measure('test-measure', testFn);

      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalledOnce();

      const summary = tracker.getSummary('test-measure');
      expect(summary?.count).toBe(1);
      expect(summary?.successRate).toBe(100);
      expect(summary?.avgDuration).toBeGreaterThanOrEqual(10);
    });

    it('should measure failed operation', async () => {
      const testFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Test error');
      });

      await expect(tracker.measure('test-measure-fail', testFn)).rejects.toThrow('Test error');

      const summary = tracker.getSummary('test-measure-fail');
      expect(summary?.count).toBe(1);
      expect(summary?.successRate).toBe(0);
      expect(summary?.avgDuration).toBeGreaterThanOrEqual(10);
    });

    it('should measure multiple operations', async () => {
      const fastFn = vi.fn(async () => 'fast');
      const slowFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return 'slow';
      });

      await tracker.measure('multi-op', fastFn);
      await tracker.measure('multi-op', slowFn);

      const summary = tracker.getSummary('multi-op');
      expect(summary?.count).toBe(2);
      expect(summary?.successRate).toBe(100);
    });
  });

  describe('disabled mode', () => {
    it('should not record metrics when disabled', () => {
      const originalEnv = process.env.PERFORMANCE_LOGGING_ENABLED;
      process.env.PERFORMANCE_LOGGING_ENABLED = 'false';

      const disabledTracker = new MetricsTracker();
      disabledTracker.record('test-operation', 100, true);

      const summary = disabledTracker.getSummary('test-operation');
      expect(summary).toBeNull();

      process.env.PERFORMANCE_LOGGING_ENABLED = originalEnv;
    });

    it('should still execute function in measure when disabled', async () => {
      const originalEnv = process.env.PERFORMANCE_LOGGING_ENABLED;
      process.env.PERFORMANCE_LOGGING_ENABLED = 'false';

      const disabledTracker = new MetricsTracker();
      const testFn = vi.fn(async () => 'result');

      const result = await disabledTracker.measure('test-op', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalledOnce();
      expect(disabledTracker.getSummary('test-op')).toBeNull();

      process.env.PERFORMANCE_LOGGING_ENABLED = originalEnv;
    });
  });
});
