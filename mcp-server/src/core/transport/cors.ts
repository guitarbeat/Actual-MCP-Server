import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to handle Cross-Origin Resource Sharing (CORS) strictly.
 *
 * Security Policy:
 * - Allow requests with no Origin header (CLI tools, server-to-server)
 * - Allow requests from localhost/127.0.0.1 (local development, local tools)
 * - Allow requests from origins explicitly permitted via MCP_ALLOWED_ORIGINS
 * - Deny all other origins (browser protections)
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  // Allow requests with no origin (like curl, CLI tools, server-to-server)
  if (!origin) {
    next();
    return;
  }

  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS?.split(',') || []).map((o) => o.trim()).filter(Boolean);

  let isAllowed = false;

  // Check explicit allowlist first
  if (allowedOrigins.includes(origin)) {
    isAllowed = true;
  } else {
    // Check for localhost/127.0.0.1 with any port
    try {
      const url = new URL(origin);
      if (['localhost', '127.0.0.1'].includes(url.hostname)) {
        isAllowed = true;
      }
    } catch {
      // Invalid URL in origin header, treat as not allowed
      isAllowed = false;
    }
  }

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};
