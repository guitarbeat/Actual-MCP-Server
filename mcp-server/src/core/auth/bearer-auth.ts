import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

interface BearerAuthOptions {
  enableBearer: boolean;
  expectedToken?: string;
}

export const createBearerAuth = (options: BearerAuthOptions) => {
  const { enableBearer, expectedToken } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enableBearer) {
      next();
      return;
    }

    // * Allow authentication via Authorization header or query parameters
    // * Query parameters are useful for browser-based clients (EventSource) that don't support custom headers
    const authHeader = req.headers.authorization;
    const queryToken = req.query.authToken || req.query.apiKey || req.query.token;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof queryToken === 'string') {
      token = queryToken;
    }

    if (!token) {
      console.error('[AUTH] ❌ Missing authentication (no header or query param)');
      res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      res.status(401).json({
        error: 'Authentication required',
        message: 'Authorization header (Bearer token) or authToken/apiKey query parameter required',
        code: -32000,
      });
      return;
    }

    if (!expectedToken) {
      console.error('[AUTH] ❌ BEARER_TOKEN environment variable not set');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication system not properly configured',
        code: -32004,
      });
      return;
    }

    // Secure comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedToken);

    // timingSafeEqual requires buffers of same length
    if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      console.error('[AUTH] ❌ Invalid token (token mismatch)');
      res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid bearer token',
        code: -32000,
      });
      return;
    }

    next();
  };
};
