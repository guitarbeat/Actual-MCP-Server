import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { securityHeaders } from './security-headers.js';

describe('securityHeaders middleware', () => {
  it('should set security headers', () => {
    const req = {} as Request;
    const res = {
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(res.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none');
    expect(next).toHaveBeenCalled();
  });
});
