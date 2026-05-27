import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { createOperatorBearerMiddleware } from "./auth.js";
import { createOperatorMcpServer } from "./server.js";

interface SessionConnection {
  server: ReturnType<typeof createOperatorMcpServer>;
  transport: WebStandardStreamableHTTPServerTransport;
  lastSeenAt: number;
}

export function createOperatorHttpRuntime(options: {
  version: string;
  config: OperatorRuntimeConfig;
  enableBearer: boolean;
  bearerToken?: string;
}): { app: Hono; close: () => Promise<void> } {
  const app = new Hono();
  const sessions = new Map<string, SessionConnection>();
  const requireBearer = createOperatorBearerMiddleware({
    enableBearer: options.enableBearer,
    expectedToken: options.bearerToken,
  });

  app.use("/mcp", requireBearer);

  app.get("/", (c) =>
    c.json({
      name: "actual-mcp-operator",
      version: options.version,
      transport: "streamable-http",
    }),
  );

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  );

  app.all("/mcp", async (c) => {
    const sessionId = c.req.header("mcp-session-id");

    if (c.req.method === "POST") {
      const parsedBody = await c.req.json().catch(() => undefined);

      if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
          return c.json(
            {
              jsonrpc: "2.0",
              error: { code: -32001, message: "Session not found" },
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
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Missing session ID or initialize request",
            },
            id: null,
          },
          400,
        );
      }

      const server = createOperatorMcpServer({
        version: options.version,
        config: options.config,
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

      await server.connect(transport);
      return transport.handleRequest(c.req.raw, { parsedBody });
    }

    if (!sessionId) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Missing session ID" },
          id: null,
        },
        400,
      );
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
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
      await Promise.all(
        [...sessions.values()].map(async ({ server }) => server.close()),
      );
      sessions.clear();
    },
  };
}
