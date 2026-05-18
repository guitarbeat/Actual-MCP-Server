import { getConnInfo } from '@hono/node-server/conninfo';
import type { MiddlewareHandler } from 'hono';
import { timingSafeStringEqual } from '../core/auth/index.js';

export function createBearerMiddleware(options: {
  enableBearer: boolean;
  expectedToken?: string;
}): MiddlewareHandler {
  const { enableBearer, expectedToken } = options;

  return async (c, next) => {
    if (!enableBearer) {
      const connInfo = getConnInfo(c);
      const remoteAddress = connInfo.remote.address;

      const isLoopback =
        remoteAddress === '127.0.0.1' ||
        remoteAddress === '::1' ||
        remoteAddress === '::ffff:127.0.0.1';

      if (!isLoopback) {
        return c.json(
          {
            error: 'Authentication disabled but remote access attempted',
            message:
              'Unauthenticated access is only permitted from loopback addresses (localhost). Please enable bearer authentication for remote access.',
            code: -32000,
          },
          403,
        );
      }

      await next();
      return;
    }

    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const header = c.req.header('authorization');
    const bearerPrefix = /^Bearer\s+/i;
    const token = header?.match(bearerPrefix) ? header.replace(bearerPrefix, '') : undefined;

    if (!token) {
      c.header('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      return c.json(
        {
          error: 'Authentication required',
          message: 'Authentication must be provided via the Authorization: Bearer <token> header.',
          code: -32000,
        },
        401,
      );
    }

    if (!expectedToken) {
      return c.json(
        {
          error: 'Server configuration error',
          message: 'Authentication system not properly configured',
          code: -32004,
        },
        500,
      );
    }

    if (!timingSafeStringEqual(token, expectedToken)) {
      c.header('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Invalid bearer token',
          code: -32000,
        },
        401,
      );
    }

    await next();
  };
}
