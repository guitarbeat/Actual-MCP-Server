/**
 * Safe logging utility for MCP servers.
 * Ensures logs go through MCP logging in stdio mode to avoid corrupting JSON-RPC protocol.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track if we're in stdio mode with MCP logging enabled
let useMcpLogging = false;

/**
 * Setup safe logging for stdio mode.
 * Must be called BEFORE any initialization code that might log.
 *
 * @param server - The MCP server instance
 */
export function setupSafeLogging(_server: Server): void {
  useMcpLogging = true;

  // Override console methods to use MCP logging
  console.log = (...args: unknown[]): void => {
    const message = formatMessage(args);
    try {
      server.sendLoggingMessage({ level: 'info', message });
    } catch {
      // If MCP logging fails, fall back to original (shouldn't happen in stdio mode)
      originalConsoleLog(...args);
    }
  };

  console.error = (...args: unknown[]): void => {
    const message = formatMessage(args);
    try {
      server.sendLoggingMessage({ level: 'error', message });
    } catch {
      // If MCP logging fails, fall back to original
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: unknown[]): void => {
    const message = formatMessage(args);
    try {
      server.sendLoggingMessage({ level: 'warning', message });
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
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Check if MCP logging is currently enabled.
 *
 * @returns True if MCP logging is active
 */
export function isMcpLoggingEnabled(): boolean {
  return useMcpLogging;
}
