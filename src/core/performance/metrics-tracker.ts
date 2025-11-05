/**
 * Performance metrics tracker for monitoring operation performance.
 * Tracks execution time, success rate, and provides statistical summaries.
 */

/**
 * Represents a single performance metric record.
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
}

/**
 * Statistical summary for a specific operation.
 */
export interface PerformanceSummary {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
}

/**
 * Metrics tracker for recording and analyzing performance data.
 * Singleton pattern ensures consistent metrics across the application.
 */
export class MetricsTracker {
  private metrics: Map<string, PerformanceMetric[]>;
  private readonly enabled: boolean;

  constructor() {
    this.metrics = new Map();
    this.enabled = process.env.PERFORMANCE_LOGGING_ENABLED !== 'false';
  }

  /**
   * Record a performance metric.
   *
   * @param operation - Name of the operation being tracked
   * @param duration - Duration in milliseconds
   * @param success - Whether the operation succeeded
   */
  record(operation: string, duration: number, success: boolean): void {
    if (!this.enabled) {
      return;
    }

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
    };

    const existing = this.metrics.get(operation) || [];
    existing.push(metric);
    this.metrics.set(operation, existing);
  }

  /**
   * Get summary statistics for a specific operation.
   *
   * @param operation - Name of the operation
   * @returns Performance summary or null if no metrics exist
   */
  getSummary(operation: string): PerformanceSummary | null {
    const operationMetrics = this.metrics.get(operation);

    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map((m) => m.duration);
    const successCount = operationMetrics.filter((m) => m.success).length;

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const successRate = (successCount / operationMetrics.length) * 100;

    return {
      operation,
      count: operationMetrics.length,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration: Math.round(minDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get summaries for all tracked operations.
   *
   * @returns Array of performance summaries
   */
  getAllSummaries(): PerformanceSummary[] {
    const summaries: PerformanceSummary[] = [];

    for (const operation of this.metrics.keys()) {
      const summary = this.getSummary(operation);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Clear all recorded metrics.
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Check if performance logging is enabled.
   *
   * @returns True if performance logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Wrap a function with automatic timing and metric recording.
   *
   * @param operation - Name of the operation being measured
   * @param fn - Async function to measure
   * @returns Result of the function execution
   */
  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = Date.now();
    let success = true;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.record(operation, duration, success);
    }
  }
}

// Singleton instance
export const metricsTracker = new MetricsTracker();
