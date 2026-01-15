import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { corsMiddleware, isOriginAllowed } from './cors.js';
import type { Request, Response, NextFunction } from 'express';

describe('CORS Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
      // Mock other methods if needed
      removeHeader: vi.fn(),
    };
    next = vi.fn();
    process.env.MCP_ALLOWED_ORIGINS = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MCP_ALLOWED_ORIGINS;
  });

  it('should allow localhost origins', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('http://localhost:8080')).toBe(true);
    expect(isOriginAllowed('http://localhost')).toBe(true);
  });

  it('should allow 127.0.0.1 origins', () => {
    expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1')).toBe(true);
  });

  it('should allow official inspector', () => {
    expect(isOriginAllowed('https://inspector.modelcontextprotocol.io')).toBe(true);
  });

  it('should block disallowed origins', () => {
    expect(isOriginAllowed('http://evil.com')).toBe(false);
    expect(isOriginAllowed('https://google.com')).toBe(false);
  });

  it('should allow origins from env var', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://myapp.com,http://test.local';
    expect(isOriginAllowed('https://myapp.com')).toBe(true);
    expect(isOriginAllowed('http://test.local')).toBe(true);
    expect(isOriginAllowed('https://other.com')).toBe(false);
  });

  it('should set CORS headers for allowed origin', () => {
    mockReq.headers = { origin: 'http://localhost:3000' };
    corsMiddleware(mockReq as Request, mockRes as Response, next);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(next).toHaveBeenCalled();
  });

  it('should NOT set CORS headers for disallowed origin', () => {
    mockReq.headers = { origin: 'http://evil.com' };
    corsMiddleware(mockReq as Request, mockRes as Response, next);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('should handle OPTIONS request', () => {
    mockReq.method = 'OPTIONS';
    mockReq.headers = { origin: 'http://localhost:3000' };

    corsMiddleware(mockReq as Request, mockRes as Response, next);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
