/**
 * Logging module barrel export
 * Provides centralized exports for safe logging functionality
 */
export {
  generateRequestId,
  isMcpLoggingEnabled,
  restoreConsoleMethods,
  setRequestId,
  setupSafeLogging,
  withRequestId,
  withRequestIdAsync,
} from './safe-logger.js';

export { redactValue } from './redactor.js';
