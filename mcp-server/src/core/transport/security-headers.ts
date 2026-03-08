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
  // Note: helmet handles standard security headers (like X-Frame-Options, X-Content-Type-Options,
  // Strict-Transport-Security, X-Powered-By, etc.) globally in index.ts. We only set custom CSP here.

  // Generate a nonce for inline scripts
  const nonce = randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  // Content Security Policy
  // - default-src 'self': Only allow resources from the same origin by default
  // - img-src 'self' data:: Allow images from self and data URIs (for favicons/assets)
  // - style-src 'self' 'nonce-${nonce}': Allow inline styles only with the correct nonce
  // - script-src 'self': Only allow scripts from self and those with the correct nonce
  // - frame-ancestors 'none': Prevent embedding in iframes (Clickjacking protection)
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; img-src 'self' data:; style-src 'self' 'nonce-${nonce}'; script-src 'self' 'nonce-${nonce}'; frame-ancestors 'none';`,
  );

  next();
};
