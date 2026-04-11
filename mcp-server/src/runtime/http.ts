import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { ActualReadinessStatus } from '../core/api/actual-client/types.js';
import { getConnectionState, getReadinessStatus } from '../core/api/actual-client.js';
import { createBearerMiddleware } from './auth.js';
import { createActualMcpServer } from './server.js';

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
  const isProduction = process.env.NODE_ENV === 'production';

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
  };

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    const originAllowed = isOriginAllowed(origin, allowedOrigins, isProduction);

    if (origin && !originAllowed) {
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

  app.get('/ready', async (c) => {
    const readiness = await getReadinessStatus(true);
    return c.json(toPublicReadinessStatus(readiness), readiness.ready ? 200 : 503);
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
        return existing.transport.handleRequest(c.req.raw, { parsedBody });
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
      return transport.handleRequest(c.req.raw, { parsedBody });
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
    return existing.transport.handleRequest(c.req.raw);
  });

  return {
    app,
    async close() {
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

function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  isProduction: boolean,
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  if (isProduction) {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
