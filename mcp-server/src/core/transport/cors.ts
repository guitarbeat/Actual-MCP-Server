import type { NextFunction, Request, Response } from 'express';

/**
 * CORS Middleware
 *
 * Restricts cross-origin requests to trusted domains.
 * - Allows requests from localhost (any port) and 127.0.0.1 (any port)
 * - Allows requests from the official MCP Inspector
 * - Allows requests from origins specified in MCP_ALLOWED_ORIGINS env var
 * - Allows non-browser requests (missing Origin header)
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  // If no origin, it's likely a server-to-server or CLI request, which is allowed by default
  // CORS is a browser security feature.
  if (!origin) {
    next();
    return;
  }

  const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS
    ? process.env.MCP_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const isLocalhost =
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://127.0.0.1:');

  const isInspector = origin === 'https://inspector.modelcontextprotocol.io';

  const isAllowed = isLocalhost || isInspector || allowedOrigins.includes(origin) || origin === 'null'; // Some local file contexts

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      res.status(200).end();
    } else {
      // If origin is not allowed, strictly speaking we should probably return 403 or just 200 without headers.
      // Returning 204/200 without CORS headers causes the browser to reject the preflight.
      res.status(204).end();
    }
    return;
  }

  next();
};
