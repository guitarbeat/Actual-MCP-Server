# Migration Guide: Tool Consolidation & Simplification

This guide helps you migrate from deprecated and removed tools to the new consolidated tools.

## ⚠️ Breaking Changes

### v2.0.0 - Entity Tool Consolidation

As of version 2.0.0, the 15 individual entity CRUD tools have been **permanently removed**. You must use the `manage-entity` tool for all entity Create, Update, and Delete operations.

### v3.0.0 - Transaction & Account Tool Removal

As of version 3.0.0, `manage-transaction` and `manage-account` have been **permanently removed**. You must use `manage-entity` with `entityType: "transaction"` or `entityType: "account"` instead.

### v2.2.0 - Transaction & Account Tool Consolidation

As of version 2.2.0, `manage-transaction` and `manage-account` were marked as deprecated (now removed in v3.0.0):

## Overview

The Actual Budget MCP Server has been simplified from 37 tools to 17 core tools (54% reduction), optimized for conversational budget management with single-budget users.

**Benefits:**
- ✅ Simpler API with fewer tools to learn
- ✅ Consistent interface across all entity types
- ✅ Better error messages with entity-specific context
- ✅ Easier to maintain and extend

## What Changed

### Removed Tools (15 total)

The following tools have been **permanently removed**:

**Categories:**
- `create-category` → Use `manage-entity` with `entityType: 'category'`
- `update-category` → Use `manage-entity` with `entityType: 'category'`
- `delete-category` → Use `manage-entity` with `entityType: 'category'`

**Category Groups:**
- `create-category-group` → Use `manage-entity` with `entityType: 'categoryGroup'`
- `update-category-group` → Use `manage-entity` with `entityType: 'categoryGroup'`
- `delete-category-group` → Use `manage-entity` with `entityType: 'categoryGroup'`

**Payees:**
- `create-payee` → Use `manage-entity` with `entityType: 'payee'`
- `update-payee` → Use `manage-entity` with `entityType: 'payee'`
- `delete-payee` → Use `manage-entity` with `entityType: 'payee'`

**Rules:**
- `create-rule` → Use `manage-entity` with `entityType: 'rule'`
- `update-rule` → Use `manage-entity` with `entityType: 'rule'`
- `delete-rule` → Use `manage-entity` with `entityType: 'rule'`

**Schedules:**
- `create-schedule` → Use `manage-entity` with `entityType: 'schedule'`
- `update-schedule` → Use `manage-entity` with `entityType: 'schedule'`
- `delete-schedule` → Use `manage-entity` with `entityType: 'schedule'`

### New Tool

**`manage-entity`** - Unified interface for all entity CRUD operations

**Parameters:**
- `entityType` (required): `'category'` | `'categoryGroup'` | `'payee'` | `'rule'` | `'schedule'`
- `operation` (required): `'create'` | `'update'` | `'delete'`
- `id` (required for update/delete): Entity UUID
- `data` (required for create/update): Entity-specific data object

## Migration Examples

### Categories

#### Create Category

**Before:**
```json
{
  "tool": "create-category",
  "args": {
    "name": "Groceries",
    "groupId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "category",
    "operation": "create",
    "data": {
      "name": "Groceries",
      "groupId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Update Category

**Before:**
```json
{
  "tool": "update-category",
  "args": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "name": "Grocery Shopping",
    "groupId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "category",
    "operation": "update",
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "data": {
      "name": "Grocery Shopping",
      "groupId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Delete Category

**Before:**
```json
{
  "tool": "delete-category",
  "args": {
    "id": "650e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "category",
    "operation": "delete",
    "id": "650e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Category Groups

#### Create Category Group

**Before:**
```json
{
  "tool": "create-category-group",
  "args": {
    "name": "Monthly Bills"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "categoryGroup",
    "operation": "create",
    "data": {
      "name": "Monthly Bills"
    }
  }
}
```

#### Update Category Group

**Before:**
```json
{
  "tool": "update-category-group",
  "args": {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "name": "Fixed Expenses"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "categoryGroup",
    "operation": "update",
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "data": {
      "name": "Fixed Expenses"
    }
  }
}
```

#### Delete Category Group

**Before:**
```json
{
  "tool": "delete-category-group",
  "args": {
    "id": "750e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "categoryGroup",
    "operation": "delete",
    "id": "750e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Payees

#### Create Payee

**Before:**
```json
{
  "tool": "create-payee",
  "args": {
    "name": "Whole Foods"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "payee",
    "operation": "create",
    "data": {
      "name": "Whole Foods"
    }
  }
}
```

#### Create Transfer Payee

**Before:**
```json
{
  "tool": "create-payee",
  "args": {
    "name": "Transfer to Savings",
    "transferAccount": "850e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "payee",
    "operation": "create",
    "data": {
      "name": "Transfer to Savings",
      "transferAccount": "850e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Update Payee

**Before:**
```json
{
  "tool": "update-payee",
  "args": {
    "id": "950e8400-e29b-41d4-a716-446655440000",
    "name": "Whole Foods Market"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "payee",
    "operation": "update",
    "id": "950e8400-e29b-41d4-a716-446655440000",
    "data": {
      "name": "Whole Foods Market"
    }
  }
}
```

#### Delete Payee

**Before:**
```json
{
  "tool": "delete-payee",
  "args": {
    "id": "950e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "payee",
    "operation": "delete",
    "id": "950e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Rules

#### Create Rule

**Before:**
```json
{
  "tool": "create-rule",
  "args": {
    "stage": "pre",
    "conditionsOp": "and",
    "conditions": [
      {
        "field": "payee",
        "op": "is",
        "value": "950e8400-e29b-41d4-a716-446655440000"
      }
    ],
    "actions": [
      {
        "field": "category",
        "op": "set",
        "value": "650e8400-e29b-41d4-a716-446655440000"
      }
    ]
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "rule",
    "operation": "create",
    "data": {
      "stage": "pre",
      "conditionsOp": "and",
      "conditions": [
        {
          "field": "payee",
          "op": "is",
          "value": "950e8400-e29b-41d4-a716-446655440000"
        }
      ],
      "actions": [
        {
          "field": "category",
          "op": "set",
          "value": "650e8400-e29b-41d4-a716-446655440000"
        }
      ]
    }
  }
}
```

#### Update Rule

**Before:**
```json
{
  "tool": "update-rule",
  "args": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "conditionsOp": "or",
    "conditions": [
      {
        "field": "payee",
        "op": "contains",
        "value": "Amazon"
      }
    ],
    "actions": [
      {
        "field": "category",
        "op": "set",
        "value": "650e8400-e29b-41d4-a716-446655440000"
      }
    ]
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "rule",
    "operation": "update",
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "data": {
      "conditionsOp": "or",
      "conditions": [
        {
          "field": "payee",
          "op": "contains",
          "value": "Amazon"
        }
      ],
      "actions": [
        {
          "field": "category",
          "op": "set",
          "value": "650e8400-e29b-41d4-a716-446655440000"
        }
      ]
    }
  }
}
```

#### Delete Rule

**Before:**
```json
{
  "tool": "delete-rule",
  "args": {
    "id": "a50e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "rule",
    "operation": "delete",
    "id": "a50e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Schedules

#### Create Schedule

**Before:**
```json
{
  "tool": "create-schedule",
  "args": {
    "name": "Monthly Rent",
    "accountId": "b50e8400-e29b-41d4-a716-446655440000",
    "amount": -150000,
    "nextDate": "2024-02-01",
    "rule": "monthly",
    "payee": "c50e8400-e29b-41d4-a716-446655440000",
    "category": "650e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "schedule",
    "operation": "create",
    "data": {
      "name": "Monthly Rent",
      "accountId": "b50e8400-e29b-41d4-a716-446655440000",
      "amount": -150000,
      "nextDate": "2024-02-01",
      "rule": "monthly",
      "payee": "c50e8400-e29b-41d4-a716-446655440000",
      "category": "650e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Update Schedule

**Before:**
```json
{
  "tool": "update-schedule",
  "args": {
    "id": "d50e8400-e29b-41d4-a716-446655440000",
    "amount": -160000,
    "nextDate": "2024-03-01"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "schedule",
    "operation": "update",
    "id": "d50e8400-e29b-41d4-a716-446655440000",
    "data": {
      "amount": -160000,
      "nextDate": "2024-03-01"
    }
  }
}
```

#### Delete Schedule

**Before:**
```json
{
  "tool": "delete-schedule",
  "args": {
    "id": "d50e8400-e29b-41d4-a716-446655440000"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "schedule",
    "operation": "delete",
    "id": "d50e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Quick Reference

### Parameter Mapping

| Old Tool | New `entityType` | New `operation` | `id` Location | `data` Contents |
|----------|------------------|-----------------|---------------|-----------------|
| `create-category` | `category` | `create` | N/A | `{ name, groupId }` |
| `update-category` | `category` | `update` | Top-level | `{ name, groupId }` |
| `delete-category` | `category` | `delete` | Top-level | N/A |
| `create-category-group` | `categoryGroup` | `create` | N/A | `{ name }` |
| `update-category-group` | `categoryGroup` | `update` | Top-level | `{ name }` |
| `delete-category-group` | `categoryGroup` | `delete` | Top-level | N/A |
| `create-payee` | `payee` | `create` | N/A | `{ name, transferAccount? }` |
| `update-payee` | `payee` | `update` | Top-level | `{ name, transferAccount? }` |
| `delete-payee` | `payee` | `delete` | Top-level | N/A |
| `create-rule` | `rule` | `create` | N/A | `{ stage?, conditionsOp, conditions, actions }` |
| `update-rule` | `rule` | `update` | Top-level | `{ stage?, conditionsOp, conditions, actions }` |
| `delete-rule` | `rule` | `delete` | Top-level | N/A |
| `create-schedule` | `schedule` | `create` | N/A | `{ name, accountId, amount, nextDate, rule, payee?, category?, notes? }` |
| `update-schedule` | `schedule` | `update` | Top-level | `{ name?, accountId?, amount?, nextDate?, rule?, payee?, category?, notes? }` |
| `delete-schedule` | `schedule` | `delete` | Top-level | N/A |

### Entity Data Structures

**Category:**
```typescript
{
  name: string;
  groupId: string; // UUID
}
```

**Category Group:**
```typescript
{
  name: string;
}
```

**Payee:**
```typescript
{
  name: string;
  transferAccount?: string; // UUID (optional, for transfer payees)
}
```

**Rule:**
```typescript
{
  stage?: 'pre' | 'post' | null;
  conditionsOp: 'and' | 'or';
  conditions: Array<{
    field: 'account' | 'category' | 'date' | 'payee' | 'amount' | 'imported_payee';
    op: 'is' | 'isNot' | 'oneOf' | 'notOneOf' | 'onBudget' | 'offBudget' | 
        'isapprox' | 'gt' | 'gte' | 'lt' | 'lte' | 'isbetween' | 
        'contains' | 'doesNotContain' | 'matches' | 'hasTags';
    value: string | number | string[] | number[];
  }>;
  actions: Array<{
    field: 'account' | 'category' | 'date' | 'payee' | 'amount' | 'cleared' | 'notes' | null;
    op: 'set' | 'prepend-notes' | 'append-notes' | 'set-split-amount';
    value: boolean | string | number | null;
    options?: {
      splitIndex?: number;
      method?: 'fixed-amount' | 'fixed-percent' | 'remainder';
    };
  }>;
}
```

**Schedule:**
```typescript
{
  name: string;
  accountId: string; // UUID
  amount: number; // In milliunits (e.g., -150000 for -$1,500.00)
  nextDate: string; // YYYY-MM-DD format
  rule: string; // Recurrence rule (e.g., "monthly", "weekly")
  payee?: string; // UUID (optional)
  category?: string; // UUID (optional)
  notes?: string; // (optional)
}
```

## Troubleshooting

### Common Migration Issues

#### Issue: "entityType is required"

**Cause:** Forgot to add the `entityType` parameter.

**Solution:** Add `entityType` to your args:
```json
{
  "entityType": "category",
  "operation": "create",
  "data": { ... }
}
```

#### Issue: "operation is required"

**Cause:** Forgot to add the `operation` parameter.

**Solution:** Add `operation` to your args:
```json
{
  "entityType": "category",
  "operation": "create",
  "data": { ... }
}
```

#### Issue: "id is required for update/delete operations"

**Cause:** Trying to update or delete without providing an `id`.

**Solution:** Add the entity `id` at the top level:
```json
{
  "entityType": "category",
  "operation": "update",
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "data": { ... }
}
```

#### Issue: "data is required for create/update operations"

**Cause:** Trying to create or update without providing `data`.

**Solution:** Add the `data` object with required fields:
```json
{
  "entityType": "category",
  "operation": "create",
  "data": {
    "name": "Groceries",
    "groupId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Issue: Old tool no longer available

**Cause:** The deprecated tools have been removed in v2.0.0.

**Solution:** Use `manage-entity` instead. Refer to the examples in this guide for the correct syntax.

## Removed Tools (v2.1.0)

The following tools have been permanently removed in v2.1.0. Use the consolidated tools instead.

### Transaction Tools

#### `create-transaction` (Removed)

**Migration:** Use `manage-entity` with `entityType: "transaction"` and `operation: "create"`

**Before:**
```json
{
  "tool": "create-transaction",
  "args": {
    "account": "Checking",
    "date": "2025-01-15",
    "amount": 5000,
    "payee": "Grocery Store",
    "category": "Food"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "create",
    "data": {
      "account": "Checking",
      "date": "2025-01-15",
      "amount": 5000,
      "payee": "Grocery Store",
      "category": "Food"
    }
  }
}
```

#### `update-transaction` (Removed)

**Migration:** Use `manage-entity` with `entityType: "transaction"` and `operation: "update"`

**Before:**
```json
{
  "tool": "update-transaction",
  "args": {
    "id": "transaction-id",
    "amount": 6000,
    "notes": "Updated amount"
  }
}
```

**After:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "update",
    "id": "transaction-id",
    "data": {
      "amount": 6000,
      "notes": "Updated amount"
    }
  }
}
```

### Budget Tools

#### `set-budget-amount` (Removed)

**Migration:** Use `set-budget` with `amount` parameter

**Before:**
```json
{
  "tool": "set-budget-amount",
  "args": {
    "month": "2025-01",
    "categoryId": "category-uuid",
    "amount": 50000
  }
}
```

**After:**
```json
{
  "tool": "set-budget",
  "args": {
    "month": "2025-01",
    "category": "Food",
    "amount": 50000
  }
}
```

**Note:** The new tool supports category names in addition to UUIDs.

#### `set-budget-carryover` (Removed)

**Migration:** Use `set-budget` with `carryover` parameter

**Before:**
```json
{
  "tool": "set-budget-carryover",
  "args": {
    "month": "2025-01",
    "categoryId": "category-uuid",
    "enabled": true
  }
}
```

**After:**
```json
{
  "tool": "set-budget",
  "args": {
    "month": "2025-01",
    "category": "Food",
    "carryover": true
  }
}
```

#### Set Both Amount and Carryover

The new `set-budget` tool allows setting both in one call:

```json
{
  "tool": "set-budget",
  "args": {
    "month": "2025-01",
    "category": "Food",
    "amount": 50000,
    "carryover": true
  }
}
```

### Account Tools

#### `get-account-balance` (Removed)

**Migration:** Use `get-accounts` (balance included by default)

**Before:**
```json
{
  "tool": "get-account-balance",
  "args": {
    "accountId": "account-uuid"
  }
}
```

**After:**
```json
{
  "tool": "get-accounts",
  "args": {
    "accountId": "Checking"
  }
}
```

**Note:** The new tool includes balance by default and supports account names.

## Name Resolution

All new consolidated tools support **name resolution**, allowing you to use human-readable names instead of UUIDs:

### Supported Entities
- **Accounts**: Use account name instead of UUID
- **Categories**: Use category name instead of UUID
- **Payees**: Use payee name instead of UUID

### Examples

**Using UUIDs (still supported):**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "create",
    "data": {
      "account": "550e8400-e29b-41d4-a716-446655440000",
      "payee": "650e8400-e29b-41d4-a716-446655440000",
      "category": "750e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**Using Names (recommended):**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "create",
    "data": {
      "account": "Checking",
      "payee": "Grocery Store",
      "category": "Food"
    }
  }
}
```

### Name Resolution Benefits
- ✅ More readable and intuitive
- ✅ No need to look up UUIDs
- ✅ Helpful error messages with suggestions
- ✅ Cached for performance

### Error Handling

If a name is not found, you'll get a helpful error:

```
Account 'Chequing' not found. Available accounts: Checking, Savings, Credit Card
```

## Removed Optional Tools

The following tools have been removed from the default tool set but can be re-enabled via environment variables:

### Budget File Management (8 tools)

**Removed Tools:**
- `get-budgets`, `load-budget`, `download-budget`, `sync`
- `get-budget-months`, `get-budget-month`

**Why Removed:** Single-budget users (95%) don't need these. The server auto-loads your budget on startup using `ACTUAL_BUDGET_SYNC_ID`.

**Re-enable:** Set `ENABLE_BUDGET_MANAGEMENT=true`

### Advanced Account Operations (4 tools)

**Removed Tools:**
- `create-account`, `close-account`, `reopen-account`, `delete-account`

**Why Removed:** Account structure is stable after setup. These are administrative operations better done in the UI.

**Re-enable:** Set `ENABLE_ADVANCED_ACCOUNT_OPS=true`

### Utility Tools (3 tools)

**Removed Tools:**
- `get-id-by-name`, `run-query`, `get-server-version`

**Why Removed:** 
- `get-id-by-name`: Other tools now handle name resolution automatically
- `run-query`: Too low-level for conversation
- `get-server-version`: Not useful in conversation

**Re-enable:** Set `ENABLE_UTILITY_TOOLS=true`

### Advanced Budget Operations (2 tools)

**Removed Tools:**
- `hold-budget-for-next-month`, `reset-budget-hold`

**Why Removed:** Advanced features used by <5% of users. Not intuitive in conversation.

**Re-enable:** These tools are permanently removed. If needed, use the Actual Budget UI.

## Automatic Budget Loading

**New in v2.1.0:** The server automatically loads your budget on startup when `ACTUAL_BUDGET_SYNC_ID` is set.

### Configuration

```bash
# Auto-load budget on startup (recommended)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"

# Auto-sync interval in minutes (0 to disable, default: 5)
export AUTO_SYNC_INTERVAL_MINUTES=5
```

### Benefits
- ✅ No need to call `load-budget` or `download-budget`
- ✅ Budget ready immediately when first tool is called
- ✅ Automatic background sync keeps data up-to-date
- ✅ Reduces context window consumption

### Migration

**Before (manual loading):**
```json
// First call load-budget
{ "tool": "load-budget", "args": { "syncId": "your-budget-id" } }

// Then use other tools
{ "tool": "get-accounts", "args": {} }
```

**After (automatic loading):**
```bash
# Set environment variable
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"

# Budget loads automatically, just use tools
{ "tool": "get-accounts", "args": {} }
```

## Timeline

- **v1.2.0**: Entity tool consolidation with deprecation warnings
- **v2.0.0**: Entity CRUD tools removed. Only `manage-entity` available.
- **v2.1.0 (Current)**: Transaction/budget tools removed. Optional tools disabled by default.

**Important**: 
- Entity CRUD tools have been permanently removed. Use `manage-entity`.
- Transaction/budget tools have been permanently removed. Use `manage-entity` with `entityType: "transaction"` or `entityType: "account"` and `set-budget`.
- Optional tools can be re-enabled via environment variables.

## Benefits of Migration

1. **Simpler API**: One tool instead of 15
2. **Consistent Interface**: Same pattern for all entity types
3. **Better Error Messages**: Entity-specific error context
4. **Future-Proof**: New entity types will be added to `manage-entity`
5. **Type Safety**: Better TypeScript support with discriminated unions

## Need Help?

If you encounter issues during migration:

1. Check this guide for examples
2. Review the tool schema: `list-tools` → find `manage-entity`
3. Check error messages for specific guidance
4. Refer to the [README.md](../README.md) for additional examples

## Implementation Summary

### v2.0.0 - Entity Consolidation
- **Tool Count**: Reduced from 49 to 35 (29% reduction)
- **Removed**: 15 entity CRUD tools
- **Added**: 1 consolidated `manage-entity` tool
- **Test Coverage**: 45 tests for `manage-entity` (100% passing)
- **Performance**: Average overhead 0.000ms (well within <5ms target)

### v2.1.0 - Transaction & Budget Consolidation
- **Tool Count**: Reduced from 37 to 16 core tools (57% reduction)
- **Removed**: 5 transaction/budget tools (replaced by consolidated tools)
- **Removed from default**: 16 optional tools (can be re-enabled)
- **Added**: 
  - `manage-entity` (consolidates all entity operations including transactions and accounts)
  - `set-budget` (consolidates amount/carryover)
  - Name resolution utility
  - Automatic budget loading
- **Context Window Savings**: ~2,550 tokens (46% reduction)

### Quality Checks
- ✅ All tests passing
- ✅ Zero TypeScript errors
- ✅ Build successful
- ✅ Linter passing

### Architecture
The consolidated tools use consistent patterns:
- **Entity Handler Pattern**: Each entity type has a dedicated handler
- **Name Resolution**: Automatic name-to-ID conversion with caching
- **Type Safety**: Discriminated unions for operation routing
- **Error Messages**: Helpful suggestions with available options

For more details, see [ARCHITECTURE.md](../ARCHITECTURE.md).

## Feedback

If you have suggestions for improving this migration guide or the consolidated tools, please open an issue on the project repository.

---

**Version**: 2.1.0  
**Status**: Complete ✅  
**Date**: November 2024
