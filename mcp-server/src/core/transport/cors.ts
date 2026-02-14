import type { NextFunction, Request, Response } from 'express';

/**
 * CORS Middleware
 *
 * Implements a strict CORS policy:
 * - Allows requests from localhost and 127.0.0.1 (any port)
 * - Allows requests from origins listed in MCP_ALLOWED_ORIGINS env var
 * - Allows requests with no Origin header (CLI tools, server-to-server)
 * - Blocks requests from other origins by not setting Access-Control-Allow-Origin
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { origin } = req.headers;
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always allow requests with no origin (e.g. curl, server-to-server, native apps)
  if (!origin) {
    next();
    return;
  }

  let isAllowed = false;

  try {
    const originUrl = new URL(origin);
    const { hostname } = originUrl;

    // Allow localhost and 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      isAllowed = true;
    }
    // Allow origins specified in environment variable
    else if (allowedOrigins.includes(origin)) {
      isAllowed = true;
    }
  } catch {
    // Invalid origin URL, treat as not allowed
    isAllowed = false;
  }

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-MCP-Connection-ID',
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');
    res.setHeader('Vary', 'Origin');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      res.status(200).end();
    } else {
      // For disallowed origins, we don't set CORS headers.
      // Returning 204 or 403 stops the browser from proceeding.
      res.status(403).end();
    }
    return;
  }

  // Reject requests from unauthorized origins
  if (!isAllowed) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  next();
};
