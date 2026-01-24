import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to set security headers for the MCP server.
 *
 * Enforces:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Referrer-Policy
 * - Removal of X-Powered-By
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enforce HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Content Security Policy
  // - default-src 'self': Only allow resources from the same origin by default
  // - img-src 'self' data:: Allow images from self and data URIs (for favicons/assets)
  // - style-src 'self' 'unsafe-inline': Allow inline styles (required for dashboard)
  // - script-src 'self': Only allow scripts from self (dashboard has no scripts currently)
  // - frame-ancestors 'none': Prevent embedding in iframes (Clickjacking protection)
  const nonce = randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${nonce}'; frame-ancestors 'none';`
  );

  // Remove X-Powered-By header to hide server details
  res.removeHeader('X-Powered-By');

  next();
};
