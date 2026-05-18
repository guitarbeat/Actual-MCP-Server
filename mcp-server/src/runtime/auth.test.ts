import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createBearerMiddleware } from './auth.js';

vi.mock('@hono/node-server/conninfo', () => ({
  getConnInfo: vi.fn(),
}));

describe('createBearerMiddleware', () => {
  describe('when enableBearer is false', () => {
    it('allows loopback requests', async () => {
      vi.mocked(getConnInfo).mockReturnValue({
        remote: { address: '127.0.0.1', port: 12345, addressType: 'IPv4' },
      });

      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: false }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    });

    it('rejects non-loopback requests', async () => {
      vi.mocked(getConnInfo).mockReturnValue({
        remote: { address: '192.168.1.100', port: 12345, addressType: 'IPv4' },
      });

      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: false }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Authentication disabled but remote access attempted');
    });
  });

  describe('when enableBearer is true', () => {
    it('rejects requests without token', async () => {
      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: true, expectedToken: 'secret123' }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test');
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication required');
    });

    it('rejects requests with invalid token', async () => {
      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: true, expectedToken: 'secret123' }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer wrongtoken' },
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Authentication failed');
    });

    it('allows requests with valid token from any IP', async () => {
      vi.mocked(getConnInfo).mockReturnValue({
        remote: { address: '192.168.1.100', port: 12345, addressType: 'IPv4' },
      });

      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: true, expectedToken: 'secret123' }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer secret123' },
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    });

    it('returns 500 if expectedToken is not configured', async () => {
      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: true }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer sometoken' },
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Server configuration error');
    });

    it('allows OPTIONS requests without token', async () => {
      const app = new Hono();
      app.use('*', createBearerMiddleware({ enableBearer: true, expectedToken: 'secret123' }));
      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', { method: 'OPTIONS' });
      expect(res.status).toBe(404); // the route is GET, so OPTIONS returns 404 from hono router, but middleware passed
    });
  });
});
