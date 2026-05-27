import { getConnInfo } from "@hono/node-server/conninfo";
import type { MiddlewareHandler } from "hono";
import { timingSafeStringEqual } from "../core/auth.js";

export function createOperatorBearerMiddleware(options: {
  enableBearer: boolean;
  expectedToken?: string;
}): MiddlewareHandler {
  const { enableBearer, expectedToken } = options;

  return async (c, next) => {
    if (!enableBearer) {
      const connInfo = getConnInfo(c);
      const remoteAddress = connInfo.remote.address;
      const isLoopback =
        remoteAddress === "127.0.0.1" ||
        remoteAddress === "::1" ||
        remoteAddress === "::ffff:127.0.0.1";

      if (!isLoopback) {
        return c.json(
          {
            error: "Authentication disabled but remote access attempted",
            message: "Enable --enable-bearer for non-loopback HTTP access.",
          },
          403,
        );
      }

      await next();
      return;
    }

    if (c.req.method === "OPTIONS") {
      await next();
      return;
    }

    const header = c.req.header("authorization");
    const bearerPrefix = /^Bearer\s+/i;
    const token = header?.match(bearerPrefix)
      ? header.replace(bearerPrefix, "")
      : undefined;

    if (
      !token ||
      !expectedToken ||
      !timingSafeStringEqual(token, expectedToken)
    ) {
      c.header("WWW-Authenticate", 'Bearer realm="actual-mcp-operator"');
      return c.json({ error: "Authentication required" }, 401);
    }

    await next();
  };
}
