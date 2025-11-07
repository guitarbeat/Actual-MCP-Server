# CRUD Layout Refactoring Plan

## Overview
Break up `manage-entity` into individual CRUD tools for each entity type, creating a consistent, traditional REST-like API pattern.

## Target Structure

### Transactions
- `create-transaction` - Create new transaction
- `update-transaction` - Update existing transaction  
- `delete-transaction` - Delete transaction
- `get-transactions` - List/filter (keep as-is - complex query tool)

### Accounts
- `create-account` - Create new account
- `update-account` - Update account properties
- `delete-account` - Delete account
- `close-account` - Close account (special operation)
- `reopen-account` - Reopen closed account
- `get-account-balance` - Query balance (special operation)
- `get-accounts` - List/filter (keep as-is)

### Categories
- `create-category` - Create new category
- `update-category` - Update category
- `delete-category` - Delete category
- `get-grouped-categories` - List (keep as-is)

### Category Groups
- `create-category-group` - Create new group
- `update-category-group` - Update group
- `delete-category-group` - Delete group
- `get-grouped-categories` - List (keep as-is)

### Payees
- `create-payee` - Create new payee
- `update-payee` - Update payee
- `delete-payee` - Delete payee
- `get-payees` - List/filter (keep as-is)

### Rules
- `create-rule` - Create new rule
- `update-rule` - Update rule
- `delete-rule` - Delete rule
- `get-rules` - List/filter (keep as-is)

### Schedules
- `create-schedule` - Create new schedule
- `update-schedule` - Update schedule
- `delete-schedule` - Delete schedule
- `get-schedules` - List (keep as-is)

## Implementation Phases

### Phase 1: Create Transaction CRUD Tools
- Extract `TransactionHandler` methods into individual tools
- Create `src/tools/transactions/create-transaction/index.ts`
- Create `src/tools/transactions/update-transaction/index.ts`
- Create `src/tools/transactions/delete-transaction/index.ts`
- Register in `src/tools/index.ts`

### Phase 2: Create Account CRUD Tools
- Extract `AccountHandler` methods into individual tools
- Create `src/tools/accounts/create-account/index.ts`
- Create `src/tools/accounts/update-account/index.ts`
- Create `src/tools/accounts/delete-account/index.ts`
- Create `src/tools/accounts/close-account/index.ts`
- Create `src/tools/accounts/reopen-account/index.ts`
- Create `src/tools/accounts/get-account-balance/index.ts`
- Register in `src/tools/index.ts`

### Phase 3: Create Category CRUD Tools
- Extract `CategoryHandler` methods
- Create category CRUD tools
- Register tools

### Phase 4: Create Remaining Entity CRUD Tools
- Category Groups, Payees, Rules, Schedules
- Extract handlers and create tools

### Phase 5: Remove manage-entity
- Remove `manage-entity` registration
- Remove `manage-entity` directory
- Update tests
- Update documentation

## Tool Count Impact

**Current:** 17 tools
**After:** ~35 tools
- 7 entity types × 3-4 CRUD ops = ~25 tools
- 6 query tools (keep as-is)
- 4 account special ops
- 10 other tools (budget, analysis, etc.)

## Benefits
✅ Consistent CRUD pattern across all entities
✅ Clear, discoverable tool names (`create-transaction` vs `manage-entity`)
✅ Simpler schemas per tool (focused purpose)
✅ Traditional REST-like API pattern
✅ Better LLM tool selection (more specific names)

## Trade-offs
❌ More tools (17 → 35) - doubles tool count
❌ More context window usage (~2,700 tokens for 18 new tools)
❌ More files to maintain (~25 new tool files)
❌ Code duplication (but handlers can be shared)

## Reusable Components
- Keep handlers in `manage-entity/entity-handlers/` (or move to shared location)
- Each tool imports and uses the appropriate handler method
- Shared validation, error handling, cache invalidation

