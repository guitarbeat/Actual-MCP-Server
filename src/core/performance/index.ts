/**
 * Performance module barrel export
 * Provides centralized exports for performance tracking and logging
 */
export { metricsTracker, MetricsTracker, type PerformanceMetric, type PerformanceSummary } from './metrics-tracker.js';

export {
  logToolExecution,
  logCacheStats,
  logPerformanceSummary,
  logInitializationStats,
  startPeriodicCacheStatsLogging,
  stopPeriodicCacheStatsLogging,
  withPerformanceLogging,
} from './performance-logger.js';
