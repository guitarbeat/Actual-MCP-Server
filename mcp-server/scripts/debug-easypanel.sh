#!/bin/bash
# Debug script for Easy Panel deployment
# Run this locally to test connectivity and configuration

set -e

echo "🔍 Easy Panel Deployment Debugger"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ACTUAL_URL="${ACTUAL_SERVER_URL:-https://actual.alw.lol}"
MCP_URL="${MCP_URL:-https://personal-actualbudget-mcp.imklj5.easypanel.host}"
BEARER_TOKEN="${BEARER_TOKEN:-9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b}"

echo "📋 Configuration:"
echo "  Actual Budget URL: $ACTUAL_URL"
echo "  MCP Server URL: $MCP_URL"
echo ""

# Test 1: Actual Budget Server
echo "1️⃣ Testing Actual Budget Server ($ACTUAL_URL)..."
if curl -s -f -o /dev/null -w "HTTP %{http_code}" "$ACTUAL_URL/api/health" > /tmp/actual_test.txt 2>&1; then
    HTTP_CODE=$(cat /tmp/actual_test.txt | grep -o "HTTP [0-9]*" | cut -d' ' -f2)
    echo -e "   ${GREEN}✅ Actual Budget server is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ Cannot reach Actual Budget server${NC}"
    echo "   Response:"
    cat /tmp/actual_test.txt | head -5
    echo ""
    echo "   Possible issues:"
    echo "   - Server is down"
    echo "   - Firewall blocking"
    echo "   - Wrong URL"
fi
echo ""

# Test 2: MCP Server Root
echo "2️⃣ Testing MCP Server Root ($MCP_URL/)..."
MCP_ROOT=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$MCP_URL/" 2>&1)
HTTP_CODE=$(echo "$MCP_ROOT" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$MCP_ROOT" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "Actual Budget MCP Server"; then
        echo -e "   ${GREEN}✅ MCP server is running and responding${NC}"
        echo "$BODY" | grep -E "(title|h1|status)" | head -3
    else
        echo -e "   ${YELLOW}⚠️  Server responding but unexpected content${NC}"
        echo "$BODY" | head -10
    fi
else
    echo -e "   ${RED}❌ MCP server not responding correctly (HTTP $HTTP_CODE)${NC}"
    echo "   Response:"
    echo "$BODY" | head -10
    echo ""
    echo "   Possible issues:"
    echo "   - Service not running"
    echo "   - Port not exposed"
    echo "   - Wrong domain/port"
    echo "   - Service crashed on startup"
fi
echo ""

# Test 3: MCP Endpoint
echo "3️⃣ Testing MCP Endpoint ($MCP_URL/mcp)..."
MCP_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
    "$MCP_URL/mcp" 2>&1)

HTTP_CODE=$(echo "$MCP_RESPONSE" | grep "HTTP_CODE" | tail -1 | cut -d: -f2)
BODY=$(echo "$MCP_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "tools"; then
        TOOL_COUNT=$(echo "$BODY" | jq '.result.tools | length' 2>/dev/null || echo "?")
        echo -e "   ${GREEN}✅ MCP endpoint working (found $TOOL_COUNT tools)${NC}"
        echo "$BODY" | jq '.result.tools[0:3] | .[].name' 2>/dev/null || echo "$BODY" | head -5
    else
        echo -e "   ${YELLOW}⚠️  Endpoint responding but unexpected format${NC}"
        echo "$BODY" | head -10
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${YELLOW}⚠️  Authentication required (HTTP 401)${NC}"
    echo "   This is expected if bearer auth is enabled"
    echo "   Verify BEARER_TOKEN matches Easy Panel env var"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "   ${YELLOW}⚠️  Service unavailable (HTTP 503)${NC}"
    echo "   Server may be starting up or transport not ready"
    echo "   Response: $BODY"
else
    echo -e "   ${RED}❌ MCP endpoint error (HTTP $HTTP_CODE)${NC}"
    echo "   Response:"
    echo "$BODY" | head -10
fi
echo ""

# Test 4: SSE Endpoint
echo "4️⃣ Testing SSE Endpoint ($MCP_URL/sse)..."
SSE_RESPONSE=$(timeout 3 curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $BEARER_TOKEN" \
    "$MCP_URL/sse" 2>&1 || echo "HTTP_CODE:000")

HTTP_CODE=$(echo "$SSE_RESPONSE" | grep "HTTP_CODE" | tail -1 | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "" ]; then
    echo -e "   ${GREEN}✅ SSE endpoint accessible${NC}"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${YELLOW}⚠️  Authentication required${NC}"
else
    echo -e "   ${YELLOW}⚠️  SSE endpoint returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "📊 Summary:"
echo ""
echo "Next steps:"
echo "1. Check Easy Panel logs for detailed error messages"
echo "2. Verify environment variables are set correctly"
echo "3. Ensure Actual Budget server is running"
echo "4. Verify port 3000 is exposed in Easy Panel"
echo ""
echo "Common issues to check in Easy Panel logs:"
echo "  - 'Failed to initialize Actual Budget API'"
echo "  - 'Cannot find module'"
echo "  - 'Port already in use'"
echo "  - 'Missing environment variables'"
echo "  - Connection timeouts"
echo ""
