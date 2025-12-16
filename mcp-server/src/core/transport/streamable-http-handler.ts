/**
 * Streamable HTTP Handler
 *
 * Handles Streamable HTTP transport requests using the MCP SDK's StreamableHTTPServerTransport.
 * Manages per-session transport instances for proper session isolation.
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

/**
 * Streamable HTTP Handler class
 * Manages per-session transport instances following MCP SDK best practices
 */
export class StreamableHTTPHandler {
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Handle an incoming Streamable HTTP request
   *
   * This method:
   * 1. Checks for existing session transport or creates a new one for initialize requests
   * 2. Connects the transport to the MCP server
   * 3. Processes the request through the transport
   * 4. Manages session lifecycle and cleanup
   *
   * Follows MCP SDK best practices: one transport per session.
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    try {
      // * Get session ID from headers (MCP standard header)
      // * Check for both standard and custom headers for compatibility
      const headers = req.headers || {};
      const sessionId =
        (headers['mcp-session-id'] as string | undefined) ||
        (headers['x-session-id'] as string | undefined);

      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && this.transports.has(sessionId)) {
        // * Reuse existing transport for this session
        transport = this.transports.get(sessionId);
      } else if (!sessionId && parsedBody && isInitializeRequest(parsedBody)) {
        // * New initialization request - create new transport
        // * Capture transport reference in closure to avoid race conditions
        const transportRef: { current: StreamableHTTPServerTransport | undefined } = { current: undefined };
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: false, // Use SSE streaming for real-time updates
          enableDnsRebindingProtection: false, // Handled by Express middleware + bearer auth
          onsessioninitialized: (sid: string) => {
            // * Store transport when session is initialized
            // * Use closure reference to avoid race conditions where transport might not be set yet
            console.error(`[StreamableHTTPHandler] Session initialized: ${sid}`);
            if (transportRef.current) {
              this.transports.set(sid, transportRef.current);
            }
          },
        });
        // * Store transport reference immediately after creation
        transportRef.current = transport;

        // * Set up cleanup handler using closure reference to avoid undefined access
        transport.onclose = () => {
          const currentTransport = transportRef.current;
          const sid = currentTransport?.sessionId;
          if (sid && this.transports.has(sid)) {
            console.error(`[StreamableHTTPHandler] Transport closed for session ${sid}, cleaning up`);
            this.transports.delete(sid);
          }
        };

        // * Connect transport to server BEFORE handling request
        // * This ensures responses can flow back through the same transport
        await this.server.connect(transport);

        // * Handle the initialize request
        await transport.handleRequest(req, res, parsedBody);
        return; // Already handled
      } else if (!sessionId) {
        // * Invalid request - no session ID and not an initialize request
        if (!res.headersSent) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            })
          );
        }
        return;
      } else {
        // * Session ID provided but transport not found
        if (!res.headersSent) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: `Invalid session: ${sessionId}`,
              },
              id: null,
            })
          );
        }
        return;
      }

      // * Handle request with existing transport
      // * Transport is already connected to the server
      if (!transport) {
        // * This should not happen due to logic flow, but TypeScript safety check
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error: Transport not available',
              },
              id: null,
            })
          );
        }
        return;
      }
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error('[StreamableHTTPHandler] Error handling request:', error);

      // If response hasn't been sent yet, send error response
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
              data: error instanceof Error ? error.message : 'Unknown error',
            },
            id: null,
          })
        );
      }
    }
  }

  /**
   * Process MCP messages from request body
   * Note: This is handled internally by the transport's handleRequest method
   */
  async processMessages(messages: unknown[]): Promise<void> {
    // The StreamableHTTPServerTransport handles message processing internally
    // This method is here for interface compatibility but delegates to handleRequest
    console.log(`[StreamableHTTPHandler] Processing ${messages.length} message(s)`);
  }

  /**
   * Stream a response back to the client
   * Note: This is handled internally by the transport
   */
  streamResponse(_response: unknown): void {
    // The StreamableHTTPServerTransport handles response streaming internally
    // This method is here for interface compatibility
    console.log('[StreamableHTTPHandler] Streaming response');
  }

  /**
   * Clean up resources
   * Closes all active transport connections
   */
  async cleanup(): Promise<void> {
    try {
      const cleanupPromises = Array.from(this.transports.values()).map(async (transport) => {
        try {
          await transport.close();
        } catch (error) {
          console.error('[StreamableHTTPHandler] Error closing transport:', error);
        }
      });

      await Promise.all(cleanupPromises);
      this.transports.clear();
      console.error('[StreamableHTTPHandler] All transports closed and cleaned up');
    } catch (error) {
      console.error('[StreamableHTTPHandler] Error during cleanup:', error);
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.transports.size;
  }

  /**
   * Get transport for a specific session (for testing/debugging)
   */
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.transports.get(sessionId);
  }
}
