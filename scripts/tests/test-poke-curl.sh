#!/bin/bash
# Test that simulates Poke MCP behavior using curl
# - One URL: /sse endpoint  
# - One Bearer token for authentication
# - Connects to SSE, extracts connection ID, sends messages

set -e

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
BEARER_TOKEN="${BEARER_TOKEN:-}"
if [ -z "$BEARER_TOKEN" ]; then
    echo "Error: BEARER_TOKEN environment variable is required"
    echo "Usage: BEARER_TOKEN=your-token $0"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testing MCP Server (Poke MCP Simulation)"
echo "Server URL: $SERVER_URL"
echo "Using Bearer token: ${BEARER_TOKEN:0:20}..."
echo ""

PASSED=0
FAILED=0

test_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

test_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

# Test 1: Connect to SSE endpoint and extract connection ID
echo "Step 1: Connecting to SSE endpoint with Bearer token..."
SSE_OUTPUT_FILE="/tmp/sse-output-$$.txt"
curl -s -N -H "Authorization: Bearer $BEARER_TOKEN" -H "Accept: text/event-stream" "$SERVER_URL/sse" > "$SSE_OUTPUT_FILE" 2>&1 &
SSE_PID=$!

# Wait for connection to establish and receive initial events
sleep 3

# Extract connection ID while connection is still alive
CONNECTION_ID=$(grep -o '"connectionId":"[^"]*"' "$SSE_OUTPUT_FILE" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$CONNECTION_ID" ]; then
    test_pass "SSE connection established"
    echo "   Connection ID: $CONNECTION_ID"
else
    test_fail "Could not extract connection ID from SSE stream"
    echo "   SSE output preview:"
    head -10 "$SSE_OUTPUT_FILE" 2>/dev/null || echo "   No output captured"
    CONNECTION_ID="test-connection-id-for-testing"
    kill $SSE_PID 2>/dev/null || true
    rm -f "$SSE_OUTPUT_FILE"
fi

# Test 2: Send message with connection ID (while SSE connection is still active)
if [ -n "$CONNECTION_ID" ] && [ "$CONNECTION_ID" != "test-connection-id-for-testing" ]; then
    echo ""
    echo "Step 2: Sending message to /messages with connection ID..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $BEARER_TOKEN" \
        -H "X-MCP-Connection-ID: $CONNECTION_ID" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"poke-mcp-test","version":"1.0.0"}},"id":1}' \
        "$SERVER_URL/messages")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
        test_pass "Message routing with connection ID (status: $HTTP_CODE)"
        if echo "$BODY" | grep -q "protocolVersion"; then
            echo "   Server responded with protocol version"
        elif [ "$HTTP_CODE" = "202" ]; then
            echo "   Message accepted (202) - response will come via SSE stream"
        fi
    elif [ "$HTTP_CODE" = "404" ]; then
        test_fail "Transport not found (connection may have closed)"
    else
        test_fail "Unexpected status: $HTTP_CODE"
        echo "   Response: $BODY"
    fi
    
    # Now we can close the SSE connection
    kill $SSE_PID 2>/dev/null || true
    wait $SSE_PID 2>/dev/null || true
    rm -f "$SSE_OUTPUT_FILE"
else
    echo ""
    echo "Skipping message routing test (no valid connection ID)"
    kill $SSE_PID 2>/dev/null || true
    rm -f "$SSE_OUTPUT_FILE"
fi

# Test 3: Test message without connection ID (should fail)
echo ""
echo "Step 3: Testing message without connection ID (should return 400)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":2}' \
    "$SERVER_URL/messages")

if [ "$HTTP_CODE" = "400" ]; then
    test_pass "Message without connection ID correctly rejected (400)"
else
    test_fail "Expected 400, got $HTTP_CODE"
fi

# Summary
echo ""
echo "Test Summary:"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}❌ Failed: $FAILED${NC}"
    echo ""
    echo "All Poke MCP simulation tests passed! 🎉"
    exit 0
fi

