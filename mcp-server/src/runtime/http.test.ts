import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpRuntime } from './http.js';

const {
  mockGetConnectionState,
  mockGetReadinessStatus,
  mockGetConnectionStatus,
  mockInitActualApi,
} = vi.hoisted(() => ({
  mockGetConnectionState: vi.fn(),
  mockGetReadinessStatus: vi.fn(),
  mockGetConnectionStatus: vi.fn(),
  mockInitActualApi: vi.fn(),
}));

vi.mock('../core/api/actual-client.js', () => ({
  getConnectionState: mockGetConnectionState,
  getReadinessStatus: mockGetReadinessStatus,
  getConnectionState: mockGetConnectionStatus,
  getConnectionStatus: mockGetConnectionStatus,
  initActualApi: mockInitActualApi,
  isConnectionError: vi.fn().mockReturnValue(true),
  DEFAULT_DATA_DIR: '/mock/data',
}));

vi.mock('../core/utils/retry.js', () => ({
  withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
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
  mockInitActualApi.mockReset();
  mockInitActualApi.mockResolvedValue(undefined);
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

  it('allows health checks without an Origin when no allowlist is configured', async () => {
    delete process.env.MCP_ALLOWED_ORIGINS;

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: '12345678901234567890123456789012',
    });

    const response = await app.fetch(new Request('http://localhost/health'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('allows health and ready probes without an Origin even when MCP_ALLOWED_ORIGINS is configured', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    // /health probe without Origin must not be rejected by the CORS gate
    const healthResponse = await app.fetch(new Request('http://localhost/health'));
    expect(healthResponse.status).toBe(200);

    // /ready probe without Origin must not be rejected by the CORS gate
    const readyResponse = await app.fetch(new Request('http://localhost/ready'));
    expect([200, 503]).toContain(readyResponse.status);
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
    mockGetConnectionState.mockImplementation(() => {
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

describe('Wildcard CORS', () => {
  it('allows origin matching http://localhost:* pattern', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'http://localhost:*';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'http://localhost:3001' },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3001');
  });

  it('allows origin matching https://*.example.com pattern', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://*.example.com';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'https://app.example.com' },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
  });

  it('rejects origin that does not match wildcard pattern on non-probe routes', async () => {
    process.env.MCP_ALLOWED_ORIGINS = 'http://localhost:*';

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/diagnostics', {
        headers: { Origin: 'https://evil.example.com' },
      }),
    );

    expect(response.status).toBe(403);
  });
});

describe('GET /metrics', () => {
  beforeEach(() => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
  });

  const METRICS_TOKEN = '12345678901234567890123456789012';

  it('returns metrics JSON when valid bearer token provided', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: METRICS_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/metrics', {
        headers: {
          Origin: 'https://good.example',
          Authorization: `Bearer ${METRICS_TOKEN}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      uptime_seconds: expect.any(Number),
      budget_connected: expect.any(Boolean),
      reconnect_count: expect.any(Number),
      active_sessions: expect.any(Number),
      tool_calls: expect.any(Object),
    });
  });

  it('returns 401 when bearer is enabled and no token provided', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: METRICS_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/metrics', {
        headers: { Origin: 'https://good.example' },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('returns 401 when bearer is enabled and wrong token provided', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: METRICS_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/metrics', {
        headers: {
          Origin: 'https://good.example',
          Authorization: 'Bearer wrong-token',
        },
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe('POST /reconnect', () => {
  const BEARER_TOKEN = '12345678901234567890123456789012';

  beforeEach(() => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
  });

  it('calls initActualApi(true) and returns 200 with reconnected:true when successful', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: BEARER_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/reconnect', {
        method: 'POST',
        headers: {
          Origin: 'https://good.example',
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockInitActualApi).toHaveBeenCalledWith(true);
    expect(mockGetReadinessStatus).toHaveBeenCalledWith(true);
    const data = await response.json();
    expect(data).toMatchObject({
      reconnected: true,
      ready: true,
      status: 'ready',
    });
  });

  it('returns 503 with reconnected:false when initActualApi throws', async () => {
    mockInitActualApi.mockRejectedValue(new Error('Connection refused'));

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: BEARER_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/reconnect', {
        method: 'POST',
        headers: {
          Origin: 'https://good.example',
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
      }),
    );

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toMatchObject({
      reconnected: false,
      error: 'Connection refused',
    });
  });

  it('requires bearer auth when bearer is enabled', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: BEARER_TOKEN,
    });

    const response = await app.fetch(
      new Request('http://localhost/reconnect', {
        method: 'POST',
        headers: { Origin: 'https://good.example' },
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe('Rate limiter', () => {
  const BEARER_TOKEN = '12345678901234567890123456789012';

  beforeEach(() => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://good.example';
    // Use a low limit so the test does not have to make 60 real requests
    process.env.MCP_RATE_LIMIT_RPM = '3';
  });

  afterEach(() => {
    delete process.env.MCP_RATE_LIMIT_RPM;
  });

  it('returns 429 with Retry-After header after exceeding the request limit', async () => {
    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: true,
      bearerToken: BEARER_TOKEN,
    });

    const makeRequest = () =>
      app.fetch(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: {
            Origin: 'https://good.example',
            Authorization: `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
        }),
      );

    // MCP_RATE_LIMIT_RPM=3 means the 4th request should be rejected
    const responses = await Promise.all([
      makeRequest(),
      makeRequest(),
      makeRequest(),
      makeRequest(),
    ]);

    const statuses = responses.map((r) => r.status);
    const rejectedIndex = statuses.indexOf(429);
    expect(rejectedIndex).toBeGreaterThanOrEqual(0);

    const rejected = responses[rejectedIndex];
    expect(rejected.headers.get('retry-after')).toBeTruthy();
    const body = await rejected.json();
    expect(body).toMatchObject({ error: 'Too Many Requests' });
  });
});
