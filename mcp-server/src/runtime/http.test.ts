import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpRuntime } from './http.js';

const { mockGetConnectionState, mockGetReadinessStatus, mockGetConnectionStatus } = vi.hoisted(
  () => ({
    mockGetConnectionState: vi.fn(),
    mockGetReadinessStatus: vi.fn(),
    mockGetConnectionStatus: vi.fn(),
  }),
);

vi.mock('../core/api/actual-client.js', () => ({
  getConnectionState: mockGetConnectionState,
  getReadinessStatus: mockGetReadinessStatus,
  getConnectionStatus: mockGetConnectionStatus,
  DEFAULT_DATA_DIR: '/mock/data',
}));

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  MCP_ALLOWED_ORIGINS: process.env.MCP_ALLOWED_ORIGINS,
  MCP_SESSION_TTL_MINUTES: process.env.MCP_SESSION_TTL_MINUTES,
};

const SAMPLE_READINESS_DIAGNOSTICS = {
  serverUrl: 'actual.example.com' as string | null,
  budgetSyncId: true,
  hasPassword: true,
  hasSessionToken: false,
  hasEncryptionPassword: false,
  autoSyncMinutes: '5' as string | null,
  readFreshnessMode: 'cached' as const,
  retrying: false,
};

beforeEach(() => {
  mockGetConnectionState.mockReset();
  mockGetReadinessStatus.mockReset();
  mockGetConnectionStatus.mockReset();
  mockGetConnectionState.mockReturnValue({ status: 'ready' });
  mockGetConnectionStatus.mockReturnValue({
    status: 'ready',
    budgetId: 'test-budget',
    lastReadyAt: '2026-04-11T00:00:00.000Z',
    lastErrorAt: null,
    lastError: null,
    reconnectAttempts: 0,
    lastSyncAt: '2026-04-11T00:00:00.000Z',
    initialized: true,
  });
  mockGetReadinessStatus.mockResolvedValue({
    ready: true,
    status: 'ready',
    reason: 'ready',
    lastReadyAt: '2026-04-11T00:00:00.000Z',
    lastSyncAt: '2026-04-11T00:00:00.000Z',
    lastError: null,
    debugError: 'sensitive-debug-error',
    activeBudgetId: 'budget-123',
    diagnostics: SAMPLE_READINESS_DIAGNOSTICS,
  });
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  process.env.MCP_ALLOWED_ORIGINS = ORIGINAL_ENV.MCP_ALLOWED_ORIGINS;
  process.env.MCP_SESSION_TTL_MINUTES = ORIGINAL_ENV.MCP_SESSION_TTL_MINUTES;
  delete process.env.MCP_READINESS_TRANSITION_LOGS;
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

  it('rejects requests with missing origin', async () => {
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
          'Mcp-Session-Id': 'missing',
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Origin not allowed' });
  });

  it('does not expose internal readiness diagnostics from /ready', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/ready', { headers: { Origin: 'https://good.example' } }),
    );

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

  it('logs readiness transitions when MCP_READINESS_TRANSITION_LOGS is enabled', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
    process.env.MCP_READINESS_TRANSITION_LOGS = 'true';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let readinessInvocation = 0;
    mockGetReadinessStatus.mockImplementation(async () => {
      readinessInvocation++;
      if (readinessInvocation === 1) {
        return {
          ready: false,
          status: 'error',
          reason: 'offline',
          lastReadyAt: null,
          lastSyncAt: null,
          lastError: 'offline',
          debugError: 'offline',
          activeBudgetId: null,
          diagnostics: SAMPLE_READINESS_DIAGNOSTICS,
        };
      }

      return {
        ready: true,
        status: 'ready',
        reason: 'ready',
        lastReadyAt: '2026-04-11T00:00:00.000Z',
        lastSyncAt: '2026-04-11T00:00:00.000Z',
        lastError: null,
        debugError: null,
        activeBudgetId: 'budget-123',
        diagnostics: SAMPLE_READINESS_DIAGNOSTICS,
      };
    });

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    expect(
      (
        await app.fetch(
          new Request('http://localhost/ready', { headers: { Origin: 'https://good.example' } }),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await app.fetch(
          new Request('http://localhost/ready', { headers: { Origin: 'https://good.example' } }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.fetch(
          new Request('http://localhost/ready', { headers: { Origin: 'https://good.example' } }),
        )
      ).status,
    ).toBe(200);

    const readinessMessages = errorSpy.mock.calls
      .map((arguments_) => arguments_[0])
      .filter((line): line is string => typeof line === 'string' && line.includes('[READINESS]'));

    expect(readinessMessages).toHaveLength(2);
    expect(readinessMessages[0]).toMatch(/\[READINESS\].*http_status=503/);
    expect(readinessMessages[1]).toMatch(/\[READINESS\].*http_status=200/);

    errorSpy.mockRestore();
  });

  it('accepts lowercase bearer auth schemes', async () => {
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
        method: 'GET',
        headers: {
          Authorization: 'bearer 12345678901234567890123456789012',
          Origin: 'https://good.example',
        },
      }),
    );

    expect(response.status).toBe(400);
  });
});

describe('GET /diagnostics', () => {
  beforeEach(() => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
  });
  it('should return diagnostics data without exposing secrets', async () => {
    process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
    process.env.ACTUAL_SYNC_ID = 'test-sync-id';
    process.env.ACTUAL_PASSWORD = 'test-password';

    const { app } = createHttpRuntime({
      version: '1.2.3',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/diagnostics', { headers: { Origin: 'https://good.example' } }),
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toMatchObject({
      connection: {
        status: 'ready',
        budgetId: 'test-budget',
        initialized: true,
      },
      config: {
        serverUrl: 'http://localhost:5006',
        hasBudgetId: true,
        hasPassword: true,
        dataDir: expect.any(String),
      },
    });
    expect(data.server).toMatchObject({
      uptime: expect.any(Number),
      nodeVersion: expect.any(String),
      memoryUsageMB: expect.any(Number),
    });

    // Ensure sensitive data is not exposed
    expect(data.config.serverUrl).toBe('http://localhost:5006');
    expect(data.config).not.toHaveProperty('ACTUAL_PASSWORD');
    expect(data.config).not.toHaveProperty('ACTUAL_SYNC_ID');
  });

  it('should return 500 when diagnostics are unavailable', async () => {
    mockGetConnectionStatus.mockImplementation(() => {
      throw new Error('Test error');
    });

    const { app } = createHttpRuntime({
      version: '1.2.3',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/diagnostics', { headers: { Origin: 'https://good.example' } }),
    );
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data).toEqual({ error: 'diagnostics unavailable' });
  });
});
