import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBearerAuth } from './bearer-auth.js';
import type { Request, Response, NextFunction } from 'express';

describe('Bearer Authentication Middleware', () => {
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
      setHeader: setHeaderMock,
    };
    next = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should call next() if authentication is disabled', () => {
    const auth = createBearerAuth({ enableBearer: false, bearerToken: 'secret' });
    auth(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is missing', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: 'secret' });
    auth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Authentication required',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 if server configuration is missing token', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: undefined });
    req.headers!.authorization = 'Bearer user-token';

    auth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Server configuration error',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 on incorrect token', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: 'secret' });
    req.headers!.authorization = 'Bearer wrong-token';

    auth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Authentication failed',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() on correct token via header', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: 'secret' });
    req.headers!.authorization = 'Bearer secret';

    auth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should call next() on correct token via query param (authToken)', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: 'secret' });
    req.query!.authToken = 'secret';

    auth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should fail securely with token of different length (timing safe check)', () => {
    const auth = createBearerAuth({ enableBearer: true, bearerToken: 'secret' });
    req.headers!.authorization = 'Bearer secr'; // shorter

    auth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
  });
});
