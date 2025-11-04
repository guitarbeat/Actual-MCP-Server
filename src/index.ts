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
    app.use(express.json());
    let transport: SSEServerTransport | null = null;

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
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
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

        // Crear nueva instancia de transport y conectar el server en cada request
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
        });
        res.on('close', () => {
          transport.close();
          server.close();
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
      try {
        // * Handle connection close - cleanup previous transport if exists
        res.on('close', () => {
          if (transport) {
            try {
              transport.close();
            } catch (e) {
              // Ignore cleanup errors
            }
            transport = null;
          }
        });

        // * Create SSE transport and connect to server
        transport = new SSEServerTransport('/messages', res);
        
        // * Handle connection errors
        await server.connect(transport).catch((error) => {
          console.error('Error connecting SSE transport:', error);
          transport = null;
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Failed to establish SSE connection',
              message: error instanceof Error ? error.message : String(error),
            });
          }
          throw error;
        });

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

        // * Setup console logging to send to MCP client and optional log server
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        
        console.log = (message: string) => {
          server.sendLoggingMessage({ level: 'info', message });
          sendToLogServer('info', message).catch(() => {
            // Ignore log server errors
          });
          originalConsoleLog(message);
        };

        console.error = (message: string) => {
          server.sendLoggingMessage({ level: 'error', message });
          sendToLogServer('error', message).catch(() => {
            // Ignore log server errors
          });
          originalConsoleError(message);
        };

        // * Connection established successfully
        console.error(`SSE connection established for client`);
      } catch (error) {
        console.error('Failed to setup SSE connection:', error);
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

        // Otherwise, pass to MCP transport
        if (!transport) {
          res.status(503).json({
            error: 'Transport not initialized',
            message: 'SSE connection must be established first by connecting to /sse endpoint',
          });
          return;
        }

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
