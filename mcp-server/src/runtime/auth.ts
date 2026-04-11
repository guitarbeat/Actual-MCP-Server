import type { MiddlewareHandler } from 'hono';
import { timingSafeStringEqual } from '../core/auth/index.js';

export function createBearerMiddleware(options: {
  enableBearer: boolean;
  expectedToken?: string;
}): MiddlewareHandler {
  const { enableBearer, expectedToken } = options;

  return async (c, next) => {
    if (!enableBearer) {
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
