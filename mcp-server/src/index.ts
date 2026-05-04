#!/usr/bin/env node
import './polyfill.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import {
  getConnectionState,
  getAccounts,
  initActualApi,
  shutdownActualApi,
  startBackgroundRetry,
} from './core/api/actual-client.js';
import { redactValue } from './core/logging/index.js';
import {
  validateActualAuthStartupConfig,
  shouldWarnAboutAutoSyncForRemote,
  validateBearerStartupConfig,
  validateHttpBindStartupConfig,
} from './core/auth/startup-guard.js';
import { createHttpRuntime } from './runtime/http.js';
import { createActualMcpServer } from './runtime/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const { version } = packageJson as { version: string };

dotenv.config({ path: '.env', quiet: true } as Parameters<typeof dotenv.config>[0]);

const {
  values: {
    sse: useHttpTransport,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    'enable-advanced': enableAdvanced,
    port,
    'test-resources': testResourcesOption,
    'test-custom': testCustomOption,
    host,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    'enable-advanced': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
    host: { type: 'string' },
  },
  allowPositionals: true,
});

const resolvedPort = port
  ? Number.parseInt(port, 10)
  : process.env.PORT
    ? Number.parseInt(process.env.PORT, 10)
    : 3000;

function validateEnv(): void {
  console.error('--- Configuration ---');
  let serverHostname = '(not set)';
  if (process.env.ACTUAL_SERVER_URL) {
    try {
      serverHostname = new URL(process.env.ACTUAL_SERVER_URL).hostname;
    } catch {
      serverHostname = '(invalid URL)';
    }
  }
  console.error(`  ACTUAL_SERVER_URL: ${serverHostname}`);
  console.error(
    `  ACTUAL_PASSWORD: ${redactValue('ACTUAL_PASSWORD', process.env.ACTUAL_PASSWORD) || '(not set)'}`,
  );
  console.error(
    `  ACTUAL_SESSION_TOKEN: ${redactValue('ACTUAL_SESSION_TOKEN', process.env.ACTUAL_SESSION_TOKEN) || '(not set)'}`,
  );
  console.error(
    `  ACTUAL_BUDGET_SYNC_ID: ${process.env.ACTUAL_BUDGET_SYNC_ID ? '(set)' : '(auto-detect)'}`,
  );
  console.error(
    `  ACTUAL_BUDGET_ENCRYPTION_PASSWORD: ${redactValue('ACTUAL_BUDGET_ENCRYPTION_PASSWORD', process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD) || '(not set)'}`,
  );
  console.error(`  ACTUAL_DATA_DIR: ${process.env.ACTUAL_DATA_DIR || '(default)'}`);
  console.error(
    `  AUTO_SYNC_INTERVAL_MINUTES: ${process.env.AUTO_SYNC_INTERVAL_MINUTES || '(disabled)'}`,
  );
  console.error(
    `  BEARER_TOKEN: ${redactValue('BEARER_TOKEN', process.env.BEARER_TOKEN) || '(not set)'}`,
  );
  console.error('---');
}

function validateRuntimeGuards(): void {
  validateActualAuthStartupConfig();
  validateBearerStartupConfig(enableBearer, process.env.BEARER_TOKEN);
  validateHttpBindStartupConfig(enableBearer, host);

  if (
    useHttpTransport &&
    shouldWarnAboutAutoSyncForRemote(process.env.AUTO_SYNC_INTERVAL_MINUTES)
  ) {
    console.error(
      'Warning: AUTO_SYNC_INTERVAL_MINUTES should be set to a non-zero value for remote deployments to keep cached data fresh.',
    );
  }
}

async function initializeApi(): Promise<void> {
  try {
    await initActualApi();
    console.error('Actual Budget API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Actual Budget API:', error);
    console.error(
      'Server is running but Actual Budget connection failed. Background retry has been started.',
    );
    startBackgroundRetry();
  }
}

async function runResourceTest(): Promise<never> {
  console.error('Testing resources...');
  try {
    await initActualApi();
    const accounts = await getAccounts();
    console.error(`Found ${accounts.length} account(s).`);
    accounts.forEach((account: { id: string; name: string }) => {
      console.error(`- ${account.id}: ${account.name}`);
    });
    await shutdownActualApi();
    process.exit(0);
  } catch (error) {
    console.error('Resource test failed:', error);
    process.exit(1);
  }
}

async function runCustomTest(): Promise<never> {
  console.error('Initializing custom test...');
  try {
    await initActualApi();
    console.error('Custom test passed.');
    await shutdownActualApi();
    process.exit(0);
  } catch (error) {
    console.error('Custom test failed:', error);
    process.exit(1);
  }
}

let activeServer: ReturnType<typeof createActualMcpServer> | undefined;
let activeHttpServer: ServerType | undefined;
let activeHttpRuntime: ReturnType<typeof createHttpRuntime> | undefined;

async function gracefulShutdown(signal: string): Promise<void> {
  console.error(`${signal} received, shutting down server`);

  const forceExitTimeout = setTimeout(() => {
    console.error('Shutdown timeout exceeded (5s), forcing exit');
    process.exit(1);
  }, 5000);

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
    await shutdownActualApi();
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  if (testResourcesOption) {
    await runResourceTest();
  }

  if (testCustomOption) {
    await runCustomTest();
  }

  validateEnv();
  validateRuntimeGuards();

  if (useHttpTransport) {
    const bindHost = host || (enableBearer ? '0.0.0.0' : '127.0.0.1');
    activeHttpRuntime = createHttpRuntime({
      version,
      enableWrite,
      enableAdvanced,
      enableBearer,
      bearerToken: process.env.BEARER_TOKEN,
    });

    activeHttpServer = serve(
      {
        fetch: activeHttpRuntime.app.fetch,
        port: resolvedPort,
        hostname: bindHost,
      },
      (info) => {
        console.error(
          `[HTTP] MCP server listening on http://${info.address}:${info.port}/mcp (state: ${getConnectionState().status})`,
        );
      },
    );

    await initializeApi();
    return;
  }

  activeServer = createActualMcpServer({
    version,
    enableWrite,
    enableAdvanced,
  });
  const transport = new StdioServerTransport();
  await activeServer.connect(transport);
  await initializeApi();
  console.error('Actual Budget MCP Server (stdio) started');
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
