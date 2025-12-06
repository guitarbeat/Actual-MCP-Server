/**
 * Logging module barrel export
 * Provides centralized exports for safe logging functionality
 */
export {
  setupSafeLogging,
  restoreConsoleMethods,
  isMcpLoggingEnabled,
  setRequestId,
  generateRequestId,
  withRequestId,
  withRequestIdAsync,
} from './safe-logger.js';
