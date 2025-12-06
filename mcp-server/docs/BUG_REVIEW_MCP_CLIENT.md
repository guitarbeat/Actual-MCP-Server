# MCP Client Bug Review - December 2025

## Overview
Comprehensive review of bugs that can occur when using an MCP client with the Actual Budget MCP server.

## Bugs Found and Fixed

### 🔴 Critical Bug #1: SSE Session ID Mismatch (Memory Leak)
**Location:** `src/index.ts:342-382`

**Problem:**
- Transport was stored using `actualSessionId` (from SDK's internal session ID)
- Cleanup handlers used `sessionId` (locally generated UUID)
- This mismatch caused transports to never be cleaned up, leading to memory leaks

**Impact:**
- Memory leaks with long-running servers
- Transports accumulate over time
- Potential performance degradation

**Fix:**
- Use `actualSessionId` consistently throughout all cleanup handlers
- Updated `onclose` callback, error handler, and `res.on('close')` handler

**Code Change:**
```typescript
// Before: Mixed usage of sessionId and actualSessionId
sseTransports.set(actualSessionId, transport);
transport.onclose = () => {
  sseTransports.delete(sessionId); // ❌ Wrong key!
};

// After: Consistent usage of actualSessionId
sseTransports.set(actualSessionId, transport);
transport.onclose = () => {
  sseTransports.delete(actualSessionId); // ✅ Correct key
};
```

---

### 🟡 Bug #2: Race Condition in StreamableHTTPHandler Session Initialization
**Location:** `src/core/transport/streamable-http-handler.ts:53-59`

**Problem:**
- `onsessioninitialized` callback accessed `transport` variable
- If callback executed asynchronously after function scope, `transport` could be undefined
- This could cause sessions to not be stored properly

**Impact:**
- Sessions might not be registered correctly
- Subsequent requests could fail with "Invalid session" errors
- Intermittent failures depending on timing

**Fix:**
- Use closure reference (`transportRef`) to ensure transport is always accessible
- Store transport reference immediately after creation

**Code Change:**
```typescript
// Before: Direct variable access (race condition risk)
onsessioninitialized: (sid: string) => {
  if (transport) { // ❌ Might be undefined
    this.transports.set(sid, transport);
  }
}

// After: Closure reference (safe)
const transportRef = { current: undefined };
transport = new StreamableHTTPServerTransport({
  onsessioninitialized: (sid: string) => {
    if (transportRef.current) { // ✅ Always safe
      this.transports.set(sid, transportRef.current);
    }
  }
});
transportRef.current = transport;
```

---

### 🟡 Bug #3: Undefined Transport Reference in Cleanup Handler
**Location:** `src/core/transport/streamable-http-handler.ts:68-74`

**Problem:**
- Cleanup handler accessed `transport?.sessionId` directly
- If transport was cleared or undefined, cleanup would silently fail
- Could lead to sessions not being cleaned up

**Impact:**
- Memory leaks if cleanup fails silently
- Sessions might persist after transport closes

**Fix:**
- Use closure reference (`transportRef.current`) instead of direct variable access
- Ensures cleanup always has access to the correct transport instance

**Code Change:**
```typescript
// Before: Direct variable access
transport.onclose = () => {
  const sid = transport?.sessionId; // ❌ Might be undefined
  // ...
}

// After: Closure reference
transport.onclose = () => {
  const currentTransport = transportRef.current; // ✅ Safe access
  const sid = currentTransport?.sessionId;
  // ...
}
```

---

### 🟢 Bug #4: Missing Safety Check for Transport Availability
**Location:** `src/core/transport/streamable-http-handler.ts:122`

**Problem:**
- TypeScript couldn't guarantee `transport` was defined at runtime
- While logic flow should ensure it's set, no explicit check existed
- Could cause runtime errors if logic flow changes

**Impact:**
- Potential runtime errors if code is refactored incorrectly
- Type safety issue

**Fix:**
- Added explicit null check before using transport
- Return proper error response if transport is unexpectedly undefined

**Code Change:**
```typescript
// Before: Assumed transport exists
if (transport) {
  await transport.handleRequest(req, res, parsedBody);
}

// After: Explicit safety check
if (!transport) {
  // Return error response
  return;
}
await transport.handleRequest(req, res, parsedBody);
```

---

### 🟢 Bug #5: Budget Error Not Recognized as Connection Error
**Location:** `src/actual-api.ts:368-377, 67-79`

**Problem:**
- "No budget file is open" error wasn't recognized as requiring re-initialization
- Health check didn't detect budget closure
- Errors would propagate to client instead of triggering recovery

**Impact:**
- Client requests fail with "No budget file is open" errors
- No automatic recovery when budget is lost
- Requires manual server restart

**Fix:**
- Added "no budget file is open" and "budget file" to connection error detection
- Health check now detects budget closure
- Triggers automatic re-initialization and budget reload

**Code Change:**
```typescript
// Before: Budget errors not detected
function isConnectionError(errorMessage: string): boolean {
  return (
    errorMessage.includes('not connected') ||
    // ... other checks
    // ❌ Missing budget error detection
  );
}

// After: Budget errors detected
function isConnectionError(errorMessage: string): boolean {
  return (
    errorMessage.includes('not connected') ||
    // ... other checks
    errorMessage.includes('no budget file is open') || // ✅ Added
    errorMessage.includes('budget file') // ✅ Added
  );
}
```

---

## Additional Issues Reviewed (No Fix Needed)

### ✅ Concurrent Initialization Handling
**Status:** Already properly handled

The code uses a busy-wait pattern for concurrent initialization:
```typescript
if (initializing) {
  while (initializing) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (initializationError) throw initializationError;
  return true;
}
```

This is acceptable because:
- Initialization is infrequent
- Prevents race conditions
- Ensures only one initialization occurs at a time

### ✅ Error Handling in Transport Cleanup
**Status:** Already properly handled

All cleanup handlers have try-catch blocks:
```typescript
try {
  const t = sseTransports.get(sessionId);
  if (t) {
    t.close();
  }
} catch (_e) {
  // Ignore cleanup errors
}
```

This prevents cleanup failures from crashing the server.

### ✅ DNS Rebinding Warning
**Status:** Informational only

The warning about DNS rebinding protection is expected when:
- Binding to `0.0.0.0` for production
- Bearer authentication provides security instead

The warning is harmless and can be suppressed by configuring `allowedHosts` when bearer auth is enabled.

---

## Testing Recommendations

1. **Memory Leak Test:**
   - Create multiple SSE connections
   - Close them and verify cleanup
   - Monitor memory usage over time

2. **Concurrent Request Test:**
   - Send multiple requests simultaneously
   - Verify all sessions are handled correctly
   - Check for race conditions

3. **Budget Recovery Test:**
   - Simulate budget closure
   - Verify automatic recovery
   - Check that subsequent requests succeed

4. **Session Management Test:**
   - Create sessions with both transports
   - Verify proper cleanup on disconnect
   - Test session reuse

---

## Summary

**Bugs Fixed:** 5
- 1 Critical (Memory Leak)
- 2 Medium (Race Conditions)
- 2 Low (Safety Checks)

**Impact:**
- Prevents memory leaks
- Improves session management reliability
- Enables automatic budget recovery
- Enhances error handling robustness

All fixes maintain backward compatibility and follow existing code patterns.
