/**
 * Streamable HTTP Handler
 * 
 * Handles Streamable HTTP transport requests using the MCP SDK's StreamableHTTPServerTransport.
 * Manages request processing, response streaming, and cleanup.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

/**
 * Streamable HTTP Handler class
 * Wraps the SDK's StreamableHTTPServerTransport with additional functionality
 */
export class StreamableHTTPHandler {
  private transport: StreamableHTTPServerTransport;
  private server: Server;
  private isConnected: boolean = false;

  constructor(server: Server) {
    this.server = server;
    
    // Create transport with session management
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: false, // Use SSE streaming
      enableDnsRebindingProtection: false, // Can be enabled later if needed
    });
  }

  /**
   * Handle an incoming Streamable HTTP request
   * 
   * This method:
   * 1. Connects the transport to the MCP server (if not already connected)
   * 2. Processes the request through the transport
   * 3. Streams responses back to the client
   * 
   * Note: The StreamableHTTPServerTransport handles connection internally,
   * so we just need to connect it to the server once.
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    try {
      // Connect transport to server if not already connected
      // Note: We don't call transport.start() because StreamableHTTPServerTransport
      // manages its own lifecycle per-request
      if (!this.isConnected) {
        await this.server.connect(this.transport);
        this.isConnected = true;
      }

      // Handle the request through the transport
      await this.transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error('[StreamableHTTPHandler] Error handling request:', error);
      
      // If response hasn't been sent yet, send error response
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
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
  streamResponse(response: unknown): void {
    // The StreamableHTTPServerTransport handles response streaming internally
    // This method is here for interface compatibility
    console.log('[StreamableHTTPHandler] Streaming response');
  }

  /**
   * Clean up resources
   * Closes the transport connection
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.transport.close();
        this.isConnected = false;
        console.log('[StreamableHTTPHandler] Transport closed');
      }
    } catch (error) {
      console.error('[StreamableHTTPHandler] Error during cleanup:', error);
    }
  }

  /**
   * Check if transport is connected
   */
  isTransportConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the underlying transport instance
   * Useful for testing and advanced use cases
   */
  getTransport(): StreamableHTTPServerTransport {
    return this.transport;
  }
}
