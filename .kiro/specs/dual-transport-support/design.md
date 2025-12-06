# Design Document

## Overview

This design adds support for modern Streamable HTTP transport to the Actual Budget MCP server while maintaining backward compatibility with the existing HTTP+SSE transport. The implementation uses a unified architecture with a single MCP server instance that serves both transport types, shared authentication middleware, and protocol detection based on HTTP request characteristics.

The key architectural principle is to minimize code duplication by sharing the MCP server instance, tool registrations, and authentication logic across both transport types. This ensures consistency and reduces maintenance overhead.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express HTTP Server                     │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   CORS     │→ │    Bearer    │→ │  Protocol Router   │  │
│  │ Middleware │  │     Auth     │  │                    │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
│                                              │               │
│                          ┌───────────────────┴──────────┐   │
│                          │                              │   │
│                    ┌─────▼──────┐              ┌────────▼───┐
│                    │ SSE Handler│              │ Streamable │
│                    │  GET /sse  │              │  POST /mcp │
│                    │POST /messages│            │            │
│                    └─────┬──────┘              └────────┬───┘
│                          │                              │   │
│                          │    ┌──────────────────┐      │   │
│                          └────►  Shared MCP      ◄──────┘   │
│                               │  Server Instance │          │
│                               │                  │          │
│                               │  - Tools         │          │
│                               │  - Resources     │          │
│                               │  - Prompts       │          │
│                               └────────┬─────────┘          │
└────────────────────────────────────────┼────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │  Actual Budget   │
                              │      API         │
                              └──────────────────┘
```

### Transport Lifecycle

**SSE Transport (Legacy):**
1. Client sends GET request to `/sse`
2. Server establishes SSE connection
3. Server creates SSEServerTransport instance
4. Transport connects to shared MCP server
5. Client sends POST requests to `/messages` for each MCP operation
6. Server processes messages through SSE transport
7. Connection closes, transport cleanup occurs

**Streamable HTTP Transport (Modern):**
1. Client sends POST request to `/mcp` with MCP messages
2. Server creates StreamableHTTPServerTransport instance
3. Transport connects to shared MCP server
4. Server processes all messages in request body
5. Server streams responses back using chunked transfer encoding
6. Request completes, transport cleanup occurs

### Shared Components

**Single MCP Server Instance:**
- Created once at startup
- All tools, resources, and prompts registered once
- Both transports connect to the same instance
- Ensures consistency across transport types

**Authentication Middleware:**
- Applied to all transport endpoints
- Validates Bearer token when `--enable-bearer` flag is set
- Returns 401 Unauthorized for invalid/missing tokens
- Shared logic eliminates duplication

**Protocol Router:**
- Express route handlers detect transport type by HTTP method and path
- GET `/sse` → SSE transport handler
- POST `/messages` → SSE message handler
- POST `/mcp` → Streamable HTTP transport handler

## Components and Interfaces

### Transport Manager

```typescript
interface TransportManager {
  // Create and manage SSE transport for a connection
  createSSETransport(res: Response): SSETransportConnection;
  
  // Create and manage Streamable HTTP transport for a request
  createStreamableTransport(req: Request, res: Response): Promise<void>;
  
  // Clean up transport resources
  cleanupTransport(transportId: string): void;
  
  // Get active transport count
  getActiveTransportCount(): number;
}

interface SSETransportConnection {
  transport: SSEServerTransport;
  ready: boolean;
  connectionId: string;
}
```

### Streamable HTTP Transport Handler

```typescript
interface StreamableHTTPHandler {
  // Handle incoming Streamable HTTP request
  handleRequest(req: Request, res: Response): Promise<void>;
  
  // Process MCP messages from request body
  processMessages(messages: unknown[]): Promise<void>;
  
  // Stream responses back to client
  streamResponse(response: unknown): void;
  
  // Clean up after request completes
  cleanup(): void;
}
```

### Protocol Detection

```typescript
interface ProtocolDetector {
  // Determine transport type from request
  detectTransport(req: Request): TransportType;
  
  // Validate request is compatible with detected transport
  validateRequest(req: Request, transport: TransportType): boolean;
}

enum TransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http',
  STDIO = 'stdio',
  UNKNOWN = 'unknown'
}
```

## Data Models

### Transport Connection State

```typescript
interface TransportConnection {
  id: string;
  type: TransportType;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}
```

### Server Configuration

```typescript
interface ServerConfig {
  port: number;
  enableWrite: boolean;
  enableBearer: boolean;
  enableNini: boolean;
  bearerToken?: string;
  actualServerUrl: string;
  actualPassword: string;
  actualBudgetSyncId: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Streamable HTTP uses chunked transfer encoding

*For any* valid MCP message sent to POST /mcp, the response SHALL use HTTP chunked transfer encoding (Transfer-Encoding: chunked header present)

**Validates: Requirements 1.2**

### Property 2: All messages in request body are processed

*For any* Streamable HTTP request containing multiple MCP messages, all messages SHALL be processed and responses returned

**Validates: Requirements 1.4**

### Property 3: Appropriate error status codes returned

*For any* error condition during Streamable HTTP processing, the server SHALL return the correct HTTP status code (401 for auth, 503 for backend unavailable, 500 for internal errors)

**Validates: Requirements 1.5, 7.2, 7.4, 7.5**

### Property 4: SSE connections accept messages after establishment

*For any* established SSE connection, POST requests to /messages SHALL be accepted and processed

**Validates: Requirements 2.2**

### Property 5: SSE transport cleanup on connection close

*For any* SSE connection, when the connection closes, all associated transport resources SHALL be cleaned up without leaks

**Validates: Requirements 2.3**

### Property 6: Concurrent transport handling

*For any* combination of active SSE and Streamable HTTP connections, the server SHALL handle both simultaneously without interference

**Validates: Requirements 2.5**

### Property 7: Authentication applies uniformly

*For any* transport endpoint (/sse, /messages, /mcp), when bearer authentication is enabled, requests without valid tokens SHALL be rejected with 401

**Validates: Requirements 3.1, 3.2**

### Property 8: Unauthenticated access when disabled

*For any* transport endpoint, when bearer authentication is disabled, requests SHALL be processed without requiring tokens

**Validates: Requirements 3.3**

### Property 9: Valid tokens work across transports

*For any* valid Bearer token, requests to both SSE and Streamable HTTP endpoints SHALL be processed successfully

**Validates: Requirements 3.5**

### Property 10: Correct routing by method and path

*For any* request, the server SHALL route GET /sse to SSE handler, POST /mcp to Streamable handler, and POST /messages to SSE message handler

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 11: Invalid methods rejected

*For any* unsupported HTTP method on a transport endpoint, the server SHALL return 405 Method Not Allowed

**Validates: Requirements 4.4**

### Property 12: Transports share MCP server instance

*For any* transport handler created, it SHALL connect to the same shared MCP server instance

**Validates: Requirements 5.2**

### Property 13: Tools available across transports

*For any* registered tool, it SHALL be callable from both SSE and Streamable HTTP clients

**Validates: Requirements 5.3**

### Property 14: Connection failures logged

*For any* transport connection failure, detailed error information SHALL be logged

**Validates: Requirements 7.1**

### Property 15: In-flight requests complete during shutdown

*For any* in-flight request when shutdown begins, the request SHALL be allowed to complete within the timeout period

**Validates: Requirements 8.2**

## Error Handling

### Transport-Level Errors

**SSE Transport Errors:**
- Connection establishment failures → Log error, return 500
- Message parsing errors → Return error via SSE event stream
- Transport disconnection → Clean up resources, log disconnection

**Streamable HTTP Transport Errors:**
- Invalid request body → Return 400 Bad Request
- Message processing errors → Stream error response
- Connection interruption → Clean up resources, log error

### Authentication Errors

- Missing Authorization header → Return 401 with error message
- Invalid Bearer token format → Return 401 with error message
- Token mismatch → Return 401, log attempt with token length
- Missing BEARER_TOKEN env var → Return 500, log configuration error

### Backend Errors

- Actual Budget API unavailable → Return 503 Service Unavailable
- API initialization failure → Exit process with error code 1
- API operation failure → Return error in MCP response format

### Protocol Errors

- Unsupported HTTP method → Return 405 Method Not Allowed
- Invalid MCP message format → Return error response
- Unknown endpoint → Return 404 Not Found

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Authentication middleware with valid/invalid tokens
- Protocol detection logic for different request types
- Transport manager lifecycle operations
- Error response formatting
- Configuration validation

### Property-Based Testing

Property-based tests will verify universal properties using a PBT library (fast-check for TypeScript). Each test will run a minimum of 100 iterations with randomly generated inputs.

**PBT Library:** fast-check (TypeScript/JavaScript property-based testing library)

**Test Configuration:**
- Minimum iterations: 100 per property
- Timeout: 30 seconds per property test
- Shrinking: Enabled to find minimal failing cases

**Property Test Requirements:**
- Each property-based test MUST be tagged with a comment referencing the correctness property
- Tag format: `// Feature: dual-transport-support, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test
- Tests MUST generate random valid inputs to verify properties hold universally

### Integration Testing

Integration tests will verify:
- End-to-end SSE connection and message flow
- End-to-end Streamable HTTP request/response flow
- Concurrent connections of both transport types
- Authentication flow for both transports
- Graceful shutdown with active connections

### Manual Testing

Manual testing will verify:
- Documentation page displays correctly
- Real MCP clients can connect via both transports
- Performance characteristics under load
- Browser-based clients work with CORS

## Implementation Notes

### MCP SDK Transport Classes

The implementation will use the MCP SDK's transport classes:
- `SSEServerTransport` - Already in use for SSE transport
- Need to check if SDK provides Streamable HTTP transport or implement custom

### Backward Compatibility

The implementation MUST maintain 100% backward compatibility with existing SSE clients:
- Existing `/sse` and `/messages` endpoints unchanged
- Same authentication behavior
- Same error responses
- Same connection lifecycle

### Performance Considerations

- Streamable HTTP transport should have lower latency than SSE for single requests
- SSE transport better for long-lived connections with multiple operations
- Both transports share the same Actual Budget API connection (no duplication)
- Transport manager should track active connections for monitoring

### Security Considerations

- Bearer token validation identical for both transports
- CORS headers allow cross-origin requests (needed for browser clients)
- No sensitive data in logs (token values not logged, only lengths)
- Rate limiting should be considered for production deployments (future enhancement)

## Deployment Considerations

### Environment Variables

No new environment variables required. Existing variables apply:
- `BEARER_TOKEN` - Used for authentication on both transports
- `PORT` - HTTP server port
- `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_BUDGET_SYNC_ID` - Backend connection

### Command-Line Flags

Existing flags apply:
- `--sse` - Enable HTTP server mode (both transports available)
- `--enable-bearer` - Enable bearer authentication
- `--enable-write` - Enable write operations
- `--port` - Override default port

### Health Checks

The root endpoint `/` serves as a health check:
- Returns 200 OK when server is running
- Lists available endpoints
- Shows authentication status

### Monitoring

Recommended metrics to track:
- Active SSE connections count
- Active Streamable HTTP requests count
- Request rate by transport type
- Error rate by transport type
- Authentication failure rate

## Future Enhancements

- WebSocket transport support
- Connection pooling for Streamable HTTP
- Request/response compression
- Rate limiting per client
- Metrics endpoint for monitoring
- OpenTelemetry instrumentation
