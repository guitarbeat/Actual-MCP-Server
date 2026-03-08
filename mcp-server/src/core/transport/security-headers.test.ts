import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { securityHeaders } from './security-headers.js';

describe('securityHeaders', () => {
  it('should set custom Content-Security-Policy and nonce', () => {
    const req = {} as Request;
    const res = {
      setHeader: vi.fn(),
      locals: {},
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    securityHeaders(req, res, next);

    // Verify nonce generation and CSP
    expect(res.locals.nonce).toBeDefined();
    expect(typeof res.locals.nonce).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      `default-src 'self'; img-src 'self' data:; style-src 'self' 'nonce-${res.locals.nonce}'; script-src 'self' 'nonce-${res.locals.nonce}'; frame-ancestors 'none';`,
    );

    expect(next).toHaveBeenCalled();
  });
});
