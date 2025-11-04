# Add comprehensive actual.* JSON-RPC method handlers

## Summary

This PR adds comprehensive JSON-RPC method handlers for the Actual Budget API, allowing direct access to budget data via `actual.*` methods. This resolves the "Method not found" error when calling `actual.listBudgets` and enables direct JSON-RPC access to Actual Budget API data.

## Changes

### Methods Added

1. **actual.listBudgets** - Get list of all available budgets
2. **actual.getAccounts** - Get all accounts
3. **actual.getCategories** - Get all categories
4. **actual.getCategoryGroups** - Get all category groups
5. **actual.getPayees** - Get all payees
6. **actual.getRules** - Get all rules
7. **actual.getPayeeRules** - Get rules for a specific payee (requires `payeeId` param)
8. **actual.getTransactions** - Get transactions for an account (requires `accountId`, `start`, `end` params)
9. **actual.getAccountBalance** - Get account balance (requires `accountId`, optional `date` param)
10. **actual.getBudgetMonths** - Get list of budget months
11. **actual.getBudgetMonth** - Get budget data for a specific month (requires `month` param)
12. **actual.getSchedules** - Get all schedules
13. **actual.getServerVersion** - Get server version

### Implementation Details

- ✅ Custom method handler intercepts `actual.*` methods before MCP transport
- ✅ Works on both `/mcp` and `/messages` endpoints
- ✅ Proper parameter validation with JSON-RPC 2.0 error codes:
  - `-32601`: Method not found
  - `-32602`: Invalid params
  - `-32603`: Internal error
- ✅ Each request properly initializes and shuts down the Actual API
- ✅ All methods return proper JSON-RPC 2.0 responses

### Code Quality

- ✅ TypeScript compilation successful
- ✅ No linter errors
- ✅ Follows existing code patterns and conventions

## Testing

After deployment, methods can be tested via:

```bash
# List budgets
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
"https://<host>/messages?sessionId=<id>" \
-d '{"jsonrpc":"2.0","id":1,"method":"actual.listBudgets","params":{}}'

# Get accounts
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
"https://<host>/messages?sessionId=<id>" \
-d '{"jsonrpc":"2.0","id":2,"method":"actual.getAccounts","params":{}}'

# Get transactions
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
"https://<host>/messages?sessionId=<id>" \
-d '{"jsonrpc":"2.0","id":3,"method":"actual.getTransactions","params":{"accountId":"acc-123","start":"2024-01-01","end":"2024-12-31"}}'

# Get account balance
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
"https://<host>/messages?sessionId=<id>" \
-d '{"jsonrpc":"2.0","id":4,"method":"actual.getAccountBalance","params":{"accountId":"acc-123","date":"2024-12-31"}}'
```

## Fixes

- Resolves "Method not found" error when calling `actual.listBudgets`
- Enables direct JSON-RPC access to Actual Budget API data
- Compatible with EasyPanel + Nixpacks deployment configuration

## Related

Based on Actual Budget API reference: https://actualbudget.org/docs/api/reference/
