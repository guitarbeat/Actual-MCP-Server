import type { NextFunction, Request, Response } from 'express';

/**
 * Validates if an origin is allowed.
 *
 * Allowed origins:
 * - localhost (any port)
 * - 127.0.0.1 (any port)
 * - https://inspector.modelcontextprotocol.io
 * - Any origin in MCP_ALLOWED_ORIGINS environment variable
 */
export const isOriginAllowed = (origin: string): boolean => {
  // Allow localhost/127.0.0.1 on any port
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;

  // Allow official MCP inspector
  if (origin === 'https://inspector.modelcontextprotocol.io') return true;

  // Check env var
  const envOrigins = process.env.MCP_ALLOWED_ORIGINS
    ? process.env.MCP_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  return envOrigins.includes(origin);
};

/**
 * CORS Middleware
 * Replaces permissive '*' policy with strict origin validation.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  // Always set Vary: Origin to ensure caching respects origin
  res.setHeader('Vary', 'Origin');

  // If no origin (e.g. server-to-server, curl), we generally allow it
  // (CORS is a browser enforcement).
  // However, we don't set Access-Control headers in that case.
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};
