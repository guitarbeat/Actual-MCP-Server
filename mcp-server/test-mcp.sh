#!/bin/bash

BEARER_TOKEN="9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b"
BASE_URL="http://localhost:3000/mcp"

echo "=== Testing MCP Streamable HTTP Transport ==="
echo ""

# Step 1: Initialize session
echo "1. Initializing session..."
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
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
  }' -i)

SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r\n')
echo "Session ID: $SESSION_ID"
echo ""

# Step 2: List tools
echo "2. Listing available tools..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | grep -o '"name":"[^"]*"' | head -10

echo ""
echo "3. Testing get-accounts tool..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get-accounts",
      "arguments": {}
    }
  }' | head -50

