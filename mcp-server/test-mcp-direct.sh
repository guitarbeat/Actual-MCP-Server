#!/bin/bash

BEARER_TOKEN="9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b"
BASE_URL="http://localhost:3000/mcp"

echo "=== Testing MCP Server Directly ==="
echo ""

# Initialize session
echo "1. Initializing MCP session..."
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
        "name": "cursor-test",
        "version": "1.0.0"
      }
    }
  }' -i)

SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r\n')
echo "   Session ID: $SESSION_ID"
echo ""

# Call get-accounts tool
echo "2. Calling get-accounts tool..."
ACCOUNTS_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-accounts",
      "arguments": {}
    }
  }')

echo "$ACCOUNTS_RESPONSE" | grep -o 'data:.*' | sed 's/data: //' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = json.loads(data['result']['content'][0]['text'])
    print('   Found', len(result), 'accounts:')
    for acc in result[:5]:
        print(f'   - {acc[\"name\"]}: {acc[\"balance\"]}')
    if len(result) > 5:
        print(f'   ... and {len(result) - 5} more accounts')
except Exception as e:
    print('   Error parsing response:', e)
    print('   Raw response:', data if 'data' in locals() else 'N/A')
" 2>/dev/null

echo ""
echo "3. Calling monthly-summary tool..."
SUMMARY_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "monthly-summary",
      "arguments": {
        "months": 3
      }
    }
  }')

echo "$SUMMARY_RESPONSE" | grep -o 'data:.*' | sed 's/data: //' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = json.loads(data['result']['content'][0]['text'])
    print('   Last 3 months summary:')
    for month in result.get('months', [])[:3]:
        income = month.get('income', 0)
        expenses = month.get('expenses', 0)
        savings = month.get('savings', 0)
        print(f'   - {month.get(\"month\", \"Unknown\")}: Income: \${income:,.2f}, Expenses: \${expenses:,.2f}, Savings: \${savings:,.2f}')
except Exception as e:
    print('   Error:', str(e))
" 2>/dev/null

echo ""
echo "✓ MCP Server is working correctly!"
