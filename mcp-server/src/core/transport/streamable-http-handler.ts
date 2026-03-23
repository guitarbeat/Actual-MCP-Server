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

  private enableDnsRebindingProtection: boolean;

  constructor(server: Server, enableDnsRebindingProtection: boolean = false) {
    this.server = server;
    this.enableDnsRebindingProtection = enableDnsRebindingProtection;
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
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (!sessionId && parsedBody && isInitializeRequest(parsedBody)) {
        await this.handleNewSession(req, res, parsedBody);
      } else if (sessionId) {
        await this.handleExistingSession(sessionId, req, res, parsedBody);
      } else {
        this.sendErrorResponse(res, 400, -32000, 'Bad Request: No valid session ID provided');
      }
    } catch (error) {
      // SECURITY: Log the actual error for server-side debugging, but DO NOT leak details to the client
      console.error('[StreamableHTTPHandler] Internal server error:', error);

      if (!res.headersSent) {
        // Return a generic error message for all unhandled exceptions
        this.sendErrorResponse(
          res,
          500,
          -32603, // Internal error code per JSON-RPC 2.0
          'Internal server error',
        );
      }
    }
  }

  /**
   * Handle initialization of a new session
   */
  private async handleNewSession(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
  ): Promise<void> {
    const transportRef: { current: StreamableHTTPServerTransport | undefined } = {
      current: undefined,
    };
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: false,
      enableDnsRebindingProtection: this.enableDnsRebindingProtection,
      onsessioninitialized: (sid: string) => {
        console.error(`[StreamableHTTPHandler] Session initialized: ${sid}`);
        if (transportRef.current) {
          this.transports.set(sid, transportRef.current);
        }
      },
    });

    transportRef.current = transport;
    transport.onclose = () => {
      const sid = transportRef.current?.sessionId;
      if (sid && this.transports.has(sid)) {
        console.error(`[StreamableHTTPHandler] Transport closed for session ${sid}, cleaning up`);
        this.transports.delete(sid);
      }
    };

    await this.server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  }

  /**
   * Handle request for an existing session
   */
  private async handleExistingSession(
    sessionId: string,
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    const transport = this.transports.get(sessionId);

    if (!transport) {
      this.sendErrorResponse(res, 400, -32001, `Invalid session: ${sessionId}`);
      return;
    }

    await transport.handleRequest(req, res, parsedBody);
  }

  /**
   * Utility to send JSON-RPC error response
   */
  private sendErrorResponse(
    res: ServerResponse,
    statusCode: number,
    code: number,
    message: string,
    data?: unknown,
  ): void {
    if (res.headersSent) return;

    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code, message, data },
        id: null,
      }),
    );
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
