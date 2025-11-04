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
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { parseArgs } from 'node:util';
import {
  initActualApi,
  shutdownActualApi,
  getBudgets,
  getAccounts,
  getCategories,
  getCategoryGroups,
  getPayees,
  getRules,
  getTransactions,
  getAccountBalance,
  getBudgetMonths,
  getBudgetMonth,
  getSchedules,
  getServerVersion,
  getPayeeRules,
} from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';

dotenv.config({ path: '.env' });

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

// Argument parsing
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

const resolvedPort = port ? parseInt(port, 10) : 3000;

// Bearer authentication middleware
const bearerAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!enableBearer) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
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
    console.error('BEARER_TOKEN environment variable not set');
    res.status(500).json({
      error: 'Server configuration error',
    });
    return;
  }

  if (token !== expectedToken) {
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

// Start the server
async function main(): Promise<void> {
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

  /**
   * Custom method handler for actual.* JSON-RPC methods
   * Handles methods that aren't part of the standard MCP protocol
   */
  const handleCustomMethod = async (
    method: string,
    params: Record<string, unknown>,
    id: number | string | null
  ): Promise<{ jsonrpc: string; result?: unknown; error?: { code: number; message: string }; id: number | string | null }> => {
    try {
      await initActualApi();

      switch (method) {
        case 'actual.listBudgets': {
          const budgets = await getBudgets();
          return {
            jsonrpc: '2.0',
            result: budgets,
            id,
          };
        }

        case 'actual.getAccounts': {
          const accounts = await getAccounts();
          return {
            jsonrpc: '2.0',
            result: accounts,
            id,
          };
        }

        case 'actual.getCategories': {
          const categories = await getCategories();
          return {
            jsonrpc: '2.0',
            result: categories,
            id,
          };
        }

        case 'actual.getCategoryGroups': {
          const categoryGroups = await getCategoryGroups();
          return {
            jsonrpc: '2.0',
            result: categoryGroups,
            id,
          };
        }

        case 'actual.getPayees': {
          const payees = await getPayees();
          return {
            jsonrpc: '2.0',
            result: payees,
            id,
          };
        }

        case 'actual.getRules': {
          const rules = await getRules();
          return {
            jsonrpc: '2.0',
            result: rules,
            id,
          };
        }

        case 'actual.getTransactions': {
          const accountId = params.accountId;
          const start = params.start;
          const end = params.end;

          if (typeof accountId !== 'string') {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: accountId is required and must be a string',
              },
              id,
            };
          }

          if (typeof start !== 'string' || typeof end !== 'string') {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: start and end are required and must be strings',
              },
              id,
            };
          }

          const transactions = await getTransactions(accountId, start, end);
          return {
            jsonrpc: '2.0',
            result: transactions,
            id,
          };
        }

        case 'actual.getAccountBalance': {
          const accountId = params.accountId;
          const date = params.date;

          if (typeof accountId !== 'string') {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: accountId is required and must be a string',
              },
              id,
            };
          }

          const balance = await getAccountBalance(accountId, typeof date === 'string' ? date : undefined);
          return {
            jsonrpc: '2.0',
            result: balance,
            id,
          };
        }

        case 'actual.getBudgetMonths': {
          const months = await getBudgetMonths();
          return {
            jsonrpc: '2.0',
            result: months,
            id,
          };
        }

        case 'actual.getBudgetMonth': {
          const month = params.month;

          if (typeof month !== 'string') {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: month is required and must be a string',
              },
              id,
            };
          }

          const budgetMonth = await getBudgetMonth(month);
          return {
            jsonrpc: '2.0',
            result: budgetMonth,
            id,
          };
        }

        case 'actual.getSchedules': {
          const schedules = await getSchedules();
          return {
            jsonrpc: '2.0',
            result: schedules,
            id,
          };
        }

        case 'actual.getServerVersion': {
          const version = await getServerVersion();
          return {
            jsonrpc: '2.0',
            result: version,
            id,
          };
        }

        case 'actual.getPayeeRules': {
          const payeeId = params.payeeId;

          if (typeof payeeId !== 'string') {
            return {
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: payeeId is required and must be a string',
              },
              id,
            };
          }

          const rules = await getPayeeRules(payeeId);
          return {
            jsonrpc: '2.0',
            result: rules,
            id,
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
            id,
          };
      }
    } catch (error) {
      console.error(`Error executing custom method ${method}:`, error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
        id,
      };
    } finally {
      await shutdownActualApi();
    }
  };

  if (useSse) {
    const app = express();
    // * JSON middleware - exclude SSE endpoint to prevent interference with response handling
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/sse') {
        // Skip JSON parsing for SSE endpoint
        next();
      } else {
        express.json()(req, res, next);
      }
    });
    // * Map to store active SSE transports by connection ID
    // Each SSE connection gets its own transport instance
    const activeTransports = new Map<string, SSEServerTransport>();

    // Log bearer auth status
    if (enableBearer) {
      console.error('Bearer authentication enabled for SSE endpoints');
    } else {
      console.error('Bearer authentication disabled - endpoints are public');
    }

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
              <div class="endpoint">POST /mcp - MCP HTTP endpoint</div>
              <div class="endpoint">POST /messages - Messages endpoint</div>
              ${enableBearer ? '<p><strong>🔒 Bearer authentication: ENABLED</strong></p>' : '<p><em>⚠️ Bearer authentication: DISABLED</em></p>'}
            </div>
          </body>
        </html>
      `);
    });

    // Implementación HTTP streamable (stateless, MCP moderno)
    app.post('/mcp', bearerAuth, async (req: Request, res: Response) => {
      try {
        // Check if this is a custom actual.* method
        const body = req.body;
        if (body && typeof body === 'object' && body.method && typeof body.method === 'string' && body.method.startsWith('actual.')) {
          const result = await handleCustomMethod(body.method, body.params || {}, body.id || null);
          res.json(result);
          return;
        }

        // * Create new transport instance for each request (stateless HTTP transport)
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
        });
        res.on('close', () => {
          // ! Only close the transport, NOT the server instance
          // The server instance must remain alive for other connections
          try {
            transport.close();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    app.get('/sse', bearerAuth, async (req: Request, res: Response) => {
      // * Generate unique connection ID for this SSE session
      const connectionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // ! Check if headers have already been sent (should not happen, but safety check)
      if (res.headersSent) {
        console.error('Headers already sent before SSE transport setup - connection may be from a previous request');
        // Don't return - try to continue, but log the issue
      }

      try {
        // * Set connection ID in response header before transport connects
        // This allows clients to read it from headers if needed
        if (!res.headersSent) {
          res.setHeader('X-MCP-Connection-ID', connectionId);
        }
        
        // * Create SSE transport for this connection
        // The transport will set up SSE headers automatically when connected
        // Do NOT register event handlers on res before this, as it might trigger header sending
        const transport = new SSEServerTransport('/messages', res);
        
        // * Connect transport FIRST - this sets up SSE headers via transport.start()
        // * Must be done immediately after creating transport, before any other response operations
        // * Note: server.connect() may support multiple transports, or may require
        // * a single connection. If issues arise, we may need to create a new Server
        // * instance per connection instead.
        await server.connect(transport).catch((error) => {
          console.error(`Error connecting SSE transport (connectionId: ${connectionId}):`, error);
          // * Clean up transport from map if it was added
          activeTransports.delete(connectionId);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Failed to establish SSE connection',
              message: error instanceof Error ? error.message : String(error),
            });
          }
          throw error;
        });

        // * Store transport in map for this connection (after successful connection)
        activeTransports.set(connectionId, transport);
        
        // * Handle connection close - cleanup this specific transport
        // * Register this AFTER connection is established to avoid interfering with header setup
        res.on('close', () => {
          const storedTransport = activeTransports.get(connectionId);
          if (storedTransport) {
            try {
              storedTransport.close();
            } catch (e) {
              // Ignore cleanup errors
            }
            activeTransports.delete(connectionId);
          }
        });

        // * Send connection ID event to client - SSE events can be written after headers are sent
        // * This is how SSE works: headers are sent first, then events are written to the stream
        // * The client must include this ID in the X-MCP-Connection-ID header for subsequent POST requests
        // * This allows routing messages to the correct transport when multiple clients are connected
        res.write(`event: connection\n`);
        res.write(`data: ${JSON.stringify({ connectionId })}\n\n`);

        // * Optional log server integration (only in development with docker-compose)
        const logServerUrl = process.env.LOG_SERVER_URL || 'http://log-server:4000/log';
        const sendToLogServer = async (level: 'info' | 'error', message: string): Promise<void> => {
          // ! Only attempt log server if explicitly configured
          if (process.env.LOG_SERVER_URL || process.env.NODE_ENV === 'development') {
            try {
              await fetch(logServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `[${level}] ${message}` }),
                signal: AbortSignal.timeout(1000), // * 1 second timeout
              });
            } catch (e) {
              // * Silently fail - log server is optional
              // Only log if explicitly configured
              if (process.env.LOG_SERVER_URL) {
                process.stderr.write(`[log-server error] ${(e as Error).message}\n`);
              }
            }
          }
        };

        // * Setup per-connection logging (don't override global console)
        // Create a logging function that sends to this specific transport's client
        const logToClient = (level: 'info' | 'error', message: string) => {
          try {
            server.sendLoggingMessage({ level, message });
            sendToLogServer(level, message).catch(() => {
              // Ignore log server errors
            });
          } catch (e) {
            // Ignore logging errors
          }
        };

        // * Connection established successfully
        logToClient('info', `SSE connection established (ID: ${connectionId})`);
      } catch (error) {
        console.error('Failed to setup SSE connection:', error);
        activeTransports.delete(connectionId);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to initialize SSE connection',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      try {
        // Check if this is a custom actual.* method
        const body = req.body;
        if (body && typeof body === 'object' && body.method && typeof body.method === 'string' && body.method.startsWith('actual.')) {
          const result = await handleCustomMethod(body.method, body.params || {}, body.id || null);
          res.json(result);
          return;
        }

        // * Route message to the correct transport based on connection ID from header
        // The connection ID is sent to the client when establishing the SSE connection at /sse
        // The client should include this ID in the X-MCP-Connection-ID header for subsequent POST requests
        const connectionId = req.headers['x-mcp-connection-id'] as string | undefined;
        
        if (!connectionId) {
          res.status(400).json({
            error: 'Missing connection ID',
            message: 'SSE connection must be established first by connecting to /sse endpoint. X-MCP-Connection-ID header not found.',
          });
          return;
        }

        // * Look up the transport for this connection
        const transport = activeTransports.get(connectionId);
        
        if (!transport) {
          res.status(404).json({
            error: 'Transport not found',
            message: `No active SSE connection found for connection ID: ${connectionId}. The connection may have been closed.`,
          });
          return;
        }

        // * Route the message to the correct transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling message:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to process message',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });

    app.listen(resolvedPort, '0.0.0.0', (error) => {
      if (error) {
        console.error('Error:', error);
      } else {
        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort} (0.0.0.0)`);
        console.error(`Endpoints available:`);
        console.error(`  - MCP Endpoint: http://0.0.0.0:${resolvedPort}/mcp`);
        console.error(`  - SSE Endpoint: http://0.0.0.0:${resolvedPort}/sse`);
        console.error(`  - Messages Endpoint: http://0.0.0.0:${resolvedPort}/messages`);
        if (enableBearer) {
          console.error(`  - Bearer authentication: ENABLED`);
        } else {
          console.error(`  - Bearer authentication: DISABLED (not recommended for production)`);
        }
      }
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Actual Budget MCP Server (stdio) started');
  }
}

setupResources(server);
setupTools(server, enableWrite);
setupPrompts(server);

server.setRequestHandler(SetLevelRequestSchema, (request) => {
  console.log(`--- Logging level: ${request.params.level}`);
  return {};
});

process.on('SIGINT', () => {
  console.error('SIGINT received, shutting down server');
  server.close();
  process.exit(0);
});

main()
  .then(() => {
    if (!useSse) {
      // TODO: Setup proper logging level change. Messages are available in the notification of MCP Inspector
      console.log = (message: string) =>
        server.sendLoggingMessage({
          level: 'info',
          message,
        });
      console.error = (message: string) =>
        server.sendLoggingMessage({
          level: 'error',
          message,
        });
    }
  })
  .catch((error: unknown) => {
    console.error('Server error:', error);
    process.exit(1);
  });
