#!/bin/bash
# Test deployed MCP server using MCP Inspector
# Usage: ./scripts/test-deployed-server.sh [server-url]

set -e

# Default to the Easy Panel domain from config
DEPLOYED_URL="${1:-https://personal-actualbudget-mcp.imklj5.easypanel.host}"
BEARER_TOKEN="${BEARER_TOKEN:-9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b}"

echo "🔍 Testing Deployed MCP Server"
echo "════════════════════════════════════════════════════════════"
echo "Server URL: $DEPLOYED_URL"
echo ""

# Test 1: Basic connectivity
echo "1️⃣ Testing basic connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_URL/" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Server is responding (HTTP $HTTP_CODE)"
else
    echo "   ❌ Server not responding (HTTP $HTTP_CODE)"
    echo "   This could mean:"
    echo "   - Server is not running"
    echo "   - Port is not exposed"
    echo "   - Firewall blocking access"
    exit 1
fi

# Test 2: Check root endpoint content
echo ""
echo "2️⃣ Checking server info..."
ROOT_RESPONSE=$(curl -s "$DEPLOYED_URL/")
if echo "$ROOT_RESPONSE" | grep -q "Actual Budget MCP Server"; then
    echo "   ✅ Server info page accessible"
    echo "$ROOT_RESPONSE" | head -5
else
    echo "   ⚠️  Unexpected response from root endpoint"
    echo "$ROOT_RESPONSE" | head -10
fi

# Test 3: Test MCP endpoint (if bearer auth is enabled)
echo ""
echo "3️⃣ Testing MCP endpoint..."
MCP_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
    "$DEPLOYED_URL/mcp" 2>&1)

HTTP_CODE=$(echo "$MCP_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$MCP_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ MCP endpoint responding"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "   ⚠️  Authentication required (HTTP 401)"
    echo "   This is expected if bearer auth is enabled"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "503" ]; then
    echo "   ⚠️  Service unavailable (HTTP 503)"
    echo "   Server may be starting up or transport not ready"
    echo "   Response: $BODY"
else
    echo "   ❌ MCP endpoint error (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
fi

# Test 4: Test SSE endpoint
echo ""
echo "4️⃣ Testing SSE endpoint..."
SSE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    "$DEPLOYED_URL/sse" 2>&1 | head -20)

HTTP_CODE=$(echo "$SSE_RESPONSE" | grep "HTTP_CODE" | tail -1 | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "" ]; then
    echo "   ✅ SSE endpoint accessible"
    echo "$SSE_RESPONSE" | grep -v "HTTP_CODE" | head -5
else
    echo "   ⚠️  SSE endpoint returned HTTP $HTTP_CODE"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "💡 Next Steps:"
echo ""
echo "To use MCP Inspector with the deployed server:"
echo ""
echo "1. Set environment variables:"
echo "   export ACTUAL_SERVER_URL=https://actual.alw.lol"
echo "   export ACTUAL_PASSWORD='ninI0112@'"
echo "   export ACTUAL_BUDGET_SYNC_ID=7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35"
echo ""
echo "2. Use MCP Inspector with HTTP transport:"
echo "   npx @modelcontextprotocol/inspector \\"
echo "     --transport http \\"
echo "     --url $DEPLOYED_URL/mcp \\"
echo "     -H 'Authorization: Bearer $BEARER_TOKEN'"
echo ""
echo "Or test locally and point to deployed server by modifying"
echo "the server code to use the deployed URL as a proxy."
