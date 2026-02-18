/**
 * Protocol Detector
 *
 * Detects which MCP transport protocol a client is using based on HTTP request characteristics.
 * Routes requests to the appropriate transport handler.
 */

import type { IncomingMessage } from 'node:http';
import { TransportType } from './transport-manager.js';

/**
 * Protocol detection result
 */
export interface ProtocolDetectionResult {
  transport: TransportType;
  isValid: boolean;
  error?: string;
}

/**
 * Protocol Detector class
 * Determines transport type from HTTP request method and path
 */
export class ProtocolDetector {
  /**
   * Detect transport type from HTTP request
   *
   * Rules:
   * - GET /sse -> SSE Transport
   * - POST /messages -> SSE Message Handler
   * - Any method /mcp -> Streamable HTTP Transport (validation happens later)
   * - Other combinations -> Unknown
   */
  detectTransport(req: IncomingMessage): TransportType {
    const method = req.method?.toUpperCase();
    const { url } = req;

    if (!method || !url) {
      return TransportType.UNKNOWN;
    }

    // Parse path (remove query string)
    const path = url.split('?')[0];

    // SSE Transport endpoints
    if (method === 'GET' && path === '/sse') {
      return TransportType.SSE;
    }

    if (method === 'POST' && path === '/messages') {
      return TransportType.SSE;
    }

    // Streamable HTTP Transport endpoint
    // Detect based on path, validate method later
    if (path === '/mcp') {
      return TransportType.STREAMABLE_HTTP;
    }

    return TransportType.UNKNOWN;
  }

  /**
   * Validate that the request is compatible with the detected transport
   *
   * Checks:
   * - Method is supported for the endpoint
   * - Required headers are present (if applicable)
   */
  validateRequest(req: IncomingMessage, transport: TransportType): ProtocolDetectionResult {
    const method = req.method?.toUpperCase();
    const { url } = req;

    if (!method || !url) {
      return {
        transport,
        isValid: false,
        error: 'Missing HTTP method or URL',
      };
    }

    const path = url.split('?')[0];

    switch (transport) {
      case TransportType.SSE:
        return this.validateSSERequest(method, path);

      case TransportType.STREAMABLE_HTTP:
        return this.validateStreamableHTTPRequest(method, path);

      case TransportType.UNKNOWN:
        return {
          transport,
          isValid: false,
          error: `Unsupported endpoint: ${method} ${path}`,
        };

      default:
        return {
          transport,
          isValid: false,
          error: 'Unknown transport type',
        };
    }
  }

  /**
   * Validate SSE transport request
   */
  private validateSSERequest(method: string, path: string): ProtocolDetectionResult {
    if (path === '/sse' && method === 'GET') {
      return {
        transport: TransportType.SSE,
        isValid: true,
      };
    }

    if (path === '/messages' && method === 'POST') {
      return {
        transport: TransportType.SSE,
        isValid: true,
      };
    }

    return {
      transport: TransportType.SSE,
      isValid: false,
      error: `Invalid SSE request: ${method} ${path}`,
    };
  }

  /**
   * Validate Streamable HTTP transport request
   */
  private validateStreamableHTTPRequest(method: string, path: string): ProtocolDetectionResult {
    if (path !== '/mcp') {
      return {
        transport: TransportType.STREAMABLE_HTTP,
        isValid: false,
        error: `Invalid Streamable HTTP path: ${path}`,
      };
    }

    const allowedMethods = ['GET', 'POST', 'DELETE'];
    if (!allowedMethods.includes(method)) {
      return {
        transport: TransportType.STREAMABLE_HTTP,
        isValid: false,
        error: `Method ${method} not allowed for /mcp endpoint. Allowed: ${allowedMethods.join(', ')}`,
      };
    }

    return {
      transport: TransportType.STREAMABLE_HTTP,
      isValid: true,
    };
  }

  /**
   * Get appropriate HTTP status code for invalid requests
   */
  getErrorStatusCode(result: ProtocolDetectionResult): number {
    if (result.isValid) {
      return 200;
    }

    // Check if it's a method not allowed error
    if (result.error?.includes('not allowed') || result.error?.includes('Method')) {
      return 405; // Method Not Allowed
    }

    // Check if it's an unsupported endpoint
    if (result.error?.includes('Unsupported endpoint')) {
      return 404; // Not Found
    }

    // Default to bad request
    return 400; // Bad Request
  }
}
