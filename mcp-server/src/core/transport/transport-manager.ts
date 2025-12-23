/**
 * Transport Manager
 *
 * Manages MCP transport connections for both SSE and Streamable HTTP transports.
 * Provides connection tracking, cleanup, and lifecycle management.
 */

import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * Transport type enumeration
 */
export enum TransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http',
  STDIO = 'stdio',
  UNKNOWN = 'unknown',
}

/**
 * Transport connection state
 */
export interface TransportConnection {
  id: string;
  type: TransportType;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

/**
 * SSE transport connection wrapper
 */
export interface SSETransportConnection {
  transport: SSEServerTransport;
  ready: boolean;
  connectionId: string;
}

/**
 * Transport Manager class
 * Manages lifecycle of multiple transport connections
 */
export class TransportManager {
  private connections: Map<string, TransportConnection>;
  private sseTransports: Map<string, SSETransportConnection>;

  constructor() {
    this.connections = new Map();
    this.sseTransports = new Map();
  }

  /**
   * Create and track an SSE transport connection
   */
  createSSETransport(res: ServerResponse): SSETransportConnection {
    // Use prefix for easier debugging and session identification
    const connectionId = `sse-${randomUUID()}`;
    const transport = new SSEServerTransport('/messages', res);

    const connection: SSETransportConnection = {
      transport,
      ready: false,
      connectionId,
    };

    // Track the connection
    this.connections.set(connectionId, {
      id: connectionId,
      type: TransportType.SSE,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      metadata: {},
    });

    this.sseTransports.set(connectionId, connection);

    console.error(`[TransportManager] Created SSE transport: ${connectionId}`);

    return connection;
  }

  /**
   * Create a Streamable HTTP transport instance
   * Note: Streamable HTTP transports are typically short-lived (per-request)
   * so we don't track them in the same way as SSE connections
   */
  createStreamableTransport(): StreamableHTTPServerTransport {
    return new StreamableHTTPServerTransport({
      // Use prefix for easier debugging and session identification
      sessionIdGenerator: () => `http-${randomUUID()}`,
      enableJsonResponse: false, // Use SSE streaming
      enableDnsRebindingProtection: false, // Can be enabled later if needed
    });
  }

  /**
   * Mark an SSE transport as ready
   */
  markSSETransportReady(connectionId: string): void {
    const connection = this.sseTransports.get(connectionId);
    if (connection) {
      connection.ready = true;
      this.updateLastActivity(connectionId);
    }
  }

  /**
   * Get an SSE transport by connection ID
   */
  getSSETransport(connectionId: string): SSETransportConnection | undefined {
    return this.sseTransports.get(connectionId);
  }

  /**
   * Update last activity timestamp for a connection
   */
  updateLastActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Clean up a transport connection
   */
  cleanupTransport(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
    }

    // Clean up SSE transport if it exists
    const sseConnection = this.sseTransports.get(connectionId);
    if (sseConnection) {
      try {
        sseConnection.transport.close();
      } catch (error) {
        // Ignore cleanup errors
        console.error(`[TransportManager] Error closing SSE transport ${connectionId}:`, error);
      }
      this.sseTransports.delete(connectionId);
    }

    this.connections.delete(connectionId);
  }

  /**
   * Get count of active connections
   */
  getActiveTransportCount(): number {
    return Array.from(this.connections.values()).filter((conn) => conn.isActive).length;
  }

  /**
   * Get count of active connections by type
   */
  getActiveTransportCountByType(type: TransportType): number {
    return Array.from(this.connections.values()).filter((conn) => conn.isActive && conn.type === type).length;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): TransportConnection[] {
    return Array.from(this.connections.values()).filter((conn) => conn.isActive);
  }

  /**
   * Clean up all transports (for shutdown)
   */
  cleanupAllTransports(): void {
    const connectionIds = Array.from(this.connections.keys());
    for (const id of connectionIds) {
      this.cleanupTransport(id);
    }
  }

  /**
   * Get connection info by ID
   */
  getConnection(connectionId: string): TransportConnection | undefined {
    return this.connections.get(connectionId);
  }
}
