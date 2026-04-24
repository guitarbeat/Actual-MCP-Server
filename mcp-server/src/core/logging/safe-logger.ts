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

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Store original console methods before overriding
 */
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track if we're in stdio mode with MCP logging enabled
let useMcpLogging = false;
let mcpServer: Server | null = null;

// * Request ID tracking for debugging using AsyncLocalStorage
// * This ensures request IDs are isolated per async context, preventing race conditions
// * when multiple requests run concurrently
const requestIdStorage = new AsyncLocalStorage<string | null>();

// Performance tracking
const performanceEnabled = process.env.DEBUG_PERFORMANCE === 'true';
const performanceMetrics: Map<string, { start: number; end?: number; duration?: number }> =
  new Map();

// Sensitive data patterns for redaction
const SENSITIVE_KEY_REGEX =
  /pass(word|phrase)|(?<!(input|output|max|total)_)token|secret|(private|api|access).?key|authorization|bearer|credential/i;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[a-zA-Z0-9\-._~+/]+=*/gi;

/**
 * Redacts sensitive information from objects and strings.
 * Used as a JSON.stringify replacer or standalone value processor.
 *
 * @param key - The object key (if applicable)
 * @param value - The value to check and potentially redact
 * @returns The original value or a redacted string
 */
function redactValue(key: string, value: unknown): unknown {
  // Redact based on key name
  if (key && SENSITIVE_KEY_REGEX.test(key)) {
    return '[REDACTED]';
  }

  // Redact sensitive patterns in string values
  if (typeof value === 'string') {
    // Redact Bearer tokens using capture groups to preserve prefix/whitespace
    return value.replace(BEARER_TOKEN_REGEX, '$1[REDACTED]');
  }

  return value;
}

/**
 * Setup safe logging for stdio mode.
 * Overrides console methods to route logs through MCP logging protocol,
 * preventing JSON-RPC corruption from direct console output.
 *
 * Must be called BEFORE any initialization code that might log.
 *
 * @param server - The MCP server instance to use for logging
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
 * Reverts console.log, console.error, and console.warn to their original implementations.
 * Useful when switching transports or shutting down the server.
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
 * * Uses AsyncLocalStorage to ensure request IDs are isolated per async context,
 * * preventing race conditions when multiple requests run concurrently.
 *
 * @param requestId - Unique request identifier (or null to clear)
 */
export function setRequestId(requestId: string | null): void {
  requestIdStorage.enterWith(requestId);
}

/**
 * Generate a new request ID and set it as current.
 *
 * * Uses AsyncLocalStorage to ensure request IDs are isolated per async context,
 * * preventing race conditions when multiple requests run concurrently.
 *
 * @returns The generated request ID
 */
export function generateRequestId(): string {
  const requestId = randomUUID();
  requestIdStorage.enterWith(requestId);
  return requestId;
}

/**
 * Run a function with a specific request ID in the async context.
 * This is the recommended way to set request IDs for async operations.
 *
 * @param requestId - Unique request identifier (or null)
 * @param fn - Function to run with the request ID in context
 * @returns Result of the function
 */
export function withRequestId<T>(requestId: string | null, fn: () => T): T {
  return requestIdStorage.run(requestId, fn);
}

/**
 * Run an async function with a specific request ID in the async context.
 * This is the recommended way to set request IDs for async operations.
 *
 * @param requestId - Unique request identifier (or null)
 * @param fn - Async function to run with the request ID in context
 * @returns Promise resolving to the result of the function
 */
export async function withRequestIdAsync<T>(
  requestId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  return requestIdStorage.run(requestId, fn);
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

  // * Get request ID from async context (thread-safe)
  const currentRequestId = requestIdStorage.getStore();
  if (currentRequestId) {
    contextParts.push(`requestId=${currentRequestId.substring(0, 8)}`);
  }

  const contextStr = contextParts.length > 0 ? ` [${contextParts.join(', ')}]` : '';

  return `[${level.toUpperCase()}] ${timestamp}${contextStr}: ${message}`;
}

/**
 * Format console arguments into a single message string.
 * Handles various argument types including Error objects, plain objects, and primitives.
 *
 * @param args - Console arguments to format
 * @returns Formatted message string with all arguments joined by spaces
 */
export function formatMessage(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        // Include stack trace for Error objects unless in production
        const showStack = process.env.NODE_ENV !== 'production';
        return `${arg.message}${showStack && arg.stack ? `\n${arg.stack}` : ''}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          // Attempt to stringify objects with redaction
          return JSON.stringify(arg, redactValue, 2);
        } catch {
          // Fallback to basic string representation if stringify fails
          // Ensure we still attempt to redact sensitive patterns from the resulting string
          return String(redactValue('', String(arg)));
        }
      }
      // Handle primitive strings that might contain sensitive data
      if (typeof arg === 'string') {
        return String(redactValue('', arg));
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
export function endPerformanceTracking(
  operationId: string,
  operationName?: string,
): number | undefined {
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
 * Returns true if console methods have been overridden to use MCP logging.
 *
 * @returns True if MCP logging is active, false otherwise
 */
export function isMcpLoggingEnabled(): boolean {
  return useMcpLogging;
}
