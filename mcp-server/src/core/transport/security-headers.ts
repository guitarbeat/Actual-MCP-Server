import type { NextFunction, Request, Response } from 'express';

/**
 * Security Headers Middleware
 *
 * Adds standard security headers to all responses to protect against common web vulnerabilities.
 *
 * Headers added:
 * - Content-Security-Policy: Restricts sources for scripts, styles, and other resources
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - Strict-Transport-Security: Enforces HTTPS
 * - Referrer-Policy: Controls referrer information
 * - X-Permitted-Cross-Domain-Policies: Restricts Flash/PDF access
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Content Security Policy
  // Allow scripts from self
  // Allow styles from self and unsafe-inline (required for dashboard)
  // Allow images from self and data: (required for favicon and potential user content)
  // Block object/embed (Flash/Java)
  // Block base URI changes
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
  );

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enforce HTTPS (1 year)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict Flash/PDF access
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
};
