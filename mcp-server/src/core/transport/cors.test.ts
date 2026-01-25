import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
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
      removeHeader: vi.fn(),
    };
    next = vi.fn();
    process.env.MCP_ALLOWED_ORIGINS = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  it('allows requests with no Origin header', () => {
    delete req.headers!.origin;
    corsMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('allows localhost origin', () => {
    req.headers!.origin = 'http://localhost:3000';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(next).toHaveBeenCalled();
  });

  it('allows 127.0.0.1 origin', () => {
    req.headers!.origin = 'http://127.0.0.1:8080';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    expect(next).toHaveBeenCalled();
  });

  it('allows origin from env var', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://myapp.com, https://other.com';
    req.headers!.origin = 'https://myapp.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://myapp.com');
  });

  it('does not allow origin not in env var', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://myapp.com';
    req.headers!.origin = 'https://evil.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    expect(next).toHaveBeenCalled();
  });

  it('handles OPTIONS preflight for allowed origin', () => {
    req.method = 'OPTIONS';
    req.headers!.origin = 'http://localhost:3000';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight for disallowed origin', () => {
    req.method = 'OPTIONS';
    req.headers!.origin = 'http://evil.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('handles invalid origin URL gracefully', () => {
    req.headers!.origin = 'invalid-url';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    expect(next).toHaveBeenCalled();
  });
});
