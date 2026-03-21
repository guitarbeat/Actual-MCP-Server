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
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  getInitializationStats,
  initActualApi,
  isInitialized,
  isInitializing,
  shutdownActualApi,
} from './core/api/actual-client.js';
import { createBearerAuth } from './core/auth/bearer-auth.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { restoreConsoleMethods, setupSafeLogging } from './core/logging/safe-logger.js';
import { corsMiddleware } from './core/transport/cors.js';
import { securityHeaders } from './core/transport/security-headers.js';
import { StreamableHTTPHandler } from './core/transport/streamable-http-handler.js';
import { renderEndpoint, renderStat } from './core/utils/dashboard.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const { version } = packageJson;

dotenv.config({ path: '.env', quiet: true } as Parameters<typeof dotenv.config>[0]);

// Argument parsing (must happen before server creation)
const {
  values: {
    sse: useSseOption,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    'enable-nini': enableNini,
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
    'enable-nini': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
    host: { type: 'string' },
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
    version,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      logging: {},
    },
  },
);

const resolvedPort = port
  ? parseInt(port, 10)
  : process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

// Bearer authentication middleware
const bearerAuth = createBearerAuth({
  enableBearer,
  expectedToken: process.env.BEARER_TOKEN,
});

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
 *
 * Establishes a Server-Sent Events connection for real-time communication
 * with the MCP client. Each connection gets a unique session ID and
 * its own Transport instance.
 *
 * @param req - Express Request object
 * @param res - Express Response object
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
        // SECURITY: Do not leak error details to the client
        message: 'Internal server error',
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
    if (error.message.includes('session')) {
      errorCode = -32001;
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorCode = -32005;
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('method')) {
      errorCode = -32002;
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('parameter')) {
      errorCode = -32003;
      statusCode = 400;
      errorMessage = error.message;
    }
    // SECURITY: If we fall through to 500, we use the default 'Internal server error' message
    // instead of error.message to avoid leaking sensitive information.
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
async function initializeApi(
  shouldTestResources: boolean,
  shouldTestCustom: boolean,
  shouldUseSse: boolean,
): Promise<void> {
  if (shouldTestResources || shouldTestCustom) return;

  // * CRITICAL: In stdio mode, setup safe logging BEFORE initialization
  if (!shouldUseSse && !stdioTransportConnected) {
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

    if (
      errorStr.includes('out of sync') ||
      errorStr.includes('out-of-sync') ||
      errorStr.includes('migration')
    ) {
      console.error(
        'ℹ️  Actual Budget server is currently out of sync or migrating. This is normal during a rebuild.',
      );
      console.error('   The MCP server will continue to retry connection in the background.');
    } else {
      console.error('✗ Failed to initialize Actual Budget API:', error);
      console.error(
        'Server is running but Actual Budget connection failed. Will retry on next request.\n\nCommon causes:\n  - Incorrect ACTUAL_SERVER_URL or ACTUAL_PASSWORD\n  - Actual Budget server is not running or not accessible\n  - Network connectivity issues\n  - Invalid ACTUAL_BUDGET_SYNC_ID',
      );
    }
  }
}

/**
 * Main application entry point
 *
 * Handles transport initialization (Stdio or HTTP/SSE),
 * server startup, and connection to Actual Budget API.
 */
async function main(): Promise<void> {
  if (testResourcesOption) {
    await runResourceTest();
  }

  if (testCustomOption) {
    await runCustomTest();
  }

  validateEnv();
  if (useSseOption) {
    // Determine binding host
    // If bearer auth is enabled, default to 0.0.0.0 (all interfaces)
    // If bearer auth is disabled, default to 127.0.0.1 (localhost only) for security
    const bindHost = host || (enableBearer ? '0.0.0.0' : '127.0.0.1');

    // * Use SDK's createMcpExpressApp for DNS rebinding protection and modern setup
    // * Note: We bind to '0.0.0.0' for production deployments
    // * When bearer authentication is enabled, it provides security instead of host header validation
    const app = createMcpExpressApp({
      host: bindHost,
      // * When bearer authentication is enabled, allow all connections
      // * Bearer auth provides security instead of host header validation.
      // * When bearer auth is disabled, restrict to localhost for security.
      allowedHosts: enableBearer ? undefined : ['localhost', '127.0.0.1'],
    });

    // * Enforce a 1MB payload limit for JSON bodies
    app.use(express.json({ limit: '1mb' }));

    // * Helmet security headers (Content Security Policy is managed by custom securityHeaders middleware)
    app.use(helmet({ contentSecurityPolicy: false }));

    // * Rate limiting: maximum of 100 requests per 15 minutes
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(apiLimiter);

    // * Security Headers
    app.use(securityHeaders);

    // * CORS middleware for cross-origin requests (e.g. browser-based MCP clients)
    app.use(corsMiddleware);

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
    function renderDashboard(nonce: string): string {
      const stats = getInitializationStats();
      const initialized = isInitialized();
      const initializing = isInitializing();

      const getStatusDetails = () => {
        if (initialized) return { type: 'success', text: 'Connected' };
        if (initializing) return { type: 'warning', text: 'Initializing...' };
        return { type: 'error', text: 'Disconnected' };
      };

      const { type: statusType, text: statusText } = getStatusDetails();

      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${initializing ? '<meta http-equiv="refresh" content="3">' : ''}
            <title>Actual Budget MCP</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.ico">
            <style nonce="${nonce}">
              :root {
                --bg: #ffffff;
                --text: #1a1a1a;
                --muted: #666666;
                --border: #eeeeee;
                --primary: #2563eb;
                --success: #15803d;
                --warning: #b45309;
                --error: #b91c1c;
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --bg: #0f172a;
                  --text: #f1f5f9;
                  --muted: #94a3b8;
                  --border: #1e293b;
                  --success: #10b981;
                  --warning: #f59e0b;
                  --error: #ef4444;
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
              /* Keyboard accessibility */
              *:focus-visible {
                outline: 2px solid var(--primary);
                outline-offset: 2px;
                border-radius: 2px;
              }

              .skip-link {
                position: absolute;
                top: -40px;
                left: 0;
                background: var(--primary);
                color: white;
                padding: 8px;
                z-index: 100;
                transition: top 0.2s;
              }
              .skip-link:focus {
                top: 0;
              }

              @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
                100% { opacity: 1; transform: scale(1); }
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
              .dot.pulsing { animation: pulse 2s infinite ease-in-out; }

              /* Status colors */
              .status-success { color: var(--success); }
              .status-warning { color: var(--warning); }
              .status-error { color: var(--error); }

              .dot.success { background-color: var(--success); box-shadow: 0 0 0 2px var(--success); opacity: 0.8; }
              .dot.warning { background-color: var(--warning); box-shadow: 0 0 0 2px var(--warning); opacity: 0.8; }
              .dot.error { background-color: var(--error); box-shadow: 0 0 0 2px var(--error); opacity: 0.8; }

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
              .endpoints { border: 1px solid var(--border); border-radius: 6px; list-style: none; padding: 0; margin: 0; }
              .ep-row {
                padding: 8px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid var(--border);
                font-size: 13px;
                transition: background-color 0.2s ease;
              }
              .ep-row:hover {
                background-color: color-mix(in srgb, var(--text), transparent 96%);
              }
              .ep-row:last-child { border-bottom: none; }
              .method { font-family: monospace; font-weight: bold; font-size: 11px; width: 35px; }
              .path { font-family: monospace; flex: 1; }
              .desc { color: var(--muted); font-size: 12px; }
              dl, dd, ul, li { margin: 0; padding: 0; }
              footer {
                margin-top: 30px;
                font-size: 12px;
                color: var(--muted);
                text-align: center;
              }
              footer a { color: var(--primary); text-decoration: none; margin: 0 10px; }
              a:hover {
                text-decoration: underline;
              }
              .copy-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                min-width: 32px;
                min-height: 32px;
                color: var(--muted);
                border-radius: 4px;
                display: inline-flex;
                align-items: center;
                transition: all 0.2s;
                margin-left: 8px;
              }
              .copy-btn:hover {
                color: var(--primary);
                background-color: color-mix(in srgb, var(--primary), transparent 90%);
              }
              .copy-btn.copied {
                color: var(--success);
              }
              .copy-btn .icon-check { display: none; }
              .copy-btn.copied .icon-copy { display: none; }
              .copy-btn.copied .icon-check { display: block; }

              .tooltip-container {
                position: relative;
                display: inline-flex;
                vertical-align: middle;
              }
              .tooltip-text {
                visibility: hidden;
                width: 60px;
                background-color: var(--text);
                color: var(--bg);
                text-align: center;
                border-radius: 4px;
                padding: 4px 0;
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                margin-left: -30px;
                font-size: 10px;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
              }
              .tooltip-container.show-tooltip .tooltip-text {
                visibility: visible;
                opacity: 1;
              }

              .section-title {
                margin: 0 0 8px 0;
                font-size: 12px;
                font-weight: bold;
                color: var(--muted);
              }

              .error-hint {
                background: color-mix(in srgb, var(--error), transparent 90%);
                color: var(--error);
                padding: 12px;
                border-radius: 6px;
                font-size: 13px;
                margin-bottom: 20px;
                border: 1px solid color-mix(in srgb, var(--error), transparent 80%);
                display: flex;
                align-items: center;
                gap: 8px;
              }
              /* Text color utilities */
              .text-primary { color: var(--primary); }
              .text-success { color: var(--success); }
              .text-warning { color: var(--warning); }
              .text-error { color: var(--error); }

              /* Flex utilities */
              .flex-none { flex: 0 0 auto; }
              .flex-1 { flex: 1; }
            </style>
          </head>
          <body>
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <div class="container">
              <header>
                <h1>Actual Budget MCP</h1>
                <span class="version">v${version}</span>
              </header>

              <main id="main-content" tabindex="-1">
                <div class="status-line">
                  <div class="dot ${statusType} ${initializing ? 'pulsing' : ''}" aria-hidden="true"></div>
                  <span class="status-${statusType}">${statusText}</span>
                </div>

                ${
                  statusType === 'error'
                    ? `
                  <div class="error-hint" role="alert">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>Connection failed. Check server logs for details.</span>
                  </div>
                `
                    : ''
                }

                <dl class="grid">
                  ${renderStat('Port', resolvedPort)}
                  ${renderStat('Host', bindHost)}
                  ${renderStat('Auth', enableBearer ? 'Enabled' : 'Disabled')}
                  ${renderStat('Init Time', stats.initializationTime ? `${stats.initializationTime}ms` : '---')}
                  ${renderStat('Sessions', streamableHandler.getActiveSessionCount())}
                </dl>

                <h2 class="section-title">ENDPOINTS</h2>
                <ul class="endpoints">
                  ${renderEndpoint('ALL', 'primary', '/mcp', 'Streamable Connection')}
                  ${renderEndpoint('GET', 'success', '/sse', 'Event Stream')}
                  ${renderEndpoint('GET', 'warning', '/health', 'Health Check')}
                </ul>
              </main>

	              <footer>
	                <span>Actual MCP</span>
	                <a href="/health">System Health</a>
	              </footer>
            </div>
            <script nonce="${nonce}">
              document.addEventListener('DOMContentLoaded', () => {
                document.querySelectorAll('.copy-btn').forEach(btn => {
                  let timeoutId;
                  btn.addEventListener('click', async () => {
                    const path = btn.getAttribute('data-path');
                    if (!path) return;

                    const fullUrl = window.location.origin + path;

                    try {
                      await navigator.clipboard.writeText(fullUrl);

                      // Visual feedback
                      btn.classList.add('copied');
                      const container = btn.closest('.tooltip-container');
                      if (container) {
                        container.classList.add('show-tooltip');

                        if (timeoutId) clearTimeout(timeoutId);

                        timeoutId = setTimeout(() => {
                          container.classList.remove('show-tooltip');
                          btn.classList.remove('copied');
                          timeoutId = null;
                        }, 2000);
                      }
                    } catch (err) {
                      console.error('Failed to copy:', err);
                    }
                  });
                });
              });
            </script>
          </body>
        </html>
      `;
    }

    // * Root route - Condensed & Universal Dashboard
    app.get('/', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(renderDashboard(res.locals.nonce as string));
    });

    // * Health check route for deployment platforms
    app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/sse', bearerAuth, handleSseConnection);
    app.post('/messages', bearerAuth, handleSseMessages);

    // * Streamable HTTP transport endpoint - modern MCP transport
    // Create a single handler instance for all /mcp requests
    // Enable DNS rebinding protection when bearer auth is disabled (binding to localhost)
    const streamableHandler = new StreamableHTTPHandler(server, !enableBearer);

    // Handle all HTTP methods for /mcp endpoint (GET, POST, DELETE)
    app.all('/mcp', bearerAuth, async (req: Request, res: Response) => {
      const sessionId = (req.headers['mcp-session-id'] ||
        req.headers['x-session-id'] ||
        'unknown') as string;
      try {
        await streamableHandler.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(`[MCP] Error handling request (session: ${sessionId}):`, error);
        mapMcpError(error, sessionId, res);
      }
    });

    app.listen(resolvedPort, bindHost, () => {
      console.error(`[SSE] 🚀 MCP Server listening on port ${resolvedPort} (host: ${bindHost})`);
      if (!enableBearer && bindHost === '127.0.0.1') {
        console.error(
          '[SSE] ⚠️  Binding to localhost only. To allow external connections, use --enable-bearer or --host 0.0.0.0',
        );
      }
    });

    // * Initialize API after server starts listening on port
    // * This prevents Render from timing out during initialization
    await initializeApi(!!testResourcesOption, !!testCustomOption, useSseOption);
  } else {
    await initializeApi(!!testResourcesOption, !!testCustomOption, useSseOption);
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

/**
 * Setup handlers on the server instance BEFORE main() runs
 * This ensures all capabilities are registered before the server starts
 */
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
    if (!useSseOption) {
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
      // Only log stack trace in non-production environments to avoid information leakage
      if (reason.stack && process.env.NODE_ENV !== 'production') {
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
