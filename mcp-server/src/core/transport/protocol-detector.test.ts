/**
 * Property-based tests for ProtocolDetector
 * 
 * Feature: dual-transport-support, Property 10: Correct routing by method and path
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ProtocolDetector } from './protocol-detector.js';
import { TransportType } from './transport-manager.js';
import type { IncomingMessage } from 'node:http';

// Mock IncomingMessage for testing
function createMockRequest(method: string, url: string): IncomingMessage {
  return {
    method,
    url,
    headers: {},
  } as IncomingMessage;
}

describe('ProtocolDetector', () => {
  const detector = new ProtocolDetector();

  describe('Property 10: Correct routing by method and path', () => {
    /**
     * Feature: dual-transport-support, Property 10: Correct routing by method and path
     * Validates: Requirements 4.1, 4.2, 4.3, 4.5
     * 
     * Property: For any request, the server SHALL route GET /sse to SSE handler,
     * POST /mcp to Streamable handler, and POST /messages to SSE message handler
     */

    it('should detect SSE transport for GET /sse', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '?foo=bar', '?session=123'), // Query string variations
          (queryString) => {
            const req = createMockRequest('GET', `/sse${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.SSE);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
            expect(validation.transport).toBe(TransportType.SSE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect SSE transport for POST /messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '?foo=bar', '?id=456'), // Query string variations
          (queryString) => {
            const req = createMockRequest('POST', `/messages${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.SSE);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
            expect(validation.transport).toBe(TransportType.SSE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect Streamable HTTP transport for POST /mcp', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '?session=abc', '?foo=bar'), // Query string variations
          (queryString) => {
            const req = createMockRequest('POST', `/mcp${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.STREAMABLE_HTTP);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
            expect(validation.transport).toBe(TransportType.STREAMABLE_HTTP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect Streamable HTTP transport for GET /mcp', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '?lastEventId=123', '?session=xyz'), // Query string variations
          (queryString) => {
            const req = createMockRequest('GET', `/mcp${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.STREAMABLE_HTTP);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
            expect(validation.transport).toBe(TransportType.STREAMABLE_HTTP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect Streamable HTTP transport for DELETE /mcp', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '?session=abc'), // Query string variations
          (queryString) => {
            const req = createMockRequest('DELETE', `/mcp${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.STREAMABLE_HTTP);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
            expect(validation.transport).toBe(TransportType.STREAMABLE_HTTP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return UNKNOWN for unsupported endpoints', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // Various methods
          fc.constantFrom('/unknown', '/api', '/health', '/'), // Various paths
          (method, path) => {
            // Skip valid combinations
            const pathStr = path as string;
            if (
              (method === 'GET' && pathStr === '/sse') ||
              (method === 'POST' && pathStr === '/messages') ||
              ((method === 'GET' || method === 'POST' || method === 'DELETE') && pathStr === '/mcp')
            ) {
              return; // Skip valid combinations
            }

            const req = createMockRequest(method, path);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.UNKNOWN);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(false);
            expect(validation.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid methods for SSE endpoints', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PUT', 'PATCH', 'DELETE', 'OPTIONS'), // Invalid methods for SSE
          fc.constantFrom('/sse', '/messages'), // SSE endpoints
          (method, path) => {
            const req = createMockRequest(method, path);
            const transport = detector.detectTransport(req);

            // Should not detect as SSE with wrong method
            expect(transport).not.toBe(TransportType.SSE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid methods for Streamable HTTP endpoint', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PUT', 'PATCH', 'OPTIONS', 'HEAD'), // Invalid methods for /mcp
          (method) => {
            const req = createMockRequest(method, '/mcp');
            const transport = detector.detectTransport(req);

            // Should detect as Streamable HTTP (based on path)
            // But validation should fail
            if (transport === TransportType.STREAMABLE_HTTP) {
              const validation = detector.validateRequest(req, transport);
              expect(validation.isValid).toBe(false);
              expect(validation.error).toContain('not allowed');
              expect(detector.getErrorStatusCode(validation)).toBe(405);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return appropriate error status codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { method: 'PUT', path: '/mcp', expectedStatus: 405 }, // Method not allowed
            { method: 'GET', path: '/unknown', expectedStatus: 404 }, // Not found
            { method: 'POST', path: '/api', expectedStatus: 404 } // Not found
          ),
          (testCase) => {
            const req = createMockRequest(testCase.method, testCase.path);
            const transport = detector.detectTransport(req);
            const validation = detector.validateRequest(req, transport);

            expect(validation.isValid).toBe(false);
            const statusCode = detector.getErrorStatusCode(validation);
            expect(statusCode).toBe(testCase.expectedStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive HTTP methods', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'Get', 'GET', 'gEt'), // Case variations
          (method) => {
            const req = createMockRequest(method, '/sse');
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.SSE);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle requests with query parameters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('&') && !s.includes('=')), // Query param key
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('&') && !s.includes('=')), // Query param value
          (key, value) => {
            const queryString = `?${key}=${value}`;
            const req = createMockRequest('POST', `/mcp${queryString}`);
            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.STREAMABLE_HTTP);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing method or URL gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { method: undefined, url: '/sse' },
            { method: 'GET', url: undefined },
            { method: undefined, url: undefined }
          ),
          (testCase) => {
            const req = {
              method: testCase.method,
              url: testCase.url,
              headers: {},
            } as unknown as IncomingMessage;

            const transport = detector.detectTransport(req);
            expect(transport).toBe(TransportType.UNKNOWN);

            const validation = detector.validateRequest(req, transport);
            expect(validation.isValid).toBe(false);
            expect(validation.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently detect transport type across multiple calls', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { method: 'GET', path: '/sse', expected: TransportType.SSE },
            { method: 'POST', path: '/messages', expected: TransportType.SSE },
            { method: 'POST', path: '/mcp', expected: TransportType.STREAMABLE_HTTP },
            { method: 'GET', path: '/mcp', expected: TransportType.STREAMABLE_HTTP },
            { method: 'DELETE', path: '/mcp', expected: TransportType.STREAMABLE_HTTP }
          ),
          fc.integer({ min: 2, max: 10 }), // Number of times to call
          (testCase, numCalls) => {
            const results = [];

            for (let i = 0; i < numCalls; i++) {
              const req = createMockRequest(testCase.method, testCase.path);
              const transport = detector.detectTransport(req);
              results.push(transport);
            }

            // All results should be the same
            const uniqueResults = new Set(results);
            expect(uniqueResults.size).toBe(1);
            expect(results[0]).toBe(testCase.expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
