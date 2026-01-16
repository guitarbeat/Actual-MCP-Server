import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { corsMiddleware } from './cors.js';
import type { Request, Response, NextFunction } from 'express';

describe('corsMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {},
    };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    next = vi.fn();
    // Save original env
    vi.stubEnv('MCP_ALLOWED_ORIGINS', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should allow requests without origin header', () => {
    corsMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('should allow requests from localhost', () => {
    req.headers = { origin: 'http://localhost:3000' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(next).toHaveBeenCalled();
  });

  it('should allow requests from 127.0.0.1', () => {
    req.headers = { origin: 'http://127.0.0.1:8080' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    expect(next).toHaveBeenCalled();
  });

  it('should allow requests from inspector', () => {
    req.headers = { origin: 'https://inspector.modelcontextprotocol.io' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://inspector.modelcontextprotocol.io');
    expect(next).toHaveBeenCalled();
  });

  it('should allow requests from env allowed origins', () => {
    vi.stubEnv('MCP_ALLOWED_ORIGINS', 'https://example.com,https://myapp.com');
    req.headers = { origin: 'https://myapp.com' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://myapp.com');
    expect(next).toHaveBeenCalled();
  });

  it('should not set CORS headers for disallowed origin', () => {
    req.headers = { origin: 'https://evil.com' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(next).toHaveBeenCalled(); // It proceeds, but browser blocks it because header is missing
  });

  it('should handle OPTIONS request for allowed origin', () => {
    req.method = 'OPTIONS';
    req.headers = { origin: 'http://localhost:3000' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle OPTIONS request for disallowed origin', () => {
    req.method = 'OPTIONS';
    req.headers = { origin: 'https://evil.com' };
    corsMiddleware(req as Request, res as Response, next);
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
