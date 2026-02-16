import type { NextFunction, Request, Response } from 'express';

/**
 * CORS Middleware
 *
 * Implements a strict CORS policy:
 * - If MCP_ALLOWED_ORIGINS is set, ONLY allows origins listed there.
 * - If MCP_ALLOWED_ORIGINS is NOT set:
 *   - In development (NODE_ENV != 'production'), allows localhost and 127.0.0.1.
 *   - In production, blocks all cross-origin requests (unless explicitly allowed).
 * - Always allows requests with no Origin header (CLI tools, server-to-server).
 * - Blocks requests from unauthorized origins by returning 403.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { origin } = req.headers;
  const allowedOriginsEnv = process.env.MCP_ALLOWED_ORIGINS;
  const isProduction = process.env.NODE_ENV === 'production';

  // Always allow requests with no origin (e.g. curl, server-to-server, native apps)
  if (!origin) {
    next();
    return;
  }

  let isAllowed = false;
  const allowedOrigins = (allowedOriginsEnv || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOriginsEnv) {
    // strict mode: only allow explicitly listed origins
    if (allowedOrigins.includes(origin)) {
      isAllowed = true;
    }
  } else if (!isProduction) {
    // development mode: allow localhost convenience if no explicit config
    try {
      const originUrl = new URL(origin);
      const { hostname } = originUrl;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        isAllowed = true;
      }
    } catch {
      // Invalid origin URL, treat as not allowed
      isAllowed = false;
    }
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
      // Returning 403 stops the browser from proceeding.
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
