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
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { setupSafeLogging, restoreConsoleMethods } from './core/logging/safe-logger.js';
import { StreamableHTTPHandler } from './core/transport/streamable-http-handler.js';

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
    // Include WWW-Authenticate header as per HTTP spec
    res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
    res.status(401).json({
      error: 'Authentication required',
      message: 'Authorization header required',
      code: -32000, // MCP authentication error code
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.error('[AUTH] ❌ Invalid Authorization header format');
    res.setHeader('WWW-Authenticate', 'Bearer realm="Actual Budget MCP Server"');
    res.status(401).json({
      error: 'Authentication failed',
      message: "Authorization header must start with 'Bearer '",
      code: -32000,
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
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

  if (token !== expectedToken) {
    console.error('[AUTH] ❌ Invalid bearer token (token mismatch)');
    console.error(`[AUTH] Received token length: ${token.length}, Expected token length: ${expectedToken.length}`);
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

    try {
      await initActualApi();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStr = errorMessage.toLowerCase();

      // * Migration errors are already handled in initActualApi with detailed guidance
      // * For other errors, provide general guidance
      if (!errorStr.includes('out of sync') && !errorStr.includes('out-of-sync') && !errorStr.includes('migration')) {
        console.error('✗ Failed to initialize Actual Budget API:', error);
        console.error('Server cannot start without Actual Budget connection');
        console.error('');
        console.error('Common causes:');
        console.error('  - Incorrect ACTUAL_SERVER_URL or ACTUAL_PASSWORD');
        console.error('  - Actual Budget server is not running or not accessible');
        console.error('  - Network connectivity issues');
        console.error('  - Invalid ACTUAL_BUDGET_SYNC_ID');
      }
      process.exit(1);
    }
  }

  if (useSse) {
    // * Use SDK's createMcpExpressApp for DNS rebinding protection and modern setup
    // * Note: We bind to '0.0.0.0' for production deployments, so DNS rebinding protection
    // * is handled via bearer authentication instead of host header validation
    const app = createMcpExpressApp({
      host: '0.0.0.0', // Allow binding to all interfaces for production
      // DNS rebinding protection is handled via bearer authentication
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
              <h3>Legacy SSE Transport:</h3>
              <div class="endpoint">GET /sse - SSE transport endpoint</div>
              <div class="endpoint">POST /messages - Messages endpoint</div>
              <h3>Modern Streamable HTTP Transport:</h3>
              <div class="endpoint">GET/POST/DELETE /mcp - Streamable HTTP endpoint</div>
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

      const clientIp = req.ip || req.socket.remoteAddress;
      const sessionId = `sse-${randomUUID()}`;

      console.error(`[SSE] Connection attempt from ${clientIp} (session: ${sessionId})`);
      console.error(
        `[SSE] Headers: ${JSON.stringify({ 'user-agent': req.headers['user-agent'], accept: req.headers.accept })}`
      );

      transport = new SSEServerTransport('/messages', res);
      transportReady = false;

      console.error(`[SSE] Creating transport (session: ${sessionId})...`);
      server
        .connect(transport)
        .then(() => {
          transportReady = true;
          originalConsoleError(`[SSE] ✅ Transport connected successfully (session: ${sessionId})`);
          // Override console methods to send via MCP logging
          // Only override if transport is still ready
          console.log = (message: string) => {
            if (transportReady && transport) {
              try {
                server.sendLoggingMessage({ level: 'info', data: message });
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
                server.sendLoggingMessage({ level: 'error', data: message });
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
        originalConsoleError(`[SSE] Connection closed (session: ${sessionId})`);
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

    // * Streamable HTTP transport endpoint - modern MCP transport
    // Create a single handler instance for all /mcp requests
    const streamableHandler = new StreamableHTTPHandler(server);

    // Handle all HTTP methods for /mcp endpoint (GET, POST, DELETE)
    app.all('/mcp', bearerAuth, async (req: Request, res: Response) => {
      const clientIp = req.ip || req.socket.remoteAddress;
      // * Use MCP standard header for session ID
      const sessionId = req.headers['mcp-session-id'] || req.headers['x-session-id'] || 'unknown';

      console.error(`[MCP] ${req.method} request from ${clientIp} (session: ${sessionId})`);

      try {
        await streamableHandler.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(`[MCP] Error handling request (session: ${sessionId}):`, error);

        if (!res.headersSent) {
          // Determine appropriate error code
          let errorCode = -32004; // Internal error
          let statusCode = 500;
          let errorMessage = 'Internal server error';

          if (error instanceof Error) {
            errorMessage = error.message;

            // Map specific errors to MCP error codes
            if (error.message.includes('session')) {
              errorCode = -32001; // Invalid session
              statusCode = 400;
            } else if (error.message.includes('parse') || error.message.includes('JSON')) {
              errorCode = -32005; // Parse error
              statusCode = 400;
            } else if (error.message.includes('method')) {
              errorCode = -32002; // Method not found
              statusCode = 404;
            } else if (error.message.includes('parameter')) {
              errorCode = -32003; // Invalid parameters
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
