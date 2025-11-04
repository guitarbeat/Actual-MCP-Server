#!/bin/bash
# Test script for local SSE server testing

set -e

BEARER_TOKEN="${BEARER_TOKEN:-}"
if [ -z "$BEARER_TOKEN" ]; then
    echo "Error: BEARER_TOKEN environment variable is required"
    echo "Usage: BEARER_TOKEN=your-token $0"
    exit 1
fi
SERVER_URL="http://localhost:3000"
SERVER_PID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo ""
        echo "Cleaning up server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

echo "🧪 Starting MCP Server Tests"
echo ""

# Start server in background with environment variables
echo "Starting server..."
BEARER_TOKEN="$BEARER_TOKEN" node build/index.js --sse --enable-write --enable-bearer > /tmp/mcp-server-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 3

# Test 1: Root endpoint
echo ""
echo "Test 1: Root endpoint"
if curl -s "$SERVER_URL/" | grep -q "Actual Budget MCP Server"; then
    echo -e "${GREEN}✅ Root endpoint works${NC}"
else
    echo -e "${RED}❌ Root endpoint failed${NC}"
fi

# Test 2: Favicon
echo ""
echo "Test 2: Favicon endpoint"
FAVICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/favicon.ico")
if [ "$FAVICON_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Favicon endpoint works (status: $FAVICON_STATUS)${NC}"
else
    echo -e "${RED}❌ Favicon endpoint failed (status: $FAVICON_STATUS)${NC}"
fi

# Test 3: SSE connection and connection ID
echo ""
echo "Test 3: SSE connection and connection ID"
echo "Connecting to SSE endpoint (will timeout after 5 seconds)..."

# Use a background process to capture SSE output
(
    curl -s -N -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/sse" 2>&1 | head -20 > /tmp/sse-output.txt
) &
SSE_PID=$!

sleep 5

# Check if we got connection event
if grep -q "event: connection" /tmp/sse-output.txt 2>/dev/null; then
    CONNECTION_ID=$(grep "data:" /tmp/sse-output.txt | head -1 | grep -o '"connectionId":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -n "$CONNECTION_ID" ]; then
        echo -e "${GREEN}✅ SSE connection established${NC}"
        echo "   Connection ID: $CONNECTION_ID"
    else
        echo -e "${YELLOW}⚠️  Connection event found but no connection ID extracted${NC}"
    fi
else
    echo -e "${RED}❌ No connection event received${NC}"
    echo "SSE output:"
    cat /tmp/sse-output.txt 2>/dev/null || echo "No output"
fi

kill $SSE_PID 2>/dev/null || true

# Test 4: Check server logs for errors
echo ""
echo "Test 4: Server logs check"
if grep -q "Error connecting SSE transport" /tmp/mcp-server-test.log 2>/dev/null; then
    echo -e "${RED}❌ Found errors in server logs:${NC}"
    grep "Error connecting SSE transport" /tmp/mcp-server-test.log | tail -3
elif grep -q "Headers already sent" /tmp/mcp-server-test.log 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found header warnings in logs:${NC}"
    grep "Headers already sent" /tmp/mcp-server-test.log | tail -3
else
    echo -e "${GREEN}✅ No errors found in server logs${NC}"
fi

# Show recent logs
echo ""
echo "Recent server output:"
tail -10 /tmp/mcp-server-test.log 2>/dev/null || echo "No logs"

echo ""
echo "✅ Tests completed"

