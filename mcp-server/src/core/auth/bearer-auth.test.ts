import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBearerAuth } from './bearer-auth.js';

describe('createBearerAuth', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
    };
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();
    res = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    } as unknown as Response;
    next = vi.fn();
  });

  it('should call next() if bearer auth is disabled', () => {
    const auth = createBearerAuth({ enableBearer: false });
    auth(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if no token provided', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: 'secret' });
    auth(req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authentication required' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 if expected token is missing in config', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: undefined });
    req.headers = { authorization: 'Bearer token' };
    auth(req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Server configuration error' }));
  });

  it('should return 401 if token length mismatch', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: 'secret' });
    req.headers = { authorization: 'Bearer longertoken' };
    auth(req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authentication failed' }));
  });

  it('should return 401 if token content mismatch (same length)', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: 'secret' });
    req.headers = { authorization: 'Bearer secres' }; // same length
    auth(req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authentication failed' }));
  });

  it('should call next() if token matches', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: 'secret' });
    req.headers = { authorization: 'Bearer secret' };
    auth(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is provided via query parameter (not supported)', () => {
    const auth = createBearerAuth({ enableBearer: true, expectedToken: 'secret' });
    req.query = { authToken: 'secret' };
    auth(req as Request, res as Response, next);
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Authentication required' }));
    expect(next).not.toHaveBeenCalled();
  });
});
