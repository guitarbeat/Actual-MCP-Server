#!/bin/bash
# Use MCP Inspector to test the deployed server
# This creates a local proxy that connects to the deployed server

set -e

DEPLOYED_URL="${1:-https://personal-actualbudget-mcp.imklj5.easypanel.host}"
BEARER_TOKEN="${BEARER_TOKEN:-9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b}"

echo "🔍 MCP Inspector Test for Deployed Server"
echo "════════════════════════════════════════════════════════════"
echo "Deployed Server: $DEPLOYED_URL"
echo ""

# First, test if server is accessible
echo "Testing server connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_URL/" || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Server not accessible (HTTP $HTTP_CODE)"
    echo ""
    echo "Possible issues:"
    echo "1. Server is not running - check Easy Panel logs"
    echo "2. Port 3000 is not exposed - check Easy Panel port configuration"
    echo "3. Firewall blocking - check network settings"
    echo "4. Wrong URL - verify domain in Easy Panel"
    exit 1
fi

echo "✅ Server is accessible"
echo ""

# Check if we can use the MCP Inspector with HTTP transport
echo "Note: MCP Inspector typically works with stdio transport."
echo "For HTTP/SSE transport, you may need to:"
echo ""
echo "1. Test the server directly with curl:"
echo "   curl -H 'Authorization: Bearer $BEARER_TOKEN' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -X POST \\"
echo "        -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}' \\"
echo "        $DEPLOYED_URL/mcp"
echo ""
echo "2. Or use a local proxy script (see test-deployed-server.sh)"
echo ""
echo "3. Check Easy Panel logs for:"
echo "   - Server startup messages"
echo "   - Connection errors"
echo "   - Initialization failures"
echo ""

# Try to get server info
echo "Fetching server info..."
curl -s "$DEPLOYED_URL/" | grep -A 10 "Actual Budget" || echo "Could not parse server info"

echo ""
echo "════════════════════════════════════════════════════════════"
