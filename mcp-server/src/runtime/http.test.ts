import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpRuntime } from './http.js';

const { mockGetConnectionState, mockGetReadinessStatus } = vi.hoisted(() => ({
  mockGetConnectionState: vi.fn(),
  mockGetReadinessStatus: vi.fn(),
}));

vi.mock('../core/api/actual-client.js', () => ({
  getConnectionState: mockGetConnectionState,
  getReadinessStatus: mockGetReadinessStatus,
}));

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  MCP_ALLOWED_ORIGINS: process.env.MCP_ALLOWED_ORIGINS,
  MCP_SESSION_TTL_MINUTES: process.env.MCP_SESSION_TTL_MINUTES,
};

beforeEach(() => {
  mockGetConnectionState.mockReset();
  mockGetReadinessStatus.mockReset();
  mockGetConnectionState.mockReturnValue({ status: 'ready' });
  mockGetReadinessStatus.mockResolvedValue({
    ready: true,
    status: 'ready',
    reason: 'ready',
    lastReadyAt: '2026-04-11T00:00:00.000Z',
    lastSyncAt: '2026-04-11T00:00:00.000Z',
    lastError: null,
    debugError: 'sensitive-debug-error',
    activeBudgetId: 'budget-123',
    diagnostics: {
      serverUrl: 'actual.example.com',
      budgetSyncId: true,
      hasPassword: true,
      hasSessionToken: false,
      hasEncryptionPassword: false,
      autoSyncMinutes: '5',
      readFreshnessMode: 'cached',
      retrying: false,
    },
  });
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  process.env.MCP_ALLOWED_ORIGINS = ORIGINAL_ENV.MCP_ALLOWED_ORIGINS;
  process.env.MCP_SESSION_TTL_MINUTES = ORIGINAL_ENV.MCP_SESSION_TTL_MINUTES;
});

describe('createHttpRuntime', () => {
  it('allows explicitly configured browser origins', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: '12345678901234567890123456789012',
    });

    const response = await app.fetch(
      new Request('http://localhost/mcp', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://good.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://good.example');
  });

  it('rejects disallowed browser origins in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/mcp', {
        method: 'GET',
        headers: {
          Origin: 'https://evil.example',
          'Mcp-Session-Id': 'missing',
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Origin not allowed' });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('still allows localhost origins during development without explicit config', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MCP_ALLOWED_ORIGINS;

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/health', {
        headers: {
          Origin: 'http://localhost:5173',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('does not expose internal readiness diagnostics from /ready', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(new Request('http://localhost/ready'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ready: true,
      status: 'ready',
      reason: 'ready',
      lastReadyAt: '2026-04-11T00:00:00.000Z',
      lastSyncAt: '2026-04-11T00:00:00.000Z',
      lastError: null,
    });
    expect(mockGetReadinessStatus).toHaveBeenCalledWith(true);
  });

  it('accepts lowercase bearer auth schemes', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: '12345678901234567890123456789012',
    });

    const response = await app.fetch(
      new Request('http://localhost/mcp', {
        method: 'GET',
        headers: {
          Authorization: 'bearer 12345678901234567890123456789012',
        },
      }),
    );

    expect(response.status).toBe(400);
  });
});
