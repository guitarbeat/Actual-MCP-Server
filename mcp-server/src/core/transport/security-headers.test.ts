import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { securityHeaders } from './security-headers.js';

describe('securityHeaders', () => {
  it('should set security headers', () => {
    const req = {} as Request;
    const res = {
      setHeader: vi.fn(),
      removeHeader: vi.fn(),
      locals: {},
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');

    // Verify nonce generation and CSP
    expect(res.locals.nonce).toBeDefined();
    expect(typeof res.locals.nonce).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      `default-src 'self'; img-src 'self' data:; style-src 'self' 'nonce-${res.locals.nonce}'; script-src 'self' 'nonce-${res.locals.nonce}'; frame-ancestors 'none';`
    );

    expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(next).toHaveBeenCalled();
  });
});
