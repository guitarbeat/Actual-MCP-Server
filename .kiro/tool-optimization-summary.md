# Tool Optimization Summary

## Changes Made

### Removed 12 Tools

**Account Management (4 tools):**
- ❌ `create-account` - Not needed for typical use
- ❌ `close-account` - Not needed for typical use
- ❌ `reopen-account` - Rare edge case
- ❌ `delete-account` - Destructive operation

**Budget File Management (4 tools):**
- ❌ `get-budgets` - Multi-budget only
- ❌ `load-budget` - Auto-loads on startup
- ❌ `download-budget` - Same as load-budget
- ❌ `sync` - Auto-sync handles this

**Utilities (4 tools):**
- ❌ `get-id-by-name` - Redundant (name-resolver does this)
- ❌ `get-server-version` - Not conversational

### Moved to Core (5 tools)

**Budget Tools:**
- ✅ `get-budget-months` - Essential for time-based queries
- ✅ `get-budget-month` - Core budgeting feature
- ✅ `hold-budget-for-next-month` - Useful budgeting feature
- ✅ `reset-budget-hold` - Pairs with hold

**Payee Tools:**
- ✅ `get-payee-rules` - Understand automation

### Kept as Optional (1 tool)

- ⚠️ `run-query` - Power users only (raw ActualQL)

## Final Tool Count

**Before:** 32 tools (16 core + 16 optional)
**After:** 22 tools (21 core + 1 optional)

**Reduction:** 10 tools removed (31% reduction)
**From original 37 tools:** 15 tools removed (41% reduction)

## Tool Breakdown

### Core Tools (21) - Always Available

**Read Tools (9):**
1. get-transactions
2. get-accounts
3. get-grouped-categories
4. get-payees
5. get-rules
6. get-schedules
7. get-budget-months
8. get-budget-month
9. get-payee-rules

**Insight Tools (3):**
10. spending-by-category
11. monthly-summary
12. balance-history

**Write Tools (9):**
13. manage-transaction
14. update-account
15. set-budget
16. hold-budget-for-next-month
17. reset-budget-hold
18. manage-entity
19. merge-payees
20. run-bank-sync
21. run-import

### Optional Tools (1) - Require ENABLE_UTILITY_TOOLS=true

22. run-query (ActualQL power user tool)

## Performance Impact

**Context Window:**
- Original: 37 tools × 150 tokens = 5,550 tokens
- Current: 21 tools × 150 tokens = 3,150 tokens
- **Savings: 2,400 tokens (43% reduction)**

**Benefits:**
- ✅ Simpler API for AI agents
- ✅ Focused on conversational use cases
- ✅ Removed multi-budget complexity
- ✅ Removed rarely-used account management
- ✅ Kept all essential budgeting features
- ✅ Significant context window savings

## Migration Notes

Users who need removed tools can:
1. Use `update-account` for basic account changes
2. Use `manage-entity` for advanced entity operations
3. Manage accounts directly in Actual Budget UI
4. Auto-sync handles budget synchronization

No breaking changes for core functionality!
