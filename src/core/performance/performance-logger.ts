/**
 * Performance logging utilities for monitoring and reporting.
 * Provides logging for tool execution times, cache statistics, and slow operations.
 */

import { cacheService } from '../cache/cache-service.js';
import { metricsTracker } from './metrics-tracker.js';

/**
 * Configuration for performance logging.
 */
interface PerformanceLogConfig {
  enabled: boolean;
  slowOperationThresholdMs: number;
  cacheStatsIntervalMs: number;
}

/**
 * Get performance logging configuration from environment variables.
 *
 * @returns Performance logging configuration
 */
function getConfig(): PerformanceLogConfig {
  return {
    enabled: process.env.PERFORMANCE_LOGGING_ENABLED !== 'false',
    slowOperationThresholdMs: parseInt(process.env.PERFORMANCE_LOG_THRESHOLD_MS || '1000', 10),
    cacheStatsIntervalMs: parseInt(process.env.PERFORMANCE_CACHE_STATS_INTERVAL_MS || '300000', 10), // 5 minutes default
  };
}

/**
 * Log execution time for a tool invocation.
 *
 * @param toolName - Name of the tool
 * @param duration - Execution duration in milliseconds
 * @param success - Whether the operation succeeded
 */
export function logToolExecution(toolName: string, duration: number, success: boolean): void {
  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  const status = success ? '✓' : '✗';
  const durationFormatted = duration.toFixed(2);

  // Log slow operations with warning
  if (duration >= config.slowOperationThresholdMs) {
    console.error(
      `[PERF] ⚠️  SLOW ${status} ${toolName}: ${durationFormatted}ms (threshold: ${config.slowOperationThresholdMs}ms)`
    );
  } else {
    console.error(`[PERF] ${status} ${toolName}: ${durationFormatted}ms`);
  }
}

/**
 * Log cache statistics.
 */
export function logCacheStats(): void {
  const config = getConfig();

  if (!config.enabled || !cacheService.isEnabled()) {
    return;
  }

  const stats = cacheService.getStats();
  console.error(
    `[CACHE] Stats - Hits: ${stats.hits}, Misses: ${stats.misses}, Entries: ${stats.entries}, Hit Rate: ${stats.hitRate}%`
  );
}

/**
 * Log performance summary with all tracked operations.
 */
export function logPerformanceSummary(): void {
  const config = getConfig();

  if (!config.enabled || !metricsTracker.isEnabled()) {
    return;
  }

  const summaries = metricsTracker.getAllSummaries();

  if (summaries.length === 0) {
    console.error('[PERF] No performance metrics recorded yet');
    return;
  }

  console.error('[PERF] ═══════════════════════════════════════════════════════');
  console.error('[PERF] Performance Summary');
  console.error('[PERF] ═══════════════════════════════════════════════════════');

  // Sort by average duration (slowest first)
  const sorted = summaries.sort((a, b) => b.avgDuration - a.avgDuration);

  for (const summary of sorted) {
    const successRateFormatted = summary.successRate.toFixed(1);
    console.error(
      `[PERF] ${summary.operation.padEnd(30)} | ` +
        `Calls: ${summary.count.toString().padStart(4)} | ` +
        `Avg: ${summary.avgDuration.toFixed(2).padStart(8)}ms | ` +
        `Min: ${summary.minDuration.toFixed(2).padStart(8)}ms | ` +
        `Max: ${summary.maxDuration.toFixed(2).padStart(8)}ms | ` +
        `Success: ${successRateFormatted.padStart(5)}%`
    );
  }

  console.error('[PERF] ═══════════════════════════════════════════════════════');
}

/**
 * Log initialization performance statistics.
 *
 * @param stats - Initialization statistics from actual-api
 */
export function logInitializationStats(stats: {
  initializationTime: number | null;
  skipCount: number;
  timeSaved: number;
}): void {
  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  console.error('[PERF] ───────────────────────────────────────────────────────');
  console.error('[PERF] Persistent Connection Benefits');
  console.error('[PERF] ───────────────────────────────────────────────────────');

  if (stats.initializationTime !== null) {
    console.error(`[PERF] Initial connection time: ${stats.initializationTime}ms`);
  }

  if (stats.skipCount > 0) {
    console.error(`[PERF] Initialization skipped: ${stats.skipCount} times`);
    console.error(`[PERF] Total time saved: ~${stats.timeSaved}ms (~${(stats.timeSaved / 1000).toFixed(2)}s)`);

    if (stats.initializationTime) {
      const avgSavingsPerSkip = stats.timeSaved / stats.skipCount;
      console.error(`[PERF] Average savings per skip: ~${avgSavingsPerSkip.toFixed(0)}ms`);
    }
  } else {
    console.error('[PERF] No initialization skips recorded (single request or first run)');
  }

  console.error('[PERF] ───────────────────────────────────────────────────────');
}

/**
 * Start periodic cache statistics logging.
 *
 * @returns Interval ID for stopping the periodic logging
 */
export function startPeriodicCacheStatsLogging(): NodeJS.Timeout | null {
  const config = getConfig();

  if (!config.enabled || !cacheService.isEnabled()) {
    return null;
  }

  return setInterval(() => {
    logCacheStats();
  }, config.cacheStatsIntervalMs);
}

/**
 * Stop periodic cache statistics logging.
 *
 * @param intervalId - Interval ID returned by startPeriodicCacheStatsLogging
 */
export function stopPeriodicCacheStatsLogging(intervalId: NodeJS.Timeout | null): void {
  if (intervalId) {
    clearInterval(intervalId);
  }
}

/**
 * Wrap a tool handler with performance logging.
 *
 * @param toolName - Name of the tool
 * @param handler - Tool handler function
 * @returns Wrapped handler with performance logging
 */
export function withPerformanceLogging<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    const startTime = Date.now();
    let success = true;

    try {
      const result = await handler(args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      metricsTracker.record(toolName, duration, success);
      logToolExecution(toolName, duration, success);
    }
  };
}
