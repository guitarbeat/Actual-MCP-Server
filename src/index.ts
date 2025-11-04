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
import { initActualApi, shutdownActualApi, getBudgets } from './actual-api.js';
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
    version: '1.0.0',
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

    app.get('/sse', bearerAuth, (req: Request, res: Response) => {
      transport = new SSEServerTransport('/messages', res);
      server.connect(transport).then(() => {
        // Función para enviar logs al log-server
        const sendToLogServer = async (level: 'info' | 'error', message: string): Promise<void> => {
          try {
            await fetch('http://log-server:4000/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `[${level}] ${message}` }),
            });
          } catch (e) {
            // fallback local log
            process.stderr.write(`[log-server error] ${(e as Error).message}\n`);
          }
        };

        // Redefinir console.log y console.error
        console.log = (message: string) => {
          server.sendLoggingMessage({ level: 'info', message });
          sendToLogServer('info', message);
        };

        console.error = (message: string) => {
          server.sendLoggingMessage({ level: 'error', message });
          sendToLogServer('error', message);
        };

        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort}`);
      });
    });
    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      // Check if this is a custom actual.* method
      const body = req.body;
      if (body && typeof body === 'object' && body.method && typeof body.method === 'string' && body.method.startsWith('actual.')) {
        const result = await handleCustomMethod(body.method, body.params || {}, body.id || null);
        res.json(result);
        return;
      }

      // Otherwise, pass to MCP transport
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(500).json({ error: 'Transport not initialized' });
      }
    });

    app.listen(resolvedPort, '0.0.0.0', (error) => {
      if (error) {
        console.error('Error:', error);
      } else {
        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort} (0.0.0.0)`);
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
