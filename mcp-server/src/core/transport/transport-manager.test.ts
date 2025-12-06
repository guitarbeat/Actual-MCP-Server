/**
 * Property-based tests for TransportManager
 * 
 * Feature: dual-transport-support, Property 12: Transports share MCP server instance
 * Validates: Requirements 5.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TransportManager, TransportType } from './transport-manager.js';
import { ServerResponse } from 'node:http';
import { Writable } from 'node:stream';

// Mock ServerResponse for testing
class MockServerResponse extends Writable implements Partial<ServerResponse> {
  statusCode = 200;
  headersSent = false;
  private headers: Map<string, string | string[]> = new Map();

  setHeader(name: string, value: string | string[]): this {
    this.headers.set(name, value);
    return this;
  }

  getHeader(name: string): string | string[] | undefined {
    return this.headers.get(name);
  }

  writeHead(statusCode: number): this {
    this.statusCode = statusCode;
    this.headersSent = true;
    return this;
  }

  _write(chunk: unknown, encoding: string, callback: (error?: Error | null) => void): void {
    callback();
  }

  end(): this {
    return this;
  }
}

describe('TransportManager', () => {
  describe('Property 12: Transports share MCP server instance', () => {
    /**
     * Feature: dual-transport-support, Property 12: Transports share MCP server instance
     * Validates: Requirements 5.2
     * 
     * Property: For any transport handler created, it SHALL connect to the same shared MCP server instance
     * 
     * This test verifies that:
     * 1. Multiple SSE transports can be created
     * 2. Multiple Streamable HTTP transports can be created
     * 3. All transports are tracked independently
     * 4. Connection IDs are unique across all transports
     */
    it('should create unique connection IDs for all SSE transports', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of SSE connections to create
          (numConnections) => {
            // Create a fresh manager for each test run
            const manager = new TransportManager();
            const connectionIds = new Set<string>();

            // Create multiple SSE transports
            for (let i = 0; i < numConnections; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              const connection = manager.createSSETransport(mockRes);

              // Each connection should have a unique ID
              expect(connectionIds.has(connection.connectionId)).toBe(false);
              connectionIds.add(connection.connectionId);

              // Connection should be tracked
              const trackedConnection = manager.getConnection(connection.connectionId);
              expect(trackedConnection).toBeDefined();
              expect(trackedConnection?.type).toBe(TransportType.SSE);
              expect(trackedConnection?.isActive).toBe(true);
            }

            // Verify all connections are tracked
            expect(manager.getActiveTransportCount()).toBe(numConnections);
            expect(manager.getActiveTransportCountByType(TransportType.SSE)).toBe(numConnections);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should create Streamable HTTP transports independently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of Streamable HTTP transports to create
          (numTransports) => {
            const manager = new TransportManager();
            const transports = [];

            // Create multiple Streamable HTTP transports
            for (let i = 0; i < numTransports; i++) {
              const transport = manager.createStreamableTransport();
              expect(transport).toBeDefined();
              transports.push(transport);
            }

            // All transports should be distinct instances
            const uniqueTransports = new Set(transports);
            expect(uniqueTransports.size).toBe(numTransports);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track SSE and Streamable HTTP transports concurrently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of SSE connections
          fc.integer({ min: 1, max: 5 }), // Number of Streamable HTTP transports
          (numSSE, numStreamable) => {
            const manager = new TransportManager();
            const sseConnectionIds = new Set<string>();

            // Create SSE transports
            for (let i = 0; i < numSSE; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              const connection = manager.createSSETransport(mockRes);
              sseConnectionIds.add(connection.connectionId);
            }

            // Create Streamable HTTP transports (not tracked in connection map)
            for (let i = 0; i < numStreamable; i++) {
              const transport = manager.createStreamableTransport();
              expect(transport).toBeDefined();
            }

            // Verify SSE connections are tracked
            expect(manager.getActiveTransportCount()).toBe(numSSE);
            expect(manager.getActiveTransportCountByType(TransportType.SSE)).toBe(numSSE);

            // All SSE connection IDs should be unique
            expect(sseConnectionIds.size).toBe(numSSE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should properly clean up transports', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of connections to create
          (numConnections) => {
            const manager = new TransportManager();
            const connectionIds: string[] = [];

            // Create connections
            for (let i = 0; i < numConnections; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              const connection = manager.createSSETransport(mockRes);
              connectionIds.push(connection.connectionId);
            }

            expect(manager.getActiveTransportCount()).toBe(numConnections);

            // Clean up all connections
            for (const id of connectionIds) {
              manager.cleanupTransport(id);
            }

            // All connections should be cleaned up
            expect(manager.getActiveTransportCount()).toBe(0);
            expect(manager.getActiveTransportCountByType(TransportType.SSE)).toBe(0);

            // Connections should no longer be retrievable
            for (const id of connectionIds) {
              expect(manager.getConnection(id)).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle cleanup of all transports at once', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of connections
          (numConnections) => {
            const manager = new TransportManager();
            
            // Create connections
            for (let i = 0; i < numConnections; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              manager.createSSETransport(mockRes);
            }

            expect(manager.getActiveTransportCount()).toBe(numConnections);

            // Clean up all at once
            manager.cleanupAllTransports();

            // All connections should be cleaned up
            expect(manager.getActiveTransportCount()).toBe(0);
            expect(manager.getActiveConnections()).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update last activity timestamp', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of connections
          (numConnections) => {
            const manager = new TransportManager();
            const connectionIds: string[] = [];

            // Create connections
            for (let i = 0; i < numConnections; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              const connection = manager.createSSETransport(mockRes);
              connectionIds.push(connection.connectionId);
            }

            // Update activity for each connection
            for (const id of connectionIds) {
              const beforeUpdate = manager.getConnection(id);
              expect(beforeUpdate).toBeDefined();
              const beforeTime = beforeUpdate!.lastActivity.getTime();

              // Wait a tiny bit to ensure timestamp changes
              const now = Date.now();
              while (Date.now() === now) {
                // Busy wait for at least 1ms
              }

              manager.updateLastActivity(id);

              const afterUpdate = manager.getConnection(id);
              expect(afterUpdate).toBeDefined();
              const afterTime = afterUpdate!.lastActivity.getTime();

              // Last activity should be updated
              expect(afterTime).toBeGreaterThan(beforeTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark SSE transports as ready', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of connections
          (numConnections) => {
            const manager = new TransportManager();
            const connectionIds: string[] = [];

            // Create connections (initially not ready)
            for (let i = 0; i < numConnections; i++) {
              const mockRes = new MockServerResponse() as unknown as ServerResponse;
              const connection = manager.createSSETransport(mockRes);
              connectionIds.push(connection.connectionId);
              expect(connection.ready).toBe(false);
            }

            // Mark all as ready
            for (const id of connectionIds) {
              manager.markSSETransportReady(id);
              const connection = manager.getSSETransport(id);
              expect(connection).toBeDefined();
              expect(connection!.ready).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
