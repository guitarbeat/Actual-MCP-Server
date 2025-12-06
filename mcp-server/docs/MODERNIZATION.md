# MCP Server Modernization Summary

## Overview

This document summarizes the modernization efforts to align with the latest MCP SDK (v1.24.3) and Actual Budget API (v25.12.0) best practices.

## Package Updates

### @modelcontextprotocol/sdk
- **Previous**: `^1.12.0`
- **Current**: `^1.24.3`
- **Status**: ✅ Updated and tested

### @actual-app/api
- **Previous**: `25.9.0`
- **Current**: `^25.12.0`
- **Status**: ✅ Updated and tested

### express
- **Previous**: `^5.1.0`
- **Current**: `^5.2.1`
- **Status**: ✅ Updated

## Modernization Changes

### 1. Express Setup Modernization

**Before:**
```typescript
const app = express();
app.use(express.json());
```

**After:**
```typescript
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';

const app = createMcpExpressApp({
  host: '0.0.0.0', // Allow binding to all interfaces for production
  // DNS rebinding protection is handled via bearer authentication
});
```

**Benefits:**
- ✅ Automatic DNS rebinding protection for localhost hosts
- ✅ Pre-configured Express setup following MCP SDK best practices
- ✅ Better security defaults

**Note:** We bind to `0.0.0.0` for production deployments, so DNS rebinding protection is handled via bearer authentication rather than host header validation.

### 2. Type Safety Improvements

Fixed multiple TypeScript errors introduced by API updates:

- ✅ Updated `getCategories()` to filter category groups (API now returns union type)
- ✅ Fixed `getAccountBalance()` to convert string dates to Date objects
- ✅ Enhanced `createPayee()` with proper type validation
- ✅ Updated all API function type casts for compatibility
- ✅ Fixed MCP SDK response type handling (added type guards for `.text` property)

### 3. API Compatibility

#### Actual Budget API Changes
- BudgetFile type now requires additional properties (`groupId`, `encryptKeyId`, etc.)
- `getCategories()` returns union type (categories + category groups)
- `getAccountBalance()` now expects Date objects instead of strings
- Various create/update methods have stricter type requirements

#### MCP SDK Changes
- Response content types are now discriminated unions requiring type guards
- Express helpers available via `createMcpExpressApp()`
- Improved session management in StreamableHTTPServerTransport

## Architecture Decisions

### Why We're Still Using `Server` Instead of `McpServer`

The SDK provides two server classes:
- `Server`: Low-level, full control
- `McpServer`: High-level wrapper with simpler APIs

**Current Choice:** `Server`

**Reasoning:**
- ✅ We already have a working implementation with `Server`
- ✅ `McpServer` is a wrapper around `Server` - no functional difference
- ✅ Our custom `StreamableHTTPHandler` works well with `Server`
- ✅ Migration would require significant refactoring with minimal benefit
- ✅ `Server` gives us more control over request handling

**Future Consideration:** If we need features like the simplified `registerTool()` API or experimental tasks, we can migrate to `McpServer` incrementally.

### Transport Strategy

**Current:** Dual transport support
- ✅ Streamable HTTP (modern, recommended)
- ✅ SSE (legacy, for backwards compatibility)
- ✅ Stdio (for local development)

**Modernization:** Using SDK's `createMcpExpressApp()` for Express setup while maintaining our custom transport handlers for flexibility.

## Security Improvements

1. **DNS Rebinding Protection**: Now handled by `createMcpExpressApp()` for localhost hosts
2. **Bearer Authentication**: Required for production deployments
3. **CORS**: Configured for browser-based clients (Poke MCP)

## Testing Status

- ✅ All TypeScript errors resolved
- ✅ Type checking passes
- ✅ Test mocks updated for new API types
- ✅ Backwards compatibility maintained

## Migration Notes

### Breaking Changes Handled

1. **BudgetFile Type**: Updated all test mocks with `as any` casting (API type is more complex than needed for tests)
2. **Response Types**: Added type guards for all MCP response content access
3. **API Method Signatures**: Updated function calls to match new API requirements

### Non-Breaking Improvements

- Express setup modernization (backwards compatible)
- Enhanced type safety
- Better error handling

## Future Modernization Opportunities

1. **Consider `McpServer`**: If we want simpler tool registration APIs
2. **Experimental Tasks**: SDK supports task-based execution for long-running operations
3. **Sampling & Elicitation**: SDK supports server-side LLM sampling and form elicitation
4. **OAuth Support**: SDK has built-in OAuth helpers (we currently use bearer tokens)

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/specification/draft)
- [Actual Budget API](https://github.com/actualbudget/actual)

## Version Compatibility

- **Node.js**: >= 22.0.0 (upgraded from 20.0.0)
- **@modelcontextprotocol/sdk**: ^1.24.3
- **@actual-app/api**: ^25.12.0
- **express**: ^5.2.1

All packages are at their latest stable versions as of December 2025.
