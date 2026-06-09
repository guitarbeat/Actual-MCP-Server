import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { ActualReadinessStatus } from '../core/api/actual-client/types.js';
import {
  getConnectionState,
  getReadinessStatus,
  initActualApi,
  isConnectionError,
  DEFAULT_DATA_DIR,
} from '../core/api/actual-client.js';
import { withRetry } from '../core/utils/retry.js';
import { createBearerMiddleware } from './auth.js';
import { mcpInvocationStore, truncateCorrelationId } from './mcp-invocation-context.js';
import { createActualMcpServer } from './server.js';
import { getLogger } from '../core/logging/logger.js';

const logger = getLogger('http');

// ---------------------------------------------------------------------------
// Metrics store
// ---------------------------------------------------------------------------

interface ToolCallStats {
  count: number;
  totalDurationMs: number;
  errorCount: number;
}

const metricsStore = {
  startedAt: Date.now(),
  reconnectCount: 0,
  toolCalls: new Map<string, ToolCallStats>(),
};

export function recordToolCall(toolName: string, durationMs: number, isError: boolean): void {
  const existing = metricsStore.toolCalls.get(toolName);
  if (existing) {
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    if (isError) {
      existing.errorCount += 1;
    }
  } else {
    metricsStore.toolCalls.set(toolName, {
      count: 1,
      totalDurationMs: durationMs,
      errorCount: isError ? 1 : 0,
    });
  }
}

// ---------------------------------------------------------------------------
// Rate limiter -- sliding window, configurable req/min per token
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(
  key: string,
  maxRequests: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    rateLimitStore.set(key, timestamps);
    return { allowed: false, retryAfterSec };
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

interface SessionConnection {
  server: ReturnType<typeof createActualMcpServer>;
  transport: WebStandardStreamableHTTPServerTransport;
  lastSeenAt: number;
}

export interface HttpRuntime {
  app: Hono;
  close: () => Promise<void>;
}

type PublicReadinessStatus = Pick<
  ActualReadinessStatus,
  'ready' | 'status' | 'reason' | 'lastReadyAt' | 'lastSyncAt' | 'lastError'
>;

export function createHttpRuntime(options: {
  version: string;
  enableWrite: boolean;
  enableAdvanced: boolean;
  enableBearer: boolean;
  bearerToken?: string;
}): HttpRuntime {
  const app = new Hono();
  const sessions = new Map<string, SessionConnection>();
  const requireBearer = createBearerMiddleware({
    enableBearer: options.enableBearer,
    expectedToken: options.bearerToken,
  });
  const sessionTtlMs = parseSessionTtl(process.env.MCP_SESSION_TTL_MINUTES);
  const allowedOrigins = parseAllowedOrigins(process.env.MCP_ALLOWED_ORIGINS);
  const rateLimitMaxRequests = parseInt(process.env.MCP_RATE_LIMIT_RPM ?? '60', 10);

  let lastReadinessSignature: string | null = null;

  const pruneStaleSessions = (): void => {
    if (!sessionTtlMs) {
      return;
    }

    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastSeenAt <= sessionTtlMs) {
        continue;
      }

      sessions.delete(sessionId);
      void session.server.close();
    }

    // Prune rate limit store entries whose timestamp windows have expired
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const active = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, active);
      }
    }
  };

  // Start periodic session cleanup timer (every 60s)
  const cleanupInterval = setInterval(pruneStaleSessions, 60_000);
  // Prevent the interval from blocking process exit
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  const runWithinMcpInvocationContext = async <Response>(
    mcpSessionHeader: string | undefined,
    operation: () => Promise<Response>,
  ): Promise<Response> => {
    const requestId = randomUUID();

    return mcpInvocationStore.run({ requestId, mcpSessionId: mcpSessionHeader }, operation);
  };

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    const { path } = c.req;

    // /health and /ready are infrastructure probes that must not be gated by
    // CORS origin checks. Load balancers and monitoring agents omit Origin.
    const isBypassRoute = path === '/health' || path === '/ready';
    const originAllowed = isBypassRoute ? true : isOriginAllowed(origin, allowedOrigins);

    if (!originAllowed) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }

    if (origin && originAllowed) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
      c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      c.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID',
      );
      c.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    }

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  });

  app.use('/mcp', requireBearer);

  // Rate limiter for /mcp (configurable req/min per token or 'anonymous')
  app.use('/mcp', async (c, next) => {
    const authHeader = c.req.header('authorization') ?? '';
    const tokenMatch = /bearer\s+(\S+)/i.exec(authHeader);
    const key = tokenMatch ? tokenMatch[1] : 'anonymous';
    const { allowed, retryAfterSec } = checkRateLimit(key, rateLimitMaxRequests);
    if (!allowed) {
      c.header('Retry-After', String(retryAfterSec));
      return c.json({ error: 'Too Many Requests' }, 429);
    }
    await next();
  });

  app.get('/', (c) =>
    c.json({
      name: 'Actual Budget MCP',
      version: options.version,
      transport: 'streamable-http',
      ready: getConnectionState().status === 'ready',
    }),
  );

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  );

  app.get('/diagnostics', (c) => {
    try {
      const connectionInfo = getConnectionState();
      return c.json({
        connection: connectionInfo,
        server: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsageMB: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
        },
        config: {
          serverUrl: process.env.ACTUAL_SERVER_URL || null,
          hasBudgetId: !!process.env.ACTUAL_SYNC_ID,
          hasPassword: !!process.env.ACTUAL_PASSWORD,
          dataDir: process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Diagnostics endpoint failed');
      return c.json({ error: 'diagnostics unavailable' }, 500);
    }
  });

  app.get('/metrics', requireBearer, (c) => {
    const toolCallsObj: Record<
      string,
      { count: number; totalDurationMs: number; errorCount: number }
    > = {};
    for (const [name, stats] of metricsStore.toolCalls.entries()) {
      toolCallsObj[name] = { ...stats };
    }

    return c.json({
      uptime_seconds: Math.floor((Date.now() - metricsStore.startedAt) / 1000),
      budget_connected: getConnectionState().status === 'ready',
      reconnect_count: metricsStore.reconnectCount,
      active_sessions: sessions.size,
      tool_calls: toolCallsObj,
    });
  });

  app.get('/ready', async (c) => {
    const corr = truncateCorrelationId(randomUUID());
    const readiness = await getReadinessStatus(true);
    const publicBody = toPublicReadinessStatus(readiness);

    if (process.env.MCP_READINESS_TRANSITION_LOGS === 'true') {
      const signature = `${publicBody.ready}|${publicBody.status}|${publicBody.reason ?? ''}`;
      if (lastReadinessSignature !== signature) {
        const previous = lastReadinessSignature;
        lastReadinessSignature = signature;
        const httpStatus = readiness.ready ? 200 : 503;
        console.error(
          `[mcp corr=${corr}] [READINESS] transition ${previous ?? 'none'} -> ${signature} http_status=${httpStatus}`,
        );
      }
    }

    return c.json(publicBody, readiness.ready ? 200 : 503);
  });

  app.post('/reconnect', requireBearer, async (c) => {
    try {
      await withRetry(() => initActualApi(true), {
        maxAttempts: 3,
        baseDelayMs: 1000,
        shouldRetry: (error) =>
          isConnectionError(
            error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase(),
          ),
      });
      metricsStore.reconnectCount += 1;
      const readiness = await getReadinessStatus(true);
      const publicBody = toPublicReadinessStatus(readiness);
      return c.json({ reconnected: true, ...publicBody }, readiness.ready ? 200 : 503);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reconnect failed';
      return c.json({ reconnected: false, error: message }, 503);
    }
  });

  app.all('/mcp', async (c) => {
    pruneStaleSessions();

    const sessionId = c.req.header('mcp-session-id');

    if (c.req.method === 'POST') {
      const parsedBody = await c.req.json().catch(() => undefined);

      if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
          return c.json(
            {
              jsonrpc: '2.0',
              error: { code: -32001, message: 'Session not found' },
              id: null,
            },
            404,
          );
        }

        existing.lastSeenAt = Date.now();
        return runWithinMcpInvocationContext(sessionId, () =>
          existing.transport.handleRequest(c.req.raw, { parsedBody }),
        );
      }

      if (!isInitializeRequest(parsedBody)) {
        return c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Missing session ID or initialize request' },
            id: null,
          },
          400,
        );
      }

      const server = createActualMcpServer({
        version: options.version,
        enableWrite: options.enableWrite,
        enableAdvanced: options.enableAdvanced,
      });

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          sessions.set(initializedSessionId, {
            server,
            transport,
            lastSeenAt: Date.now(),
          });
        },
        onsessionclosed: async (closedSessionId) => {
          const existing = sessions.get(closedSessionId);
          sessions.delete(closedSessionId);
          if (existing) {
            await existing.server.close();
          }
        },
      });

      transport.onclose = () => {
        const activeSessionId = transport.sessionId;
        if (!activeSessionId) {
          return;
        }

        const existing = sessions.get(activeSessionId);
        sessions.delete(activeSessionId);
        if (existing) {
          void existing.server.close();
        }
      };

      pruneStaleSessions();

      await server.connect(transport);
      return runWithinMcpInvocationContext(undefined, () =>
        transport.handleRequest(c.req.raw, { parsedBody }),
      );
    }

    if (!sessionId) {
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Missing session ID' },
          id: null,
        },
        400,
      );
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: null,
        },
        404,
      );
    }

    existing.lastSeenAt = Date.now();
    return runWithinMcpInvocationContext(sessionId, () =>
      existing.transport.handleRequest(c.req.raw),
    );
  });

  return {
    app,
    async close() {
      clearInterval(cleanupInterval);
      pruneStaleSessions();
      await Promise.all(
        [...sessions.values()].map(async ({ server }) => {
          await server.close();
        }),
      );
      sessions.clear();
    },
  };
}

export function createHttpApp(options: {
  version: string;
  enableWrite: boolean;
  enableAdvanced: boolean;
  enableBearer: boolean;
  bearerToken?: string;
}): Hono {
  return createHttpRuntime(options).app;
}

function toPublicReadinessStatus(readiness: ActualReadinessStatus): PublicReadinessStatus {
  return {
    ready: readiness.ready,
    status: readiness.status,
    reason: readiness.reason,
    lastReadyAt: readiness.lastReadyAt,
    lastSyncAt: readiness.lastSyncAt,
    lastError: readiness.lastError,
  };
}

function parseAllowedOrigins(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseSessionTtl(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed * 60 * 1000;
}

function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  // Server-to-server probes (health, smoke tests, curl) omit Origin.
  if (!origin) {
    return allowedOrigins.length === 0;
  }

  if (allowedOrigins.length === 0) {
    return false;
  }

  for (const allowed of allowedOrigins) {
    if (allowed === origin) {
      return true;
    }

    // Support wildcard patterns like 'http://localhost:*' or 'https://*.example.com'
    if (allowed.includes('*')) {
      const regexStr: string = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*');
      const regex: RegExp = new RegExp(`^${regexStr}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}
