import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { corsMiddleware } from './cors.js';

describe('corsMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
    };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    next = vi.fn();
    process.env.MCP_ALLOWED_ORIGINS = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow requests with no origin', () => {
    delete req.headers!.origin;

    corsMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('should allow localhost origin', () => {
    req.headers!.origin = 'http://localhost:3000';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(next).toHaveBeenCalled();
  });

  it('should allow 127.0.0.1 origin', () => {
    req.headers!.origin = 'http://127.0.0.1:8080';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    expect(next).toHaveBeenCalled();
  });

  it('should block disallowed origins', () => {
    req.headers!.origin = 'http://evil.com';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('should allow origins from MCP_ALLOWED_ORIGINS', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://trusted.com, https://another.com';
    req.headers!.origin = 'https://trusted.com';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://trusted.com');
    expect(next).toHaveBeenCalled();
  });

  it('should handle preflight OPTIONS requests', () => {
    req.method = 'OPTIONS';
    req.headers!.origin = 'http://localhost:3000';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle invalid URLs in origin', () => {
    req.headers!.origin = 'not-a-valid-url';

    corsMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(next).toHaveBeenCalled();
  });
});
