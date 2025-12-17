import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createBearerAuthMiddleware } from './middleware.js';

describe('Bearer Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    process.env.BEARER_TOKEN = 'secret-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BEARER_TOKEN;
  });

  it('should call next() if bearer auth is disabled', () => {
    const middleware = createBearerAuthMiddleware(false);
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if Authorization header is missing', () => {
    const middleware = createBearerAuthMiddleware(true);
    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Authentication required',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header does not start with Bearer', () => {
    const middleware = createBearerAuthMiddleware(true);
    req.headers = { authorization: 'Basic user:pass' };
    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authorization header must start with 'Bearer '",
      })
    );
  });

  it('should return 500 if BEARER_TOKEN env var is not set', () => {
    delete process.env.BEARER_TOKEN;
    const middleware = createBearerAuthMiddleware(true);
    req.headers = { authorization: 'Bearer some-token' };
    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Server configuration error',
      })
    );
  });

  it('should return 401 if token does not match', () => {
    const middleware = createBearerAuthMiddleware(true);
    req.headers = { authorization: 'Bearer wrong-token' };
    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid bearer token',
      })
    );
  });

  it('should call next() if token matches', () => {
    const middleware = createBearerAuthMiddleware(true);
    req.headers = { authorization: 'Bearer secret-token' };
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
