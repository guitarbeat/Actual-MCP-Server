# Debugging Report

## Overview
This report details the findings from a comprehensive debugging session of the `actual-mcp` codebase. The session included running unit tests, linting, type checking, and deep-dive investigation into connection instability issues.

## 1. Connection Instability & Test Failures
**Status:** Fixed
**File:** `mcp-server/src/core/transport/streamable-http-handler.ts` and `mcp-server/src/core/transport/streamable-http-handler.test.ts`

### Findings
1.  **Header Mismatch:**
    - The server entry point (`src/index.ts`) checks for both `mcp-session-id` and `x-session-id` headers to identify sessions.
    - The `StreamableHTTPHandler` implementation only checked `mcp-session-id`.
    - **Impact:** Clients using `x-session-id` (a common convention) would successfully initialize (as initialization doesn't require a session ID), but subsequent requests would fail with "Bad Request: No valid session ID provided" because the handler couldn't find the session ID in the headers. This causes a constant reconnection loop.

2.  **Runtime Error in Handler:**
    - The handler accessed `req.headers['mcp-session-id']` without checking if `req.headers` existed.
    - **Impact:** In scenarios where `req.headers` might be undefined (unlikely in production Express apps but possible in raw node or tests), this would throw a `TypeError`.

3.  **Broken Unit Tests:**
    - The property-based tests in `streamable-http-handler.test.ts` were failing with `AssertionError: expected 0 to be greater than 0`.
    - **Cause:** The tests were sending "Initialize" requests without a valid JSON-RPC body. The handler logic correctly rejected these (returning 400), resulting in no session being created. The tests then asserted that a session *was* created.

### Fixes Implemented
1.  **Code Update (`streamable-http-handler.ts`):**
    - Updated `handleRequest` to check both `mcp-session-id` and `x-session-id`.
    - Added a safety check `req.headers || {}` to prevent TypeErrors.
    ```typescript
    const headers = req.headers || {};
    const sessionId =
      (headers['mcp-session-id'] as string | undefined) ||
      (headers['x-session-id'] as string | undefined);
    ```

2.  **Test Update (`streamable-http-handler.test.ts`):**
    - Updated tests to send a valid JSON-RPC `initialize` payload.
    - Updated checks to handle header propagation.

## 2. TypeScript Errors
**Status:** Many Errors
**File:** `mcp-server/src/tools/index.ts` (and others)
**Key Issues:**
- **ToolInput Schema Mismatch:** `ToolInput` type used in tool definitions lacks the `type` property required by the `ToolDefinition` interface.
- **Argument Type Incompatibility:** Handler functions use specific argument types while the interface expects `Record<string, unknown>`.

### Recommendation
- **Fix ToolInput:** Ensure all tool schemas explicitly include `type: 'object'`.
- **Harmonize Handler Signatures:** Use Zod parsing inside handlers to validate `Record<string, unknown>` into typed arguments.

## 3. Linting Issues
**Status:** 247 Warnings
**Key Issues:**
- High nesting depth and function complexity.
- Usage of `any`.

### Recommendation
- Refactor complex functions into smaller helpers.
- Replace `any` with specific types.

## Conclusion
The critical issue causing "constant connection" problems was likely the missing support for `x-session-id` in the `StreamableHTTPHandler`. This has been fixed. The unit tests have also been patched to correctly simulate the connection lifecycle.
