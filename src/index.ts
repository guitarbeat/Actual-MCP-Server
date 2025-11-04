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
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
      transport = new SSEServerTransport('/messages', res);
      transportReady = false;
      server
        .connect(transport)
        .then(() => {
          transportReady = true;
          console.log = (message: string) => server.sendLoggingMessage({ level: 'info', message });
          console.error = (message: string) => server.sendLoggingMessage({ level: 'error', message });
        })
        .catch((error) => {
          transportReady = false;
          console.error('Error connecting SSE transport:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to establish SSE connection' });
          }
        });

      // Clean up transport when connection closes
      res.on('close', () => {
        if (transport) {
          try {
            transport.close();
          } catch (_e) {
            // Ignore cleanup errors
          }
          transport = null;
          transportReady = false;
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
      } else {
        // Get deployment info (git commit hash if available)
        let deploymentInfo = 'unknown';
        try {
          const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
          deploymentInfo = commitHash;
        } catch (_e) {
          // Git not available or not in a git repo - use package version
          try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const pkgPath = join(__dirname, '..', 'package.json');
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
            deploymentInfo = `v${pkg.version}`;
          } catch (_e2) {
            // Fallback to unknown
          }
        }

        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort} (0.0.0.0)`);
        console.error(`Deployment: ${deploymentInfo}`);
        console.error(`Endpoints available:`);
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

// Setup handlers on the server instance BEFORE main() runs
setupResources(server);
setupTools(server, enableWrite);
setupPrompts(server);

process.on('SIGINT', () => {
  console.error('SIGINT received, shutting down server');
  server.close();
  process.exit(0);
});

main()
  .then(() => {
    if (!useSse) {
      console.log = (message: string) => server.sendLoggingMessage({ level: 'info', message });
      console.error = (message: string) => server.sendLoggingMessage({ level: 'error', message });
    }
  })
  .catch((error: unknown) => {
    console.error('Server error:', error);
    process.exit(1);
  });
