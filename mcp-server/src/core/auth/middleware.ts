import type { NextFunction, Request, Response } from 'express';
import { timingSafeStringEqual } from './crypto.js';

/**
 * Middleware to enforce Bearer token authentication.
 *
 * @param enableBearer Whether bearer authentication is enabled
 * @returns Express middleware
 */
export const createBearerAuthMiddleware = (enableBearer: boolean) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enableBearer) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error('[AUTH] ❌ Missing Authorization header');
      res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      res.status(401).json({
        error: 'Authentication required',
        message: 'Authorization header required',
        code: -32000,
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('[AUTH] ❌ Invalid Authorization header format');
      res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
      res.status(401).json({
        error: 'Authentication failed',
        message: "Authorization header must start with 'Bearer '",
        code: -32000,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const expectedToken = process.env.BEARER_TOKEN;

    if (!expectedToken) {
      console.error('[AUTH] ❌ BEARER_TOKEN environment variable not set');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication system not properly configured',
        code: -32004,
      });
      return;
    }

    // Secure comparison using constant-time algorithm
    if (!timingSafeStringEqual(token, expectedToken)) {
      console.error('[AUTH] ❌ Invalid bearer token');
      // Do NOT log token lengths or values to prevent information leakage
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
