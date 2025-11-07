#!/usr/bin/env node
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
import express, { NextFunction, Request, Response } from 'express';
import { parseArgs } from 'node:util';
import { initActualApi, shutdownActualApi, getInitializationStats } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import {
  logPerformanceSummary,
  startPeriodicCacheStatsLogging,
  stopPeriodicCacheStatsLogging,
  logCacheStats,
  logInitializationStats,
} from './core/performance/performance-logger.js';
import { cacheService } from './core/cache/cache-service.js';
import { metricsTracker } from './core/performance/metrics-tracker.js';
import { setupSafeLogging, restoreConsoleMethods } from './core/logging/safe-logger.js';

dotenv.config({ path: '.env' });

// Argument parsing (must happen before server creation)
const {
  values: {
    sse: useSse,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    port,
    'test-resources': testResources,
    'test-custom': testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

// Factory function to create a new MCP server instance
// This is needed because each SSE connection requires its own server instance
// Based on the working implementation, creating a new server per connection avoids conflicts
// Initialize the MCP server
const server = new Server(
  {
    name: 'Actual Budget',
    version: '1.2.0',
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

  if (!authHeader) {
    console.error('[AUTH] ❌ Missing Authorization header');
    res.status(401).json({
      error: 'Authorization header required',
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: "Authorization header must start with 'Bearer '",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const expectedToken = process.env.BEARER_TOKEN;

  if (!expectedToken) {
    console.error('[AUTH] ❌ BEARER_TOKEN environment variable not set');
    res.status(500).json({
      error: 'Server configuration error',
    });
    return;
  }

  if (token !== expectedToken) {
    console.error('[AUTH] ❌ Invalid bearer token (token mismatch)');
    console.error(`[AUTH] Received token length: ${token.length}, Expected token length: ${expectedToken.length}`);
    res.status(401).json({
      error: 'Invalid bearer token',
    });
    return;
  }

  next();
};

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Global variable to track periodic logging interval
let cacheStatsInterval: NodeJS.Timeout | null = null;

// Global variable to track if stdio transport is already connected
let stdioTransportConnected = false;

// Start the server
async function main(): Promise<void> {
  // Startup banner (skip for test modes)
  if (!testResources && !testCustom) {
    // Reserved for future startup banner
  }

  // If testing resources, verify connectivity and list accounts, then exit
  if (testResources) {
    console.log('Testing resources...');
    try {
      await initActualApi();
      const accounts = await fetchAllAccounts();
      console.log(`Found ${accounts.length} account(s).`);
      accounts.forEach((account) => console.log(`- ${account.id}: ${account.name}`));
      console.log('Resource test passed.');
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error('Resource test failed:', error);
      process.exit(1);
    }
  }

  if (testCustom) {
    console.log('Initializing custom test...');
    try {
      await initActualApi();

      // Custom test here

      // ----------------

      console.log('Custom test passed.');
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error('Custom test failed:', error);
    }
  }

  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error('Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.');
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error('Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not.');
    console.error('If your server requires authentication, initialization will fail.');
  }

  // Initialize Actual Budget API at startup
  if (!testResources && !testCustom) {
    // * CRITICAL: In stdio mode, setup safe logging BEFORE initialization
    // * This ensures all logs during initialization go through MCP logging
    if (!useSse && !stdioTransportConnected) {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      setupSafeLogging(server);
      stdioTransportConnected = true;
    }

    console.error('');

    try {
      await initActualApi();

      console.error('');

      // Log performance configuration at startup
      if (metricsTracker.isEnabled()) {
        console.error('[PERF] Performance logging: ENABLED');
        const threshold = process.env.PERFORMANCE_LOG_THRESHOLD_MS || '1000';
        console.error(`[PERF] Slow operation threshold: ${threshold}ms`);
      } else {
        console.error('[PERF] Performance logging: DISABLED');
      }

      if (cacheService.isEnabled()) {
        console.error('[CACHE] Cache: ENABLED');
        const ttl = process.env.CACHE_TTL_SECONDS || '300';
        const maxEntries = process.env.CACHE_MAX_ENTRIES || '1000';
        console.error(`[CACHE] TTL: ${ttl}s, Max entries: ${maxEntries}`);

        // Start periodic cache stats logging
        cacheStatsInterval = startPeriodicCacheStatsLogging();
        if (cacheStatsInterval) {
          const interval = process.env.PERFORMANCE_CACHE_STATS_INTERVAL_MS || '300000';
          console.error(`[CACHE] Periodic stats logging: every ${parseInt(interval, 10) / 1000}s`);
        }
      } else {
        console.error('[CACHE] Cache: DISABLED');
      }

      console.error('');
    } catch (error) {
      console.error('✗ Failed to initialize Actual Budget API:', error);
      console.error('Server cannot start without Actual Budget connection');
      process.exit(1);
    }
  }

  if (useSse) {
    const app = express();

    // * CORS middleware for cross-origin requests (Poke MCP runs in browser)
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Connection-ID');
      res.setHeader('Access-Control-Expose-Headers', 'X-MCP-Connection-ID');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    });

    app.use(express.json());
    let transport: SSEServerTransport | null = null;
    let transportReady = false;

    // * Favicon route - simple SVG favicon
    app.get('/favicon.ico', (req: Request, res: Response) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#2563eb" rx="10"/>
        <text x="50" y="65" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">$</text>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(svg);
    });

    // * Root route - basic server info
    app.get('/', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Actual Budget MCP Server</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.ico">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 { color: #2563eb; margin-top: 0; }
              .endpoint { 
                background: #f8f9fa; 
                padding: 10px; 
                margin: 10px 0; 
                border-left: 3px solid #2563eb;
                font-family: monospace;
              }
              .status { color: #10b981; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>💰 Actual Budget MCP Server</h1>
              <p class="status">✓ Server is running</p>
              <p>This is an MCP (Model Context Protocol) server for Actual Budget.</p>
              <h2>Available Endpoints:</h2>
              <div class="endpoint">GET /sse - SSE transport endpoint</div>
              <div class="endpoint">POST /messages - Messages endpoint</div>
              ${enableBearer ? '<p><strong>🔒 Bearer authentication: ENABLED</strong></p>' : '<p><em>⚠️ Bearer authentication: DISABLED</em></p>'}
            </div>
          </body>
        </html>
      `);
    });

    // Note: Removed /mcp endpoint to match working implementation
    // The working version only uses /sse and /messages endpoints
    // If you need stateless HTTP transport, use /sse endpoint with SSE transport

    app.get('/sse', bearerAuth, (req: Request, res: Response) => {
      // Store original console methods before overriding
      const originalConsoleError = console.error;
      const originalConsoleLog = console.log;

      console.error(`[SSE] Connection attempt from ${req.ip || req.socket.remoteAddress}`);
      console.error(
        `[SSE] Headers: ${JSON.stringify({ 'user-agent': req.headers['user-agent'], accept: req.headers.accept })}`
      );

      transport = new SSEServerTransport('/messages', res);
      transportReady = false;

      console.error('[SSE] Creating transport...');
      server
        .connect(transport)
        .then(() => {
          transportReady = true;
          originalConsoleError('[SSE] ✅ Transport connected successfully');
          // Override console methods to send via MCP logging
          // Only override if transport is still ready
          console.log = (message: string) => {
            if (transportReady && transport) {
              try {
                server.sendLoggingMessage({ level: 'info', message });
              } catch {
                // If connection closed, use original console
                originalConsoleLog(message);
              }
            } else {
              originalConsoleLog(message);
            }
          };
          console.error = (message: string) => {
            if (transportReady && transport) {
              try {
                server.sendLoggingMessage({ level: 'error', message });
              } catch {
                // If connection closed, use original console
                originalConsoleError(message);
              }
            } else {
              originalConsoleError(message);
            }
          };
        })
        .catch((error) => {
          transportReady = false;
          originalConsoleError('[SSE] ❌ Error connecting SSE transport:', error);
          originalConsoleError('[SSE] Error details:', error instanceof Error ? error.stack : String(error));
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to establish SSE connection' });
          }
        });

      // Clean up transport when connection closes
      res.on('close', () => {
        // Mark as not ready first, then restore console methods
        transportReady = false;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        originalConsoleError('[SSE] Connection closed');
        if (transport) {
          try {
            transport.close();
          } catch (_e) {
            // Ignore cleanup errors
          }
          transport = null;
        }
      });
    });
    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      if (transport && transportReady) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(503).json({
          error: 'Transport not ready',
          message: transport
            ? 'Transport is initializing, please wait'
            : 'Transport not initialized. Connect to /sse first.',
        });
      }
    });

    app.listen(resolvedPort, '0.0.0.0', (error) => {
      if (error) {
        console.error('Error:', error);
      }
      // Server started successfully
    });
  } else {
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
setupTools(server, enableWrite);
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
    // Log final performance summary and cache stats
    if (metricsTracker.isEnabled()) {
      console.error('');
      logPerformanceSummary();

      // Log initialization statistics showing persistent connection benefits
      console.error('');
      const initStats = getInitializationStats();
      logInitializationStats(initStats);
    }

    if (cacheService.isEnabled()) {
      console.error('');
      logCacheStats();
    }

    // Stop periodic cache stats logging
    stopPeriodicCacheStatsLogging(cacheStatsInterval);

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
