import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpRuntime } from './http.js';

const { mockGetConnectionState, mockGetReadinessStatus, mockGetReadinessSnapshot } = vi.hoisted(
  () => ({
    mockGetConnectionState: vi.fn(),
    mockGetReadinessStatus: vi.fn(),
    mockGetReadinessSnapshot: vi.fn(),
  }),
);

vi.mock('../core/api/actual-client.js', () => ({
  getConnectionState: mockGetConnectionState,
  getReadinessStatus: mockGetReadinessStatus,
  getReadinessSnapshot: mockGetReadinessSnapshot,
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
  mockGetReadinessSnapshot.mockReset();
  mockGetConnectionState.mockReturnValue({ status: 'ready' });
  mockGetReadinessSnapshot.mockReturnValue({
    ready: true,
    status: 'ready',
    reason: 'ready',
    lastReadyAt: '2026-04-11T00:00:00.000Z',
    lastSyncAt: '2026-04-11T00:00:00.000Z',
    lastError: null,
    debugError: 'sensitive-debug-error',
    activeBudgetId: 'budget-123',
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

  it('exposes connection snapshot fields on GET / without forcing a health probe', async () => {
    mockGetConnectionState.mockReturnValue({
      status: 'error',
      lastReadyAt: null,
      lastSyncAt: null,
      lastError: 'connection_failed',
      debugError: null,
      activeBudgetId: null,
    });
    mockGetReadinessSnapshot.mockReturnValue({
      ready: false,
      status: 'error',
      reason: 'connection_failed',
      lastReadyAt: null,
      lastSyncAt: null,
      lastError: 'connection_failed',
      debugError: null,
      activeBudgetId: null,
    });

    const { app } = createHttpRuntime({
      version: 'test',
      enableWrite: false,
      enableAdvanced: false,
      enableBearer: false,
    });

    const response = await app.fetch(new Request('http://localhost/'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: 'Actual Budget MCP',
      transport: 'streamable-http',
      ready: false,
      connectionStatus: 'error',
      reason: 'connection_failed',
      lastError: 'connection_failed',
    });
    expect(mockGetReadinessSnapshot).toHaveBeenCalled();
    expect(mockGetReadinessStatus).not.toHaveBeenCalled();
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

  it('logs readiness transitions when MCP_READINESS_TRANSITION_LOGS is enabled', async () => {
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

    expect((await app.fetch(new Request('http://localhost/ready'))).status).toBe(503);
    expect((await app.fetch(new Request('http://localhost/ready'))).status).toBe(200);
    expect((await app.fetch(new Request('http://localhost/ready'))).status).toBe(200);

    const readinessMessages = errorSpy.mock.calls
      .map((arguments_) => arguments_[0])
      .filter((line): line is string => typeof line === 'string' && line.includes('[READINESS]'));

    expect(readinessMessages).toHaveLength(2);
    expect(readinessMessages[0]).toMatch(/\[READINESS\].*http_status=503/);
    expect(readinessMessages[1]).toMatch(/\[READINESS\].*http_status=200/);

    errorSpy.mockRestore();
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
