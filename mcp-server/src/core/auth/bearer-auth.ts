import type { NextFunction, Request, Response } from 'express';
import { timingSafeStringEqual } from './index.js';

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

    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      console.error('[AUTH] ❌ Missing or invalid Authorization header');
      res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      res.status(401).json({
        error: 'Authentication required',
        message: 'Authorization header with Bearer token is required',
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
    if (!timingSafeStringEqual(token, expectedToken)) {
      // The console error message is intentionally generic to avoid leaking information.
      console.error('[AUTH] ❌ Invalid token provided');
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
