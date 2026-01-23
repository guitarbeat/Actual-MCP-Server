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
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  it('allows request with no origin (CLI)', () => {
    delete req.headers!.origin;
    corsMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('allows request from localhost', () => {
    req.headers!.origin = 'http://localhost:3000';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(next).toHaveBeenCalled();
  });

  it('allows request from 127.0.0.1', () => {
    req.headers!.origin = 'http://127.0.0.1:8080';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    expect(next).toHaveBeenCalled();
  });

  it('blocks request from unknown origin', () => {
    req.headers!.origin = 'http://malicious.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(next).toHaveBeenCalled(); // Passes through, but without CORS headers, browser blocks it
  });

  it('allows request from allowed origin in env', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://myapp.com, https://partner.com';
    req.headers!.origin = 'https://partner.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://partner.com');
  });

  it('handles OPTIONS request correctly', () => {
    req.method = 'OPTIONS';
    req.headers!.origin = 'http://localhost:3000';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('handles OPTIONS request for blocked origin', () => {
    req.method = 'OPTIONS';
    req.headers!.origin = 'http://malicious.com';
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });
});
