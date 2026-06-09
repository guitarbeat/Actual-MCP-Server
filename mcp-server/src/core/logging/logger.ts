/**
 * Structured logger using pino.
 *
 * In MCP stdio mode, logs are written to stderr (fd 2) to avoid
 * corrupting the JSON-RPC stream on stdout.
 *
 * Usage:
 *   import { getLogger } from '../core/logging/logger.js';
 *   const logger = getLogger('my-component');
 *   logger.info({ event: 'something-happened' }, 'Human message');
 */

import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

// Root logger instance - writes to stderr to preserve stdout for MCP stdio transport
export const rootLogger = pino(
  {
    level: LOG_LEVEL,
    base: { pid: undefined },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination(2),
);

/**
 * Get a child logger scoped to a component name.
 *
 * @param component - Component or module name (e.g. 'http', 'actual-client')
 * @returns A pino child logger with the component label bound
 */
export function getLogger(component: string): pino.Logger {
  return rootLogger.child({ component });
}
