#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
/**
 * MCP Server for Actual Budget
 *
 * This server exposes your Actual Budget data to LLMs through the Model Context Protocol,
 * allowing for natural language interaction with your financial data.
 *
 * Features:
 * - List and view accounts
 * - View transactions with filtering
 * - Generate financial statistics and analysis
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import {
  getInitializationStats,
  initActualApi,
  isInitialized,
  isInitializing,
  shutdownActualApi,
} from './core/api/actual-client.js';
import { timingSafeStringEqual } from './core/auth/index.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { restoreConsoleMethods, setupSafeLogging } from './core/logging/safe-logger.js';
import { StreamableHTTPHandler } from './core/transport/streamable-http-handler.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const { version } = packageJson;

dotenv.config({ path: '.env' });

// Argument parsing (must happen before server creation)
const {
  values: {
    sse: useSse,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    'enable-nini': enableNini,
    port,
    'test-resources': testResources,
    'test-custom': testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    'enable-nini': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

// * Initialize the MCP server
// * Note: According to MCP SDK best practices, a single server instance can handle
// * multiple transport connections. Each transport gets its own session, but they
// * all connect to the same server instance.
const server = new Server(
  {
    name: 'Actual Budget',
    version: version,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      logging: {},
    },
  }
);

const resolvedPort = port ? parseInt(port, 10) : process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Bearer authentication middleware
const bearerAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!enableBearer) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    console.error('[AUTH] ❌ Missing authentication token (header or query param)');
    // Include WWW-Authenticate header as per HTTP spec
    res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
    res.status(401).json({
      error: 'Authentication required',
      message: 'Authorization header (Bearer) or ?token query parameter required',
      code: -32000, // MCP authentication error code
    });
    return;
  }

  const expectedToken = process.env.BEARER_TOKEN;

  if (!expectedToken) {
    console.error('[AUTH] ❌ BEARER_TOKEN environment variable not set');
    res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication system not properly configured',
      code: -32004, // Internal error
    });
    return;
  }

  if (!timingSafeStringEqual(token, expectedToken)) {
    console.error('[AUTH] ❌ Invalid bearer token (token mismatch)');
    // Don't log token lengths in production as it could leak information
    // console.error(`[AUTH] Received token length: ${token.length}, Expected token length: ${expectedToken.length}`);
    res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid bearer token',
      code: -32000,
    });
    return;
  }

  next();
};

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Global variable to track if stdio transport is already connected
let stdioTransportConnected = false;

// * Store SSE transports by session ID for proper session isolation
// * Each SSE connection gets its own transport instance
const sseTransports: Map<string, SSEServerTransport> = new Map();

/**
 * Handle SSE connection setup
 */
function handleSseConnection(req: Request, res: Response): void {
  const clientIp = req.ip || req.socket.remoteAddress;
  const sessionId = `sse-${randomUUID()}`;

  console.error(`[SSE] Connection attempt from ${clientIp} (session: ${sessionId})`);

  // * Create a new SSE transport for this connection
  const transport = new SSEServerTransport('/messages', res);

  // * Get the actual session ID from the transport
  const actualSessionId = (transport as { sessionId?: string }).sessionId || sessionId;

  // * Store transport
  sseTransports.set(actualSessionId, transport);

  // * Cleanup handler
  transport.onclose = () => {
    console.error(`[SSE] Transport closed for session ${actualSessionId}, cleaning up`);
    sseTransports.delete(actualSessionId);
  };

  server
    .connect(transport)
    .then(() => {
      console.error(`[SSE] ✅ Transport connected successfully (session: ${actualSessionId})`);
    })
    .catch((error) => {
      console.error('[SSE] ❌ Error connecting SSE transport:', error);
      sseTransports.delete(actualSessionId);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      }
    });

  // Clean up transport when connection closes
  res.on('close', () => {
    console.error(`[SSE] Connection closed (session: ${actualSessionId})`);
    if (sseTransports.has(actualSessionId)) {
      try {
        const t = sseTransports.get(actualSessionId);
        if (t) {
          t.close();
        }
      } catch (_e) {
        // Ignore cleanup errors
      }
      sseTransports.delete(actualSessionId);
    }
  });
}

/**
 * Handle incoming messages for SSE transport
 */
async function handleSseMessages(req: Request, res: Response): Promise<void> {
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    const transportsArray = Array.from(sseTransports.entries());
    if (transportsArray.length === 1) {
      const [, transport] = transportsArray[0];
      await transport.handlePostMessage(req, res, req.body);
      return;
    }
    if (transportsArray.length === 0) {
      res.status(503).json({
        error: 'Transport not initialized',
        message: 'No active SSE connections. Connect to /sse first.',
      });
      return;
    }
    res.status(400).json({
      error: 'Session ID required',
      message: 'Multiple active sessions detected. Please include sessionId parameter.',
    });
    return;
  }

  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({
      error: 'Session not found',
      message: `No active transport found for session: ${sessionId}`,
    });
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`[SSE] Error handling message for session ${sessionId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Map error objects to MCP error response
 */
function mapMcpError(error: unknown, sessionId: string, res: Response): void {
  if (res.headersSent) {
    return;
  }

  let errorCode = -32004; // Internal error
  let statusCode = 500;
  let errorMessage = 'Internal server error';

  if (error instanceof Error) {
    errorMessage = error.message;
    if (error.message.includes('session')) {
      errorCode = -32001;
      statusCode = 400;
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorCode = -32005;
      statusCode = 400;
    } else if (error.message.includes('method')) {
      errorCode = -32002;
      statusCode = 404;
    } else if (error.message.includes('parameter')) {
      errorCode = -32003;
      statusCode = 400;
    }
  }

  res.status(statusCode).json({
    error: 'MCP Error',
    message: errorMessage,
    code: errorCode,
    sessionId: sessionId !== 'unknown' ? sessionId : undefined,
  });
}

/**
 * Run resource connectivity test and exit
 */
async function runResourceTest(): Promise<void> {
  console.log('Testing resources...');
  try {
    await initActualApi();
    const accounts = await fetchAllAccounts();
    console.log(`Found ${accounts.length} account(s).`);
    accounts.forEach((account) => {
      console.log(`- ${account.id}: ${account.name}`);
    });
    console.log('Resource test passed.');
    await shutdownActualApi();
    process.exit(0);
  } catch (error) {
    console.error('Resource test failed:', error);
    process.exit(1);
  }
}

/**
 * Run custom development test and exit
 */
async function runCustomTest(): Promise<void> {
  console.log('Initializing custom test...');
  try {
    await initActualApi();

    // Custom test logic can be placed here during development

    console.log('Custom test passed.');
    await shutdownActualApi();
    process.exit(0);
  } catch (error) {
    console.error('Custom test failed:', error);
    process.exit(1);
  }
}

/**
 * Validate required environment variables and print warnings
 */
function validateEnv(): void {
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error('Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.');
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error('Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not.');
    console.error('If your server requires authentication, initialization will fail.');
  }
}

/**
 * Initialize Actual Budget API if not in test mode
 */
async function initializeApi(testResources: boolean, testCustom: boolean, useSse: boolean): Promise<void> {
  if (testResources || testCustom) return;

  // * CRITICAL: In stdio mode, setup safe logging BEFORE initialization
  if (!useSse && !stdioTransportConnected) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    setupSafeLogging(server);
    stdioTransportConnected = true;
  }

  try {
    await initActualApi();
    console.error('✓ Actual Budget API initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStr = errorMessage.toLowerCase();

    if (errorStr.includes('out of sync') || errorStr.includes('out-of-sync') || errorStr.includes('migration')) {
      console.error('ℹ️  Actual Budget server is currently out of sync or migrating. This is normal during a rebuild.');
      console.error('   The MCP server will continue to retry connection in the background.');
    } else {
      console.error('✗ Failed to initialize Actual Budget API:', error);
      console.error(
        'Server is running but Actual Budget connection failed. Will retry on next request.\n\nCommon causes:\n  - Incorrect ACTUAL_SERVER_URL or ACTUAL_PASSWORD\n  - Actual Budget server is not running or not accessible\n  - Network connectivity issues\n  - Invalid ACTUAL_BUDGET_SYNC_ID'
      );
    }
  }
}

// Start the server
async function main(): Promise<void> {
  if (testResources) {
    await runResourceTest();
  }

  if (testCustom) {
    await runCustomTest();
  }

  validateEnv();
  if (useSse) {
    // * Use SDK's createMcpExpressApp for DNS rebinding protection and modern setup
    // * Note: We bind to '0.0.0.0' for production deployments
    // * When bearer authentication is enabled, it provides security instead of host header validation
    const app = createMcpExpressApp({
      host: '0.0.0.0', // Allow binding to all interfaces for production
      // * When bearer authentication is enabled, allow localhost connections
      // * Bearer auth provides security instead of host header validation
      allowedHosts: undefined, // Allow all hosts (bearer auth provides security)
    });

    // * CORS middleware for cross-origin requests (Poke MCP runs in browser)
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
      res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    });
    // * Store SSE transports by session ID for proper session isolation
    // * Each SSE connection gets its own transport instance for proper session isolation already moved to top-level

    // * Favicon route - simple SVG favicon
    app.get('/favicon.ico', (_req: Request, res: Response) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#2563eb" rx="10"/>
        <text x="50" y="65" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">$</text>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(svg);
    });

    // * Dashboard renderer to keep route complexity low
    function renderDashboard(): string {
      const stats = getInitializationStats();
      const initialized = isInitialized();
      const initializing = isInitializing();

      const getStatusDetails = () => {
        if (initialized) return { color: '#10b981', text: 'Connected' };
        if (initializing) return { color: '#f59e0b', text: 'Initializing...' };
        return { color: '#ef4444', text: 'Disconnected' };
      };

      const { color: statusColor, text: statusText } = getStatusDetails();

      const renderStat = (label: string, value: string | number) => `
        <div class="item">
          <span class="label">${label}</span>
          <span class="val">${value}</span>
        </div>
      `;

      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Actual Budget MCP</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.ico">
            <style>
              :root {
                --bg: #ffffff;
                --text: #1a1a1a;
                --muted: #666666;
                --border: #eeeeee;
                --primary: #2563eb;
                --success: #10b981;
                --warning: #f59e0b;
                --error: #ef4444;
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --bg: #0f172a;
                  --text: #f1f5f9;
                  --muted: #94a3b8;
                  --border: #1e293b;
                }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: var(--bg);
                color: var(--text);
                line-height: 1.4;
              }
              .container { max-width: 600px; margin: 0 auto; }
              header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid var(--border);
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              h1 { margin: 0; font-size: 20px; }
              .version { font-size: 12px; color: var(--muted); }
              .status-line {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                margin-bottom: 20px;
              }
              .dot { width: 8px; height: 8px; border-radius: 50%; }
              .grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
              }
              .item {
                padding: 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
              }
              .label { font-size: 11px; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 4px; }
              .val { font-size: 14px; font-weight: 500; }
              .endpoints { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
              .ep-row {
                padding: 8px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid var(--border);
                font-size: 13px;
              }
              .ep-row:last-child { border-bottom: none; }
              .method { font-family: monospace; font-weight: bold; font-size: 11px; width: 35px; }
              .path { font-family: monospace; flex: 1; }
              .desc { color: var(--muted); font-size: 12px; }
              footer {
                margin-top: 30px;
                font-size: 12px;
                color: var(--muted);
                text-align: center;
              }
              footer a { color: var(--primary); text-decoration: none; margin: 0 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <header>
                <h1>Actual Budget MCP</h1>
                <span class="version">v${version}</span>
              </header>

              <div class="status-line">
                <div class="dot" style="background: ${statusColor}; border: 2px solid ${statusColor}44"></div>
                <span style="color: ${statusColor}">${statusText}</span>
              </div>

              <div class="grid">
                ${renderStat('Port', resolvedPort)}
                ${renderStat('Auth', enableBearer ? 'Enabled' : 'Disabled')}
                ${renderStat('Init Time', stats.initializationTime ? `${stats.initializationTime}ms` : '---')}
                ${renderStat('Sessions', streamableHandler.getActiveSessionCount())}
              </div>

              <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold; color: var(--muted);">ENDPOINTS</div>
              <div class="endpoints">
                <div class="ep-row">
                  <span class="method" style="color: var(--primary)">ALL</span>
                  <span class="path">/mcp</span>
                  <span class="desc">Streamable Connection</span>
                </div>
                <div class="ep-row">
                  <span class="method" style="color: var(--success)">GET</span>
                  <span class="path">/sse</span>
                  <span class="desc">Event Stream</span>
                </div>
                <div class="ep-row">
                  <span class="method" style="color: var(--warning)">GET</span>
                  <span class="path">/health</span>
                  <span class="desc">Health Check</span>
                </div>
              </div>

              <footer>
                <a href="https://github.com/guitarbeat/actual-mcp">GitHub</a>
                <a href="/health">Live JSON</a>
              </footer>
            </div>
          </body>
        </html>
      `;
    }

    // * Root route - Condensed & Universal Dashboard
    app.get('/', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(renderDashboard());
    });

    // * Health check route for deployment platforms
    app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/sse', bearerAuth, handleSseConnection);
    app.post('/messages', bearerAuth, handleSseMessages);

    // * Streamable HTTP transport endpoint - modern MCP transport
    // Create a single handler instance for all /mcp requests
    const streamableHandler = new StreamableHTTPHandler(server);

    // Handle all HTTP methods for /mcp endpoint (GET, POST, DELETE)
    app.all('/mcp', bearerAuth, async (req: Request, res: Response) => {
      const sessionId = (req.headers['mcp-session-id'] || req.headers['x-session-id'] || 'unknown') as string;
      try {
        await streamableHandler.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(`[MCP] Error handling request (session: ${sessionId}):`, error);
        mapMcpError(error, sessionId, res);
      }
    });

    app.listen(resolvedPort, '0.0.0.0', () => {
      console.error(`[SSE] 🚀 MCP Server listening on port ${resolvedPort}`);
    });

    // * Initialize API after server starts listening on port
    // * This prevents Render from timing out during initialization
    await initializeApi(!!testResources, !!testCustom, useSse);
  } else {
    await initializeApi(!!testResources, !!testCustom, useSse);
    // * Transport already connected and safe logging setup in main() above
    // * Just log that we're ready
    if (!stdioTransportConnected) {
      // This shouldn't happen, but handle it gracefully
      const transport = new StdioServerTransport();
      await server.connect(transport);
      setupSafeLogging(server);
      stdioTransportConnected = true;
    }
    console.error('Actual Budget MCP Server (stdio) started');
  }
}

// Setup handlers on the server instance BEFORE main() runs
setupResources(server);
setupTools(server, enableWrite, enableNini);
setupPrompts(server);

/**
 * Graceful shutdown handler
 * Cleans up resources and exits the process
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.error(`${signal} received, shutting down server`);

  // Set up force exit timeout (5 seconds)
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️  Shutdown timeout exceeded (5s), forcing exit');
    process.exit(1);
  }, 5000);

  try {
    // Shutdown Actual Budget API connection
    await shutdownActualApi();

    // Close MCP server
    server.close();

    // Restore console methods before exit
    if (!useSse) {
      restoreConsoleMethods();
    }

    // Clear the force exit timeout since we completed successfully
    clearTimeout(forceExitTimeout);

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

// Handle unhandled promise rejections to prevent crashes
process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  let errorMessage: string;
  try {
    if (reason instanceof Error) {
      errorMessage = reason.message || 'Unknown error';
      console.error(`[UNHANDLED REJECTION] ${errorMessage}`);
      if (reason.stack) {
        console.error(`[UNHANDLED REJECTION] Stack: ${reason.stack}`);
      }
    } else if (typeof reason === 'string') {
      errorMessage = reason;
      console.error(`[UNHANDLED REJECTION] ${errorMessage}`);
    } else {
      // Try to stringify, but catch circular reference errors
      try {
        errorMessage = JSON.stringify(reason);
        console.error(`[UNHANDLED REJECTION] ${errorMessage}`);
      } catch {
        errorMessage = String(reason);
        console.error(`[UNHANDLED REJECTION] ${errorMessage} (non-serializable object)`);
      }
    }
  } catch {
    console.error('[UNHANDLED REJECTION] Unknown error (could not process rejection reason)');
  }

  // Don't exit - just log the error so the server can continue
  // The error is already logged above
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

main()
  .then(() => {
    // Safe logging is already set up in main() for stdio mode
    // No need to override console methods here
  })
  .catch((error: unknown) => {
    console.error('Server error:', error);
    process.exit(1);
  });
