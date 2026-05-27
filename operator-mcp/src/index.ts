#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { createOperatorConfig } from "./core/config.js";
import {
  validateOperatorBearerStartupConfig,
  validateOperatorHttpBindStartupConfig,
} from "./core/startup-guard.js";
import { createOperatorHttpRuntime } from "./runtime/http.js";
import { createOperatorMcpServer } from "./runtime/server.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(moduleDir, "../package.json"), "utf8"),
);
const { version } = packageJson as { version: string };

dotenv.config({ path: join(moduleDir, "../.env"), quiet: true } as Parameters<
  typeof dotenv.config
>[0]);

const {
  values: {
    sse: useHttpTransport,
    "enable-bearer": enableBearer,
    "enable-apply": enableApply,
    "enable-git-write": enableGitWrite,
    "enable-git-push": enableGitPush,
    "enable-deploy": enableDeploy,
    port,
    host,
  },
} = parseArgs({
  options: {
    sse: { type: "boolean", default: false },
    "enable-bearer": { type: "boolean", default: false },
    "enable-apply": { type: "boolean", default: false },
    "enable-git-write": { type: "boolean", default: false },
    "enable-git-push": { type: "boolean", default: false },
    "enable-deploy": { type: "boolean", default: false },
    port: { type: "string" },
    host: { type: "string" },
  },
  allowPositionals: true,
});

function resolvePort(): number {
  if (port) {
    return Number.parseInt(port, 10);
  }
  if (process.env.PORT) {
    return Number.parseInt(process.env.PORT, 10);
  }
  return 3001;
}

const resolvedPort = resolvePort();

function validateStartup(): void {
  validateOperatorBearerStartupConfig(
    enableBearer,
    process.env.OPERATOR_BEARER_TOKEN,
  );
  validateOperatorHttpBindStartupConfig(enableBearer, host);
}

let activeServer: ReturnType<typeof createOperatorMcpServer> | undefined;
let activeHttpServer: ServerType | undefined;
let activeHttpRuntime: ReturnType<typeof createOperatorHttpRuntime> | undefined;

async function gracefulShutdown(signal: string): Promise<void> {
  console.error(`${signal} received, shutting down operator MCP server`);

  try {
    if (activeServer) {
      await activeServer.close();
    }
    if (activeHttpRuntime) {
      await activeHttpRuntime.close();
    }
    await new Promise<void>((resolve, reject) => {
      if (!activeHttpServer) {
        resolve();
        return;
      }

      activeHttpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateStartup();

  const config = createOperatorConfig({
    enableApply,
    enableGitWrite,
    enableGitPush,
    enableDeploy,
    approvalSecret: process.env.OPERATOR_APPROVAL_SECRET,
  });

  console.error(`Operator MCP repo root: ${config.repoRoot}`);
  console.error(`Apply pending enabled: ${config.enableApply ? "yes" : "no"}`);
  console.error(`Git write enabled: ${config.enableGitWrite ? "yes" : "no"}`);
  console.error(`Git push enabled: ${config.enableGitPush ? "yes" : "no"}`);
  console.error(`Deploy enabled: ${config.enableDeploy ? "yes" : "no"}`);
  if (config.allowedBranchPrefix) {
    console.error(`Allowed branch prefix: ${config.allowedBranchPrefix}`);
  }

  if (useHttpTransport) {
    const bindHost = host || (enableBearer ? "0.0.0.0" : "127.0.0.1");
    activeHttpRuntime = createOperatorHttpRuntime({
      version,
      config,
      enableBearer,
      bearerToken: process.env.OPERATOR_BEARER_TOKEN,
    });

    activeHttpServer = serve(
      {
        fetch: activeHttpRuntime.app.fetch,
        port: resolvedPort,
        hostname: bindHost,
      },
      (info) => {
        console.error(
          `[HTTP] Operator MCP listening on http://${info.address}:${info.port}/mcp`,
        );
      },
    );
    return;
  }

  activeServer = createOperatorMcpServer({ version, config });
  const transport = new StdioServerTransport();
  await activeServer.connect(transport);
  console.error("Operator MCP server (stdio) started");
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

main().catch((error) => {
  console.error("Operator MCP server error:", error);
  process.exit(1);
});
