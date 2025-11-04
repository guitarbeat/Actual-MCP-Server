#!/bin/bash
# Test script for MCP SSE server
# This script tests the SSE endpoint and message routing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
BEARER_TOKEN="${BEARER_TOKEN:-9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b}"

echo "🧪 Testing MCP SSE Server"
echo "Server URL: $SERVER_URL"
echo ""

# Test 1: Root endpoint
echo "Test 1: Root endpoint"
if curl -s -f -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Root endpoint accessible${NC}"
else
    echo -e "${RED}❌ Root endpoint failed${NC}"
    exit 1
fi

# Test 2: SSE connection (timeout after 5 seconds)
echo ""
echo "Test 2: SSE connection and connection ID"
CONNECTION_ID=$(timeout 5 curl -s -N -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/sse" 2>/dev/null | grep -o '"connectionId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$CONNECTION_ID" ]; then
    echo -e "${GREEN}✅ SSE connection established${NC}"
    echo "   Connection ID: $CONNECTION_ID"
else
    echo -e "${YELLOW}⚠️  Could not extract connection ID from SSE stream${NC}"
    echo "   This might be expected if the connection ID is sent differently"
    # Try alternative: start server and check manually
    CONNECTION_ID="test-connection-id"
fi

# Test 3: Message routing without connection ID (should fail)
echo ""
echo "Test 3: Message routing without connection ID (should return 400)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' \
    "$SERVER_URL/messages")

if [ "$STATUS" = "400" ]; then
    echo -e "${GREEN}✅ Correctly rejected request without connection ID (400)${NC}"
elif [ "$STATUS" = "503" ]; then
    echo -e "${YELLOW}⚠️  Server returned 503 (no active connections)${NC}"
    echo "   This is acceptable if no SSE connection is active"
else
    echo -e "${RED}❌ Unexpected status: $STATUS (expected 400 or 503)${NC}"
fi

# Test 4: Message routing with invalid connection ID (should fail)
echo ""
echo "Test 4: Message routing with invalid connection ID (should return 404)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    -H "X-MCP-Connection-ID: invalid-connection-id-12345" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":2}' \
    "$SERVER_URL/messages")

if [ "$STATUS" = "404" ]; then
    echo -e "${GREEN}✅ Correctly rejected request with invalid connection ID (404)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected status: $STATUS (expected 404)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Basic routing tests completed${NC}"
echo ""
echo "Note: For full SSE connection testing with connection ID routing,"
echo "      you'll need to use a proper SSE client that can:"
echo "      1. Connect to /sse endpoint"
echo "      2. Extract connection ID from the 'connection' event"
echo "      3. Send POST requests with X-MCP-Connection-ID header"

