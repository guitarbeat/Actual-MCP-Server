# MCP SDK Transport Research

## Current SDK Version

- `@modelcontextprotocol/sdk`: ^1.12.0

## Available Transports in SDK

Based on the current codebase imports:

1. **StdioServerTransport** (`@modelcontextprotocol/sdk/server/stdio.js`)
   - Used for local CLI-based MCP clients (like Claude Desktop)
   - Communication via stdin/stdout
   - Currently used as default mode

2. **SSEServerTransport** (`@modelcontextprotocol/sdk/server/sse.js`)
   - Used for HTTP-based MCP clients
   - Server-Sent Events for server-to-client messages
   - POST requests for client-to-server messages
   - Currently implemented in `--sse` mode

## Streamable HTTP Transport

### Research Findings ✅

**CONFIRMED**: The MCP SDK (v1.12.0) **DOES** provide `StreamableHTTPServerTransport`!

Located at: `@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js`

### StreamableHTTPServerTransport Features

**Key Capabilities:**

- Implements MCP Streamable HTTP transport specification
- Supports both SSE streaming and direct HTTP responses
- Session management (stateful and stateless modes)
- DNS rebinding protection
- Event store support for resumability
- Handles GET, POST, and DELETE requests

**Transport Modes:**

1. **Stateful Mode** (with session ID):
   - Server generates and manages session IDs
   - Session validation on subsequent requests
   - In-memory state management
   - Session lifecycle callbacks

2. **Stateless Mode** (no session ID):
   - No session ID in responses
   - No session validation
   - Simpler for single-request scenarios

**Request Handling:**

- GET requests: Establish SSE stream
- POST requests: Send JSON-RPC messages
- DELETE requests: Terminate sessions
- Other methods: Return 405 Method Not Allowed

### Implementation Approach

**Use SDK's StreamableHTTPServerTransport** ✅

Import statement:

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
```

Configuration options:

```typescript
interface StreamableHTTPServerTransportOptions {
  sessionIdGenerator: (() => string) | undefined;
  onsessioninitialized?: (sessionId: string) => void | Promise<void>;
  onsessionclosed?: (sessionId: string) => void | Promise<void>;
  enableJsonResponse?: boolean;
  eventStore?: EventStore;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  enableDnsRebindingProtection?: boolean;
}
```

### Recommended Configuration

For our use case (Actual Budget MCP server):

```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(), // Stateful mode
  enableJsonResponse: false, // Use SSE streaming
  enableDnsRebindingProtection: false, // Disable for simplicity (can enable later)
});
```

### Integration Plan

1. Import `StreamableHTTPServerTransport` from SDK
2. Create POST `/mcp` endpoint in Express
3. Apply bearer authentication middleware
4. Instantiate transport with appropriate options
5. Call `transport.handleRequest(req, res, req.body)` in route handler
6. Connect transport to shared MCP server instance

### Comparison with SSE Transport

| Feature            | SSEServerTransport        | StreamableHTTPServerTransport |
| ------------------ | ------------------------- | ----------------------------- |
| Protocol           | HTTP+SSE (legacy)         | Streamable HTTP (modern)      |
| Endpoints          | GET /sse + POST /messages | GET/POST/DELETE /mcp          |
| Session Management | Manual                    | Built-in                      |
| Resumability       | No                        | Yes (with event store)        |
| DNS Protection     | No                        | Yes (optional)                |
| Stateless Mode     | No                        | Yes                           |

## Conclusion

✅ **No custom implementation needed**
✅ **SDK provides full Streamable HTTP support**
✅ **Can proceed with integration using SDK's transport class**

## Next Steps

1. ✅ Research complete - SDK provides StreamableHTTPServerTransport
2. Create transport manager module
3. Implement /mcp endpoint using StreamableHTTPServerTransport
4. Test both transports working concurrently
