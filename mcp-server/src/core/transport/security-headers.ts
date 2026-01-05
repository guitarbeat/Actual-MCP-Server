import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to set standard security headers
 *
 * Implements defense-in-depth by setting:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 1; mode=block (enable XSS filter in older browsers)
 * - Referrer-Policy: no-referrer (privacy)
 * - Content-Security-Policy: default-src 'none' (strict default)
 *
 * Also removes X-Powered-By to reduce information leakage.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Strict CSP by default - override in specific routes if needed (e.g., dashboard)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  next();
};
