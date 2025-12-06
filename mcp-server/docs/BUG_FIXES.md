# Bug Fixes and Critical Improvements

## Critical Bug Fix #1: Streamable HTTP Session Management

### Issue

The `StreamableHTTPHandler` was using a **single transport instance for all requests**, which violated MCP SDK best practices and could cause:

- Session isolation issues
- Race conditions between concurrent requests
- Incorrect session state management
- Memory leaks from improper cleanup

### Root Cause

The implementation created one transport in the constructor and reused it for all requests, ignoring session IDs from request headers.

### Fix

Refactored to follow MCP SDK best practices:

1. **Per-Session Transport Management**: Each session now gets its own `StreamableHTTPServerTransport` instance
2. **Session ID Handling**: Properly reads `mcp-session-id` header (MCP standard) with fallback to `x-session-id`
3. **Transport Lifecycle**:
   - Creates new transport on `initialize` requests
   - Stores transport by session ID when session is initialized
   - Reuses existing transport for subsequent requests in the same session
   - Cleans up transport when session closes
4. **Proper Error Handling**: Returns appropriate MCP error codes for invalid sessions

### Code Changes

**Before:**

```typescript
export class StreamableHTTPHandler {
  private transport: StreamableHTTPServerTransport;
  private isConnected: boolean = false;

  constructor(server: Server) {
    this.transport = new StreamableHTTPServerTransport({...});
  }

  async handleRequest(req, res, parsedBody) {
    if (!this.isConnected) {
      await this.server.connect(this.transport);
      this.isConnected = true;
    }
    await this.transport.handleRequest(req, res, parsedBody);
  }
}
```

**After:**

```typescript
export class StreamableHTTPHandler {
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();

  async handleRequest(req, res, parsedBody) {
    const sessionId = req.headers['mcp-session-id'];

    if (sessionId && this.transports.has(sessionId)) {
      // Reuse existing transport
      transport = this.transports.get(sessionId);
    } else if (!sessionId && isInitializeRequest(parsedBody)) {
      // Create new transport for initialize request
      transport = new StreamableHTTPServerTransport({
        onsessioninitialized: (sid) => {
          this.transports.set(sid, transport);
        },
        onclose: () => {
          this.transports.delete(sid);
        },
      });
      await this.server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      return;
    }
    // Handle with existing transport...
  }
}
```

### Impact

- ✅ Proper session isolation
- ✅ No race conditions between concurrent sessions
- ✅ Automatic cleanup of closed sessions
- ✅ Compliance with MCP SDK patterns
- ✅ Better error messages for invalid sessions

## Critical Bug Fix #2: SSE Transport Session Management

### Issue

The SSE transport handling had the **same bug pattern** - using module-level variables (`let transport` and `let transportReady`) that were shared across ALL SSE connections, causing:

- Only the last SSE connection working correctly
- Race conditions when multiple clients connect simultaneously
- `/messages` endpoint only working for the most recent connection
- Global console override affecting all connections

### Root Cause

Module-level variables (`let transport: SSEServerTransport | null = null;` and `let transportReady = false;`) were overwritten by each new SSE connection, breaking previous connections.

### Fix

Refactored to use per-session transport management:

1. **Transport Map**: Store transports in a `Map<string, SSEServerTransport>` keyed by session ID
2. **Per-Connection Transport**: Each `/sse` GET request creates its own transport instance
3. **Session Lookup**: `/messages` POST endpoint looks up transport by session ID
4. **Removed Global Console Override**: No longer globally overriding console methods (was causing conflicts)

### Code Changes

**Before:**

```typescript
let transport: SSEServerTransport | null = null;
let transportReady = false;

app.get('/sse', (req, res) => {
  transport = new SSEServerTransport('/messages', res);
  transportReady = false;
  // ... connect and set transportReady = true
});

app.post('/messages', (req, res) => {
  if (transport && transportReady) {
    await transport.handlePostMessage(req, res, req.body);
  }
});
```

**After:**

```typescript
const sseTransports: Map<string, SSEServerTransport> = new Map();

app.get('/sse', (req, res) => {
  const sessionId = `sse-${randomUUID()}`;
  const transport = new SSEServerTransport('/messages', res);
  sseTransports.set(sessionId, transport);
  
  transport.onclose = () => {
    sseTransports.delete(sessionId);
  };
  // ... connect
});

app.post('/messages', (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = sseTransports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  }
});
```

### Impact

- ✅ Multiple concurrent SSE connections work correctly
- ✅ Each connection has its own transport instance
- ✅ Proper session isolation
- ✅ No race conditions
- ✅ Automatic cleanup on connection close

## Bug Fix #3: Request ID Race Condition (Fixed)

### Issue

The `currentRequestId` variable in `safe-logger.ts` was a module-level variable that could be overwritten by concurrent requests. This followed the same pattern as the transport bugs.

### Root Cause

Module-level variable (`let currentRequestId: string | null = null;`) was shared across all requests. If `setRequestId()` or `generateRequestId()` were called from concurrent requests, they would overwrite each other's values.

### Fix

Refactored to use `AsyncLocalStorage` from Node.js `async_hooks` module:

1. **AsyncLocalStorage**: Provides thread-safe, per-async-context storage
2. **Context Isolation**: Each async operation gets its own request ID context
3. **Helper Functions**: Added `withRequestId()` and `withRequestIdAsync()` for proper async context management

### Code Changes

**Before:**

```typescript
let currentRequestId: string | null = null;

export function setRequestId(requestId: string | null): void {
  currentRequestId = requestId;
}

export function generateRequestId(): string {
  const requestId = randomUUID();
  currentRequestId = requestId;
  return requestId;
}
```

**After:**

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

const requestIdStorage = new AsyncLocalStorage<string | null>();

export function setRequestId(requestId: string | null): void {
  requestIdStorage.enterWith(requestId);
}

export function generateRequestId(): string {
  const requestId = randomUUID();
  requestIdStorage.enterWith(requestId);
  return requestId;
}

export function withRequestId<T>(requestId: string | null, fn: () => T): T {
  return requestIdStorage.run(requestId, fn);
}

export async function withRequestIdAsync<T>(
  requestId: string | null,
  fn: () => Promise<T>
): Promise<T> {
  return requestIdStorage.run(requestId, fn);
}
```

### Impact

- ✅ Thread-safe request ID tracking
- ✅ No race conditions with concurrent requests
- ✅ Proper async context isolation
- ✅ Backward compatible API
- ✅ Ready for use if request ID tracking is needed

### Code Location

- `./mcp-server/src/core/logging/safe-logger.ts`

## Other Improvements

### 1. Express Setup Modernization

- ✅ Using `createMcpExpressApp()` from SDK for DNS rebinding protection
- ✅ Proper Express configuration following SDK best practices

### 2. Header Handling

- ✅ Now reads `mcp-session-id` header (MCP standard)
- ✅ Falls back to `x-session-id` for backwards compatibility
- ✅ SSE uses query parameter `sessionId` for session lookup

### 3. Error Responses

- ✅ Returns proper MCP JSON-RPC error format
- ✅ Uses correct MCP error codes (-32000, -32001, -32603)

### 4. Cleanup

- ✅ Properly closes all active transports on cleanup
- ✅ Prevents memory leaks
- ✅ Automatic cleanup on connection close

## Testing Updates

Updated tests to match new API:

- `isTransportConnected()` → `getActiveSessionCount()`
- `getTransport()` → `getTransport(sessionId)`
- Tests now verify per-session transport management

## References

- [MCP SDK Example](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/examples/server/simpleStreamableHttp.ts)
- [MCP SSE Example](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/examples/server/simpleSseServer.ts)
- [MCP Specification](https://modelcontextprotocol.io/specification/draft)
