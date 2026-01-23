import type { NextFunction, Request, Response } from 'express';

/**
 * CORS Middleware
 *
 * Implements strict CORS policy:
 * - Allows requests with no Origin (CLI tools)
 * - Allows requests from localhost/127.0.0.1 (local development)
 * - Allows requests from origins specified in MCP_ALLOWED_ORIGINS
 * - Blocks other origins by not setting CORS headers
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  // 1. Allow no origin (CLI tools, server-to-server)
  // We still pass through to next(), and we don't need to set CORS headers
  // because CORS is a browser-enforced restriction.
  if (!origin) {
    next();
    return;
  }

  // Check if origin is allowed
  const isAllowed = isOriginAllowed(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Return 200 OK. The browser will check the headers.
    // If isAllowed was false, headers are missing, and browser will reject.
    res.status(200).end();
    return;
  }

  next();
};

/**
 * Check if the origin is allowed
 */
function isOriginAllowed(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // 2. Allow localhost and 127.0.0.1 (local development)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // 3. Allow explicitly configured origins
    const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS
      ? process.env.MCP_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : [];

    if (allowedOrigins.includes(origin)) {
      return true;
    }

    return false;
  } catch (_e) {
    // Invalid URL in Origin header
    return false;
  }
}
