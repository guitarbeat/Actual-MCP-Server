/**
 * Tests for performance logging utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logToolExecution,
  logCacheStats,
  logPerformanceSummary,
  withPerformanceLogging,
} from './performance-logger.js';
import { metricsTracker } from './metrics-tracker.js';
import { cacheService } from '../cache/cache-service.js';

describe('Performance Logger', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    metricsTracker.clear();
    cacheService.clear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('logToolExecution', () => {
    it('should log successful tool execution', () => {
      logToolExecution('test-tool', 150, true);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[PERF]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test-tool'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('150.00ms'));
    });

    it('should log slow operations with warning', () => {
      logToolExecution('slow-tool', 2000, true);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('SLOW'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('2000.00ms'));
    });

    it('should log failed operations', () => {
      logToolExecution('failed-tool', 100, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failed-tool'));
    });
  });

  describe('logCacheStats', () => {
    it('should log cache statistics', () => {
      // Trigger some cache operations to generate stats
      cacheService.set('test-key', 'test-value');

      logCacheStats();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[CACHE]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stats'));
    });
  });

  describe('logPerformanceSummary', () => {
    it('should log performance summary when metrics exist', () => {
      metricsTracker.record('test-operation', 100, true);
      metricsTracker.record('test-operation', 200, true);

      logPerformanceSummary();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Summary'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test-operation'));
    });

    it('should handle empty metrics', () => {
      logPerformanceSummary();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No performance metrics'));
    });
  });

  describe('withPerformanceLogging', () => {
    it('should wrap handler with performance logging', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withPerformanceLogging('test-tool', mockHandler);

      const result = await wrappedHandler({ test: 'args' });

      expect(result).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalledWith({ test: 'args' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test-tool'));
    });

    it('should log errors and rethrow', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrappedHandler = withPerformanceLogging('failing-tool', mockHandler);

      await expect(wrappedHandler({ test: 'args' })).rejects.toThrow('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failing-tool'));
    });
  });
});
