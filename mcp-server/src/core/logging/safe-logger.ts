/**
 * Safe logging utility for MCP servers.
 * Ensures logs go through MCP logging in stdio mode to avoid corrupting JSON-RPC protocol.
 *
 * Features:
 * - Structured logging with timestamps and context
 * - Request ID tracking for debugging
 * - Performance monitoring
 * - Error stack trace capture
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { randomUUID } from 'node:crypto';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track if we're in stdio mode with MCP logging enabled
let useMcpLogging = false;
let mcpServer: Server | null = null;

// Request ID tracking for debugging
let currentRequestId: string | null = null;

// Performance tracking
const performanceEnabled = process.env.DEBUG_PERFORMANCE === 'true';
const performanceMetrics: Map<string, { start: number; end?: number; duration?: number }> = new Map();

/**
 * Setup safe logging for stdio mode.
 * Must be called BEFORE any initialization code that might log.
 *
 * @param server - The MCP server instance
 */
export function setupSafeLogging(server: Server): void {
  useMcpLogging = true;
  mcpServer = server;

  // Override console methods to use MCP logging
  console.log = (...args: unknown[]): void => {
    const message = formatStructuredMessage('info', args);
    try {
      if (mcpServer) {
        mcpServer.sendLoggingMessage({ level: 'info', data: message });
      }
    } catch {
      // If MCP logging fails, fall back to original (shouldn't happen in stdio mode)
      originalConsoleLog(...args);
    }
  };

  console.error = (...args: unknown[]): void => {
    const message = formatStructuredMessage('error', args);
    try {
      if (mcpServer) {
        mcpServer.sendLoggingMessage({ level: 'error', data: message });
      }
    } catch {
      // If MCP logging fails, fall back to original
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: unknown[]): void => {
    const message = formatStructuredMessage('warning', args);
    try {
      if (mcpServer) {
        mcpServer.sendLoggingMessage({ level: 'warning', data: message });
      }
    } catch {
      // If MCP logging fails, fall back to original
      originalConsoleWarn(...args);
    }
  };
}

/**
 * Restore original console methods.
 * Useful when switching transports or shutting down.
 */
export function restoreConsoleMethods(): void {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  useMcpLogging = false;
  mcpServer = null;
}

/**
 * Set the current request ID for logging context.
 * Useful for tracking requests across multiple log entries.
 *
 * @param requestId - Unique request identifier (or null to clear)
 */
export function setRequestId(requestId: string | null): void {
  currentRequestId = requestId;
}

/**
 * Generate a new request ID and set it as current.
 *
 * @returns The generated request ID
 */
export function generateRequestId(): string {
  const requestId = randomUUID();
  currentRequestId = requestId;
  return requestId;
}

/**
 * Format console arguments into a structured message string with context.
 *
 * @param level - Log level
 * @param args - Console arguments
 * @returns Formatted message string with timestamp and context
 */
function formatStructuredMessage(level: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = formatMessage(args);

  // Build context parts
  const contextParts: string[] = [];

  if (currentRequestId) {
    contextParts.push(`requestId=${currentRequestId.substring(0, 8)}`);
  }

  const contextStr = contextParts.length > 0 ? ` [${contextParts.join(', ')}]` : '';

  return `[${level.toUpperCase()}] ${timestamp}${contextStr}: ${message}`;
}

/**
 * Format console arguments into a single message string.
 *
 * @param args - Console arguments
 * @returns Formatted message string
 */
function formatMessage(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Start performance tracking for an operation.
 *
 * @param operationId - Unique identifier for the operation
 * @returns The operation ID (same as input, or generated if not provided)
 */
export function startPerformanceTracking(operationId?: string): string {
  if (!performanceEnabled) {
    return operationId || '';
  }

  const id = operationId || randomUUID();
  performanceMetrics.set(id, { start: performance.now() });
  return id;
}

/**
 * End performance tracking for an operation and log the duration.
 *
 * @param operationId - Unique identifier for the operation
 * @param operationName - Human-readable name for logging
 * @returns Duration in milliseconds, or undefined if tracking not enabled
 */
export function endPerformanceTracking(operationId: string, operationName?: string): number | undefined {
  if (!performanceEnabled || !performanceMetrics.has(operationId)) {
    return undefined;
  }

  const metric = performanceMetrics.get(operationId)!;
  metric.end = performance.now();
  metric.duration = metric.end - metric.start;

  const name = operationName || operationId;
  const message = `[PERF] ${name}: ${metric.duration.toFixed(2)}ms`;

  try {
    if (mcpServer) {
      mcpServer.sendLoggingMessage({ level: 'info', data: message });
    } else {
      originalConsoleLog(message);
    }
  } catch {
    originalConsoleLog(message);
  }

  performanceMetrics.delete(operationId);
  return metric.duration;
}

/**
 * Check if MCP logging is currently enabled.
 *
 * @returns True if MCP logging is active
 */
export function isMcpLoggingEnabled(): boolean {
  return useMcpLogging;
}
