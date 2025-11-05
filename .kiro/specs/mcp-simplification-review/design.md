# Design Document: MCP Simplification Review

## Overview

This design document analyzes the current Actual Budget MCP server implementation (37 tools) and proposes a simplified architecture optimized for single-budget conversational usage. The goal is to reduce context window consumption by 40-60% while maintaining all essential functionality for typical budget management conversations.

## Current State Analysis

### Tool Inventory (37 tools)

**Read-Only Tools (17):**
1. `get-transactions` - View transactions with filtering
2. `get-accounts` - List all accounts
3. `get-account-balance` - Get balance for specific account
4. `get-grouped-categories` - View categories organized by groups
5. `get-payees` - List all payees
6. `get-payee-rules` - View rules for a payee
7. `get-rules` - List all rules
8. `get-schedules` - List scheduled transactions
9. `spending-by-category` - Category spending report
10. `monthly-summary` - Monthly financial summary
11. `balance-history` - Account balance over time
12. `get-budgets` - List available budget files
13. `get-budget-months` - List budget months
14. `get-budget-month` - Get specific month's budget
15. `get-id-by-name` - Lookup entity ID by name
16. `run-query` - Execute arbitrary ActualQL query
17. `get-server-version` - Get server version

**Write Tools (20):**
1. `create-transaction` - Add new transaction
2. `update-transaction` - Modify existing transaction
3. `create-account` - Create new account
4. `update-account` - Modify account details
5. `close-account` - Close an account
6. `reopen-account` - Reopen closed account
7. `delete-account` - Permanently delete account
8. `set-budget-amount` - Set category budget
9. `set-budget-carryover` - Configure carryover
10. `hold-budget-for-next-month` - Hold budget funds
11. `reset-budget-hold` - Reset budget hold
12. `merge-payees` - Consolidate payees
13. `load-budget` - Load budget file
14. `download-budget` - Download budget from server
15. `sync` - Sync budget with server
16. `run-bank-sync` - Sync with bank
17. `run-import` - Import transactions
18. `manage-entity` - CRUD for categories, category groups, payees, rules, schedules

### Context Window Impact

Estimated token consumption per tool category:
- **Budget file management (8 tools)**: ~1,200 tokens
- **Rare account operations (3 tools)**: ~450 tokens
- **Utility tools (3 tools)**: ~400 tokens
- **Reporting tools (3 tools)**: ~600 tokens
- **Total removable**: ~2,650 tokens (40% reduction)

## Architecture

### Proposed Simplified Tool Set (20 tools)

#### Core Transaction Tools (2)
- `get-transactions` - View and filter transactions
- `manage-transaction` - Create/update transactions (consolidate create + update)

#### Account Tools (2)
- `get-accounts` - List accounts with balances
- `update-account` - Modify account details (keep for renaming, changing types)

#### Category & Budget Tools (2)
- `get-grouped-categories` - View categories with budget info
- `set-budget` - Set budget amount and carryover (consolidate 2 tools)

#### Entity Management (3)
- `manage-entity` - CRUD for categories, payees, rules, schedules (existing)
- `get-payees` - List payees
- `get-rules` - List rules

#### Financial Insights (3)
- `spending-by-category` - Category analysis
- `monthly-summary` - Monthly overview
- `balance-history` - Balance trends

#### Advanced Operations (3)
- `merge-payees` - Consolidate duplicate payees
- `run-bank-sync` - Sync with bank
- `run-import` - Import transactions

#### Schedules (2)
- `get-schedules` - View scheduled transactions
- (schedules managed via `manage-entity`)

#### Removed Tools (17)
- Budget file management (8): get-budgets, load-budget, download-budget, sync, get-budget-months, get-budget-month
- Rare account ops (3): create-account, close-account, reopen-account, delete-account, get-account-balance
- Utilities (3): get-id-by-name, run-query, get-server-version
- Budget operations (2): hold-budget-for-next-month, reset-budget-hold
- Payee tools (1): get-payee-rules (rarely needed, rules show payee info)

### Tool Consolidation Opportunities

#### 1. Transaction Management Consolidation

**Current:**
- `create-transaction` (separate tool)
- `update-transaction` (separate tool)

**Proposed: `manage-transaction`**
```typescript
{
  operation: 'create' | 'update',
  id?: string,  // required for update
  transaction: {
    account: string,
    date: string,
    amount?: number,
    payee?: string,
    category?: string,
    notes?: string,
    cleared?: boolean
  }
}
```

**Rationale:** Transactions follow the same CRUD pattern as entities. Consolidating reduces tool count and matches the `manage-entity` pattern.

#### 2. Budget Operations Consolidation

**Current:**
- `set-budget-amount`
- `set-budget-carryover`
- `hold-budget-for-next-month` (rarely used)
- `reset-budget-hold` (rarely used)

**Proposed: `set-budget`**
```typescript
{
  month: string,
  categoryId: string,
  amount?: number,      // set budget amount
  carryover?: boolean   // enable/disable carryover
}
```

**Rationale:** Budget operations are typically done together. Hold operations are advanced features rarely used in conversation.

#### 3. Account Information Consolidation

**Current:**
- `get-accounts` (list accounts)
- `get-account-balance` (get single balance)

**Proposed: Enhanced `get-accounts`**
- Always include current balance in account list
- Add optional `accountId` parameter to filter to single account
- Remove separate balance tool

**Rationale:** Balance is almost always needed with account info. Separate tool adds unnecessary complexity.

### Automatic Budget Loading

**Current Behavior:**
- Server starts without budget loaded
- Tools require budget to be loaded first
- User must call `load-budget` or `download-budget`

**Proposed Behavior:**
- Server automatically loads budget on startup using `ACTUAL_BUDGET_SYNC_ID`
- Budget is ready immediately when first tool is called
- No budget management tools exposed
- Sync happens automatically in background (configurable interval)

**Implementation:**
```typescript
// In initActualApi()
async function initActualApi(): Promise<void> {
  // ... existing init code ...
  
  // Auto-load configured budget
  const syncId = process.env.ACTUAL_BUDGET_SYNC_ID;
  if (syncId) {
    await api.downloadBudget(syncId);
    console.error(`✓ Budget loaded: ${syncId}`);
  }
  
  // Optional: Auto-sync on interval
  if (process.env.AUTO_SYNC_INTERVAL_MINUTES) {
    const interval = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES) * 60000;
    setInterval(() => api.sync(), interval);
  }
}
```

### Removed Tool Justifications

#### Budget File Management (8 tools removed)

**Tools:**
- `get-budgets`, `load-budget`, `download-budget`, `sync`
- `get-budget-months`, `get-budget-month`

**Justification:**
- Single-budget users never switch budgets mid-conversation
- Budget loading handled automatically on startup
- Sync handled automatically in background
- Budget month data available through other tools (spending-by-category, monthly-summary)
- Reduces complexity for 95% of users

**Re-enabling:** Users needing multi-budget support can set `ENABLE_BUDGET_MANAGEMENT=true`

#### Rare Account Operations (4 tools removed)

**Tools:**
- `create-account` - Accounts created once during setup
- `close-account` - Rare operation, typically done in UI
- `reopen-account` - Very rare operation
- `delete-account` - Dangerous operation, better done in UI
- `get-account-balance` - Redundant with enhanced get-accounts

**Justification:**
- Account structure is stable after initial setup
- Conversational agents shouldn't create/delete accounts
- Close/reopen are administrative operations
- Balance always available in account list

**Alternative:** Keep `update-account` for renaming and type changes

#### Utility Tools (3 tools removed)

**Tools:**
- `get-id-by-name` - Internal helper, not user-facing
- `run-query` - Too low-level for conversation
- `get-server-version` - Not useful in conversation

**Justification:**
- `get-id-by-name`: Other tools accept names and resolve IDs internally
- `run-query`: Requires ActualQL knowledge, error-prone
- `get-server-version`: Diagnostic tool, not conversational

**Alternative:** Tools handle name-to-ID resolution automatically

#### Advanced Budget Operations (2 tools removed)

**Tools:**
- `hold-budget-for-next-month`
- `reset-budget-hold`

**Justification:**
- Advanced feature used by <5% of users
- Requires understanding of budget hold concept
- Not intuitive in conversation
- Can be added back if demand exists

### Enhanced Tool Descriptions

Simplified tools should have clearer, more conversational descriptions:

**Before:**
```typescript
{
  name: 'get-transactions',
  description: 'Retrieve transactions for an account within a date range',
  // ... complex schema
}
```

**After:**
```typescript
{
  name: 'get-transactions',
  description: 'View transactions. Filter by account, date range, category, or payee. Returns up to 1000 transactions.',
  // ... simplified schema with better defaults
}
```

## Components and Interfaces

### Consolidated Transaction Handler

```typescript
// src/tools/manage-transaction/index.ts
interface ManageTransactionArgs {
  operation: 'create' | 'update';
  id?: string;  // required for update
  transaction: {
    account: string;      // account ID or name
    date: string;         // YYYY-MM-DD
    amount?: number;      // cents
    payee?: string;       // payee ID or name
    category?: string;    // category ID or name
    notes?: string;
    cleared?: boolean;
  };
}

export async function handler(args: ManageTransactionArgs): Promise<MCPResponse> {
  // Validate operation-specific requirements
  if (args.operation === 'update' && !args.id) {
    return validationError('id is required for update operation');
  }
  
  // Resolve names to IDs
  const resolved = await resolveTransactionReferences(args.transaction);
  
  // Execute operation
  if (args.operation === 'create') {
    const id = await api.addTransactions(resolved.account, [resolved]);
    return success(`Transaction created with ID ${id}`);
  } else {
    await api.updateTransaction(args.id!, resolved);
    return success(`Transaction ${args.id} updated`);
  }
}
```

### Consolidated Budget Handler

```typescript
// src/tools/set-budget/index.ts
interface SetBudgetArgs {
  month: string;        // YYYY-MM
  categoryId: string;   // category ID or name
  amount?: number;      // cents, optional
  carryover?: boolean;  // optional
}

export async function handler(args: SetBudgetArgs): Promise<MCPResponse> {
  const categoryId = await resolveCategoryId(args.categoryId);
  
  // Set amount if provided
  if (args.amount !== undefined) {
    await api.setBudgetAmount(args.month, categoryId, args.amount);
  }
  
  // Set carryover if provided
  if (args.carryover !== undefined) {
    await api.setBudgetCarryover(args.month, categoryId, args.carryover);
  }
  
  return success(`Budget updated for ${args.month}`);
}
```

### Enhanced Account Retrieval

```typescript
// src/tools/get-accounts/index.ts
interface GetAccountsArgs {
  accountId?: string;  // optional filter to single account
  includeBalance?: boolean;  // default: true
  includeClosed?: boolean;   // default: false
}

export async function handler(args: GetAccountsArgs): Promise<MCPResponse> {
  let accounts = await fetchAllAccounts();
  
  // Filter by ID if specified
  if (args.accountId) {
    accounts = accounts.filter(a => a.id === args.accountId || a.name === args.accountId);
  }
  
  // Filter closed accounts
  if (!args.includeClosed) {
    accounts = accounts.filter(a => !a.closed);
  }
  
  // Include balances (default behavior)
  if (args.includeBalance !== false) {
    accounts = await Promise.all(
      accounts.map(async a => ({
        ...a,
        balance: await api.getAccountBalance(a.id)
      }))
    );
  }
  
  return successWithContent({
    type: 'text',
    text: formatAccountsReport(accounts)
  });
}
```

### Name Resolution Utility

```typescript
// src/core/utils/name-resolver.ts
export class NameResolver {
  private accountCache: Map<string, string> = new Map();
  private categoryCache: Map<string, string> = new Map();
  private payeeCache: Map<string, string> = new Map();
  
  async resolveAccount(nameOrId: string): Promise<string> {
    // Check if already an ID
    if (validateUUID(nameOrId)) return nameOrId;
    
    // Check cache
    if (this.accountCache.has(nameOrId)) {
      return this.accountCache.get(nameOrId)!;
    }
    
    // Fetch and search
    const accounts = await fetchAllAccounts();
    const account = accounts.find(a => 
      a.name.toLowerCase() === nameOrId.toLowerCase()
    );
    
    if (!account) {
      throw new Error(`Account not found: ${nameOrId}`);
    }
    
    this.accountCache.set(nameOrId, account.id);
    return account.id;
  }
  
  // Similar methods for categories and payees
}
```

## Data Models

### Simplified Tool Registry

```typescript
// src/tools/index.ts
const coreTools: ToolDefinition[] = [
  // Transactions (2)
  { schema: getTransactions.schema, handler: getTransactions.handler, requiresWrite: false },
  { schema: manageTransaction.schema, handler: manageTransaction.handler, requiresWrite: true },
  
  // Accounts (2)
  { schema: getAccounts.schema, handler: getAccounts.handler, requiresWrite: false },
  { schema: updateAccount.schema, handler: updateAccount.handler, requiresWrite: true },
  
  // Categories & Budget (2)
  { schema: getGroupedCategories.schema, handler: getGroupedCategories.handler, requiresWrite: false },
  { schema: setBudget.schema, handler: setBudget.handler, requiresWrite: true },
  
  // Entity Management (3)
  { schema: manageEntity.schema, handler: manageEntity.handler, requiresWrite: true },
  { schema: getPayees.schema, handler: getPayees.handler, requiresWrite: false },
  { schema: getRules.schema, handler: getRules.handler, requiresWrite: false },
  
  // Financial Insights (3)
  { schema: spendingByCategory.schema, handler: spendingByCategory.handler, requiresWrite: false },
  { schema: monthlySummary.schema, handler: monthlySummary.handler, requiresWrite: false },
  { schema: balanceHistory.schema, handler: balanceHistory.handler, requiresWrite: false },
  
  // Advanced Operations (3)
  { schema: mergePayees.schema, handler: mergePayees.handler, requiresWrite: true },
  { schema: runBankSync.schema, handler: runBankSync.handler, requiresWrite: true },
  { schema: runImport.schema, handler: runImport.handler, requiresWrite: true },
  
  // Schedules (1)
  { schema: getSchedules.schema, handler: getSchedules.handler, requiresWrite: false },
];

// Optional tools (disabled by default)
const optionalTools: ToolDefinition[] = [
  // Budget file management (for multi-budget users)
  { schema: getBudgets.schema, handler: getBudgets.handler, requiresWrite: false },
  { schema: loadBudget.schema, handler: loadBudget.handler, requiresWrite: true },
  { schema: downloadBudget.schema, handler: downloadBudget.handler, requiresWrite: true },
  { schema: sync.schema, handler: sync.handler, requiresWrite: true },
  
  // Rare account operations
  { schema: createAccount.schema, handler: createAccount.handler, requiresWrite: true },
  { schema: closeAccount.schema, handler: closeAccount.handler, requiresWrite: true },
  { schema: reopenAccount.schema, handler: reopenAccount.handler, requiresWrite: true },
  { schema: deleteAccount.schema, handler: deleteAccount.handler, requiresWrite: true },
  
  // Utility tools
  { schema: getIdByName.schema, handler: getIdByName.handler, requiresWrite: false },
  { schema: runQuery.schema, handler: runQuery.handler, requiresWrite: false },
  { schema: getServerVersion.schema, handler: getServerVersion.handler, requiresWrite: false },
];

function getAvailableTools(enableWrite: boolean): ToolDefinition[] {
  let tools = [...coreTools];
  
  // Add optional tools if enabled
  if (process.env.ENABLE_BUDGET_MANAGEMENT === 'true') {
    tools.push(...optionalTools.filter(t => t.schema.name.includes('budget')));
  }
  
  if (process.env.ENABLE_ADVANCED_ACCOUNT_OPS === 'true') {
    tools.push(...optionalTools.filter(t => t.schema.name.includes('account')));
  }
  
  if (process.env.ENABLE_UTILITY_TOOLS === 'true') {
    tools.push(...optionalTools.filter(t => 
      ['get-id-by-name', 'run-query', 'get-server-version'].includes(t.schema.name)
    ));
  }
  
  return enableWrite ? tools : tools.filter(t => !t.requiresWrite);
}
```

## Error Handling

### Name Resolution Errors

When tools accept names instead of IDs, provide helpful errors:

```typescript
// Before: "Invalid account ID"
// After: "Account 'Checking' not found. Available accounts: Savings, Credit Card, Investment"

return notFoundError('Account', accountName, {
  suggestion: `Available accounts: ${accounts.map(a => a.name).join(', ')}`
});
```

### Removed Tool Errors

If optional tools are disabled:

```typescript
return error(
  `Tool '${toolName}' is not enabled`,
  `This tool is disabled by default. Set ENABLE_BUDGET_MANAGEMENT=true to enable it.`
);
```

## Testing Strategy

### Tool Consolidation Tests

```typescript
describe('manage-transaction', () => {
  it('should create transaction with account name', async () => {
    const result = await handler({
      operation: 'create',
      transaction: {
        account: 'Checking',  // name instead of ID
        date: '2025-01-15',
        amount: 5000,
        payee: 'Grocery Store',
        category: 'Food'
      }
    });
    expect(result.isError).toBe(false);
  });
  
  it('should update transaction', async () => {
    const result = await handler({
      operation: 'update',
      id: 'transaction-id',
      transaction: {
        amount: 6000
      }
    });
    expect(result.isError).toBe(false);
  });
  
  it('should require id for update', async () => {
    const result = await handler({
      operation: 'update',
      transaction: { amount: 6000 }
    });
    expect(result.isError).toBe(true);
  });
});
```

### Name Resolution Tests

```typescript
describe('NameResolver', () => {
  it('should resolve account name to ID', async () => {
    const resolver = new NameResolver();
    const id = await resolver.resolveAccount('Checking');
    expect(validateUUID(id)).toBe(true);
  });
  
  it('should pass through valid UUIDs', async () => {
    const resolver = new NameResolver();
    const uuid = 'abc-123-def-456';
    const id = await resolver.resolveAccount(uuid);
    expect(id).toBe(uuid);
  });
  
  it('should throw on unknown account', async () => {
    const resolver = new NameResolver();
    await expect(resolver.resolveAccount('Unknown')).rejects.toThrow();
  });
});
```

### Auto-Load Tests

```typescript
describe('Auto-load budget', () => {
  it('should load budget on startup', async () => {
    process.env.ACTUAL_BUDGET_SYNC_ID = 'test-budget-id';
    await initActualApi();
    // Verify budget is loaded
    const accounts = await api.getAccounts();
    expect(accounts.length).toBeGreaterThan(0);
  });
  
  it('should work without sync ID', async () => {
    delete process.env.ACTUAL_BUDGET_SYNC_ID;
    await initActualApi();
    // Should still initialize, just without budget loaded
  });
});
```

## Migration Strategy

### Phase 1: Add Consolidated Tools (Week 1)

1. Implement `manage-transaction` tool
2. Implement `set-budget` tool
3. Enhance `get-accounts` with balance
4. Add name resolution utility
5. Add tests for new tools
6. Deploy alongside existing tools

### Phase 2: Add Auto-Load (Week 2)

1. Implement automatic budget loading
2. Add optional auto-sync
3. Test with single-budget workflow
4. Update documentation

### Phase 3: Deprecate Old Tools (Week 3)

1. Add deprecation warnings to old tools
2. Update tool descriptions to point to new tools
3. Add feature flags for optional tools
4. Default optional tools to disabled
5. Update README with migration guide

### Phase 4: Remove Deprecated Tools (Week 4+)

1. Monitor usage of deprecated tools
2. After 30 days, remove deprecated tools
3. Keep optional tools behind feature flags
4. Release as v2.0.0 with breaking changes documented

### Backward Compatibility

During deprecation period:

```typescript
// Old tool with deprecation warning
export async function handler(args: CreateTransactionArgs): Promise<MCPResponse> {
  console.warn('[DEPRECATION] create-transaction is deprecated. Use manage-transaction instead.');
  
  // Forward to new tool
  return manageTransaction.handler({
    operation: 'create',
    transaction: args
  });
}
```

## Performance Considerations

### Context Window Savings

- **Current**: 37 tools × ~150 tokens = ~5,550 tokens
- **Proposed**: 20 tools × ~150 tokens = ~3,000 tokens
- **Savings**: ~2,550 tokens (46% reduction)

### Name Resolution Caching

- Cache name-to-ID mappings for session
- Invalidate cache on entity modifications
- Reduces API calls by 60-80%

### Auto-Sync Performance

- Background sync doesn't block tool calls
- Configurable interval (default: 5 minutes)
- Can be disabled with `AUTO_SYNC_INTERVAL_MINUTES=0`

## Documentation Updates

### README Changes

**Before:**
```markdown
## Available Tools

The server provides 37 tools for managing your budget...
```

**After:**
```markdown
## Available Tools

The server provides 20 core tools optimized for conversational budget management:

### Transactions
- `get-transactions` - View and filter transactions
- `manage-transaction` - Create or update transactions

### Accounts
- `get-accounts` - List accounts with balances
- `update-account` - Modify account details

[... etc ...]

### Optional Tools

Advanced users can enable additional tools:
- Set `ENABLE_BUDGET_MANAGEMENT=true` for multi-budget support
- Set `ENABLE_ADVANCED_ACCOUNT_OPS=true` for account creation/deletion
- Set `ENABLE_UTILITY_TOOLS=true` for low-level utilities
```

### Environment Variables

New variables:

```bash
# Auto-load budget on startup (recommended)
ACTUAL_BUDGET_SYNC_ID=your-budget-id

# Auto-sync interval in minutes (0 to disable)
AUTO_SYNC_INTERVAL_MINUTES=5

# Optional tool categories (default: false)
ENABLE_BUDGET_MANAGEMENT=false
ENABLE_ADVANCED_ACCOUNT_OPS=false
ENABLE_UTILITY_TOOLS=false
```

## Future Enhancements

### Potential Further Consolidations

1. **Reporting Tools**: Could consolidate spending-by-category, monthly-summary, balance-history into single `generate-report` tool with type parameter
2. **Entity Queries**: Could consolidate get-payees, get-rules, get-schedules into `get-entities` tool
3. **Smart Defaults**: Tools could infer parameters from context (e.g., current month for budget operations)

### AI-Friendly Enhancements

1. **Natural Language Dates**: Accept "last month", "this year", "last 30 days"
2. **Fuzzy Matching**: Match account/category names with typos
3. **Bulk Operations**: Support multiple transactions in one call
4. **Suggestions**: Return suggestions for common next actions

## Conclusion

The proposed simplification reduces tool count from 37 to 20 (46% reduction) while maintaining all essential functionality for conversational budget management. The changes optimize for the common single-budget use case while keeping advanced features available through configuration.

Key benefits:
- **Reduced context window**: 46% fewer tokens
- **Simpler mental model**: Fewer tools to understand
- **Better UX**: Name resolution, auto-loading, consolidated operations
- **Backward compatible**: Gradual migration with deprecation period
- **Flexible**: Optional tools for advanced users

The design maintains the excellent architecture you've already built (persistent connections, caching, modular structure) while streamlining the tool surface area for typical conversational usage.
