# Error Handling and Session Management

## Overview

The Actual Budget MCP Server implements comprehensive error handling and session management across multiple transport types (SSE and Streamable HTTP).

## Session Management

### Session ID Prefixes

All sessions use prefixed UUIDs for easy identification:

- **SSE Transport**: `sse-{uuid}` - e.g., `sse-195f0a52-7183-4db1-acd1-bc388475cf45`
- **Streamable HTTP**: `http-{uuid}` - e.g., `http-7a3b9c1d-4e2f-8a6b-9d1c-3f5e7b8a9c2d`

This ensures:
- ✅ Unique session IDs across all transport types
- ✅ Easy debugging by identifying transport type from session ID
- ✅ Consistent session tracking in logs

### Session Tracking

The `TransportManager` maintains a unified view of all active sessions:

```typescript
interface TransportConnection {
  id: string;              // Prefixed UUID
  type: TransportType;     // SSE or STREAMABLE_HTTP
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}
```

## Error Handling

### HTTP-Level Errors

| Status Code | Error Type | MCP Code | Description |
|-------------|-----------|----------|-------------|
| 401 | Authentication Error | -32000 | Missing or invalid bearer token |
| 400 | Invalid Session | -32001 | Session ID not found or invalid |
| 404 | Method Not Found | -32002 | Unknown endpoint or method |
| 400 | Invalid Parameters | -32003 | Missing or invalid request parameters |
| 500 | Internal Error | -32004 | Server-side exception |
| 400 | Parse Error | -32005 | Invalid JSON in request body |

### Authentication Error Responses

All 401 responses include the `WWW-Authenticate` header as per HTTP specification:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="Actual Budget MCP Server"
Content-Type: application/json

{
  "error": "Authentication required",
  "message": "Authorization header required",
  "code": -32000
}
```

### Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "code": -32000,
  "sessionId": "sse-abc123..." // Optional, included when available
}
```

### Transport-Specific Error Handling

**SSE Transport:**
- Errors logged with session context
- Connection closed gracefully
- Console methods restored on cleanup

**Streamable HTTP Transport:**
- Errors caught and mapped to appropriate MCP error codes
- Session ID included in error response when available
- Graceful fallback if response headers already sent

### Error Logging

All errors are logged with context:

```
[MCP] Error handling request (session: http-abc123...): Error message
[SSE] Connection closed (session: sse-xyz789...)
[AUTH] ❌ Invalid bearer token (token mismatch)
```

## Best Practices

### Layered Error Handling

1. **HTTP Layer** (Express middleware)
   - Authentication errors (401)
   - Routing errors (404, 405)
   - Server errors (500)

2. **Transport Layer** (Our handlers)
   - Transport-specific error formatting
   - Session management errors
   - Graceful cleanup

3. **Protocol Layer** (MCP SDK)
   - JSON-RPC error codes
   - Method not found
   - Invalid parameters

### Graceful Degradation

Always check if response headers are sent before sending error responses:

```typescript
if (!res.headersSent) {
  res.status(500).json({ error: 'Internal server error' });
}
```

### Error Code Mapping

The server intelligently maps error messages to appropriate MCP error codes:

```typescript
if (error.message.includes('session')) {
  errorCode = -32001; // Invalid session
} else if (error.message.includes('parse')) {
  errorCode = -32005; // Parse error
}
// ... etc
```

## Testing

Error handling is validated through:
- 26 property-based tests with 2,600+ iterations
- Authentication middleware tests
- Protocol detection tests
- Transport handler error tests

## Future Enhancements

Potential improvements:
- Rate limiting per session
- Session expiration and cleanup
- Detailed error metrics and monitoring
- Custom error codes for Actual Budget-specific errors
