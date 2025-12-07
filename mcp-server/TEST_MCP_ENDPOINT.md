# Testing the /mcp Streamable HTTP Endpoint

The `/mcp` endpoint uses the modern Streamable HTTP transport protocol for MCP.

## Endpoint Details

- **URL**: `http://localhost:3000/mcp`
- **Transport**: Streamable HTTP (Server-Sent Events)
- **Authentication**: Bearer token required
- **Content-Type**: `application/json`
- **Accept**: `application/json, text/event-stream` (required)

## Test Results

✅ **All tests passed!**

1. **Session Initialization** - ✓ Working
2. **Tools Listing** - ✓ Working (10 tools available)
3. **Tool Execution** - ✓ Working (get-accounts returned 18 accounts)

## Usage Flow

### Step 1: Initialize Session

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Response**: Returns `mcp-session-id` header with a UUID session ID.

### Step 2: Use Session ID for Subsequent Requests

```bash
SESSION_ID="your-session-id-from-step-1"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Step 3: Call Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get-accounts",
      "arguments": {}
    }
  }'
```

## Response Format

Responses use Server-Sent Events (SSE) format:

```
event: message
data: {"result": {...}, "jsonrpc": "2.0", "id": 1}
```

## Available Tools

The test confirmed 10 tools are available:

1. `get-transactions` - Query transaction history
2. `spending-by-category` - Spending breakdown
3. `monthly-summary` - Financial overview
4. `balance-history` - Account balance trends
5. `get-accounts` - List accounts with balances
6. `get-grouped-categories` - Category structure
7. `get-payees` - List merchants/payees
8. `get-rules` - Auto-categorization rules
9. `get-account-balance` - Single account balance
10. `get-budget-month` - Budget details for a month

## Test Script

A test script is available at `test-mcp.sh`:

```bash
cd mcp-server
./test-mcp.sh
```

## Notes

- **Session Management**: Each session gets its own transport instance
- **Session ID Header**: Use `mcp-session-id` header (MCP standard) or `x-session-id` (fallback)
- **Bearer Auth**: Required for all requests when `--enable-bearer` flag is used
- **SSE Streaming**: Responses are streamed as Server-Sent Events for real-time updates

