# CRUD Operations Audit - Design Document

## Overview

This document provides a comprehensive design for auditing CRUD operation coverage across the Actual Budget MCP server. The audit will identify gaps, inconsistencies, and opportunities for improvement in how entities are managed through the API.

## Architecture

### Audit Layers

The audit examines three layers of the system:

1. **Actual Budget API Layer**: What operations are available in @actual-app/api
2. **API Wrapper Layer**: What operations are wrapped in `src/actual-api.ts`
3. **MCP Tool Layer**: What operations are exposed to MCP clients via tools

### Entity Categories

Entities are grouped into categories based on their purpose:

1. **Core Financial Entities**: Transactions, Accounts
2. **Organization Entities**: Categories, Category Groups, Payees
3. **Automation Entities**: Rules, Schedules
4. **Budget Entities**: Budget months, budget amounts

## CRUD Coverage Matrix

### Current State Analysis

#### 1. Transactions

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ addTransactions | ✅ addTransactions | ✅ | manage-transaction | Via importTransactions |
| | ✅ importTransactions | ✅ importTransactions | ✅ | manage-transaction | Preferred method |
| **Read** | ✅ getTransactions | ✅ getTransactions | ✅ | get-transactions | |
| **Update** | ✅ updateTransaction | ❌ Missing | ✅ | manage-transaction | Uses api directly |
| **Delete** | ✅ deleteTransaction | ✅ deleteTransaction | ✅ | manage-transaction | Recently added |

**Status**: ✅ Complete CRUD coverage
**Notes**: 
- Update operation bypasses API wrapper (uses api directly in data-fetcher)
- Should add updateTransaction wrapper for consistency

#### 2. Accounts

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createAccount | ✅ createAccount | ❌ Missing | N/A | Wrapper exists, no tool |
| **Read** | ✅ getAccounts | ✅ getAccounts | ✅ | get-accounts | |
| | ✅ getAccountBalance | ✅ getAccountBalance | ❌ Missing | N/A | Wrapper exists, no tool |
| **Update** | ✅ updateAccount | ✅ updateAccount | ✅ | update-account | Dedicated tool |
| **Delete** | ✅ deleteAccount | ✅ deleteAccount | ❌ Missing | N/A | Wrapper exists, no tool |
| **Special** | ✅ closeAccount | ✅ closeAccount | ❌ Missing | N/A | Wrapper exists, no tool |
| | ✅ reopenAccount | ✅ reopenAccount | ❌ Missing | N/A | Wrapper exists, no tool |

**Status**: ⚠️ Incomplete - Missing create, delete, close, reopen tools
**Priority**: High - Users need to create and manage accounts
**Recommendation**: Add account operations to manage-entity or create manage-account tool

#### 3. Categories

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createCategory | ✅ createCategory | ✅ | manage-entity | |
| **Read** | ✅ getCategories | ✅ getCategories | ✅ | get-grouped-categories | |
| **Update** | ✅ updateCategory | ✅ updateCategory | ✅ | manage-entity | |
| **Delete** | ✅ deleteCategory | ✅ deleteCategory | ✅ | manage-entity | |

**Status**: ✅ Complete CRUD coverage
**Notes**: Well integrated with manage-entity tool

#### 4. Category Groups

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createCategoryGroup | ✅ createCategoryGroup | ✅ | manage-entity | |
| **Read** | ✅ getCategoryGroups | ✅ getCategoryGroups | ✅ | get-grouped-categories | |
| **Update** | ✅ updateCategoryGroup | ✅ updateCategoryGroup | ✅ | manage-entity | |
| **Delete** | ✅ deleteCategoryGroup | ✅ deleteCategoryGroup | ✅ | manage-entity | |

**Status**: ✅ Complete CRUD coverage
**Notes**: Well integrated with manage-entity tool

#### 5. Payees

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createPayee | ✅ createPayee | ✅ | manage-entity | |
| **Read** | ✅ getPayees | ✅ getPayees | ✅ | get-payees | |
| | ✅ getPayeeRules | ✅ getPayeeRules | ✅ | get-payee-rules | |
| **Update** | ✅ updatePayee | ✅ updatePayee | ✅ | manage-entity | |
| **Delete** | ✅ deletePayee | ✅ deletePayee | ✅ | manage-entity | |
| **Special** | ✅ mergePayees | ✅ mergePayees | ✅ | merge-payees | |

**Status**: ✅ Complete CRUD coverage
**Notes**: Excellent coverage including special operations

#### 6. Rules

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createRule | ✅ createRule | ✅ | manage-entity | |
| **Read** | ✅ getRules | ✅ getRules | ✅ | get-rules | |
| **Update** | ✅ updateRule | ✅ updateRule | ✅ | manage-entity | |
| **Delete** | ✅ deleteRule | ✅ deleteRule | ✅ | manage-entity | |

**Status**: ✅ Complete CRUD coverage
**Notes**: Well integrated with manage-entity tool

#### 7. Schedules

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Create** | ✅ createSchedule | ✅ createSchedule | ✅ | manage-entity | |
| **Read** | ✅ getSchedules | ✅ getSchedules | ✅ | get-schedules | |
| **Update** | ✅ updateSchedule | ✅ updateSchedule | ✅ | manage-entity | |
| **Delete** | ✅ deleteSchedule | ✅ deleteSchedule | ✅ | manage-entity | |

**Status**: ✅ Complete CRUD coverage
**Notes**: Well integrated with manage-entity tool

#### 8. Budget Operations

| Operation | Actual API | API Wrapper | MCP Tool | Tool Name | Notes |
|-----------|------------|-------------|----------|-----------|-------|
| **Read** | ✅ getBudgetMonths | ✅ getBudgetMonths | ✅ | get-budget-months | |
| | ✅ getBudgetMonth | ✅ getBudgetMonth | ✅ | get-budget-month | |
| **Update** | ✅ setBudgetAmount | ✅ setBudgetAmount | ✅ | set-budget | |
| | ✅ setBudgetCarryover | ✅ setBudgetCarryover | ✅ | set-budget | |
| | ✅ holdBudgetForNextMonth | ✅ holdBudgetForNextMonth | ✅ | hold-budget-for-next-month | |
| | ✅ resetBudgetHold | ✅ resetBudgetHold | ✅ | reset-budget-hold | |

**Status**: ✅ Complete coverage (no create/delete for budget months)
**Notes**: Budget months are created automatically, not via API

## Gap Analysis

### Critical Gaps (High Priority)

1. **Account Creation** - Users cannot create new accounts via MCP
   - API wrapper exists: `createAccount`
   - Impact: High - Users need to create accounts
   - Recommendation: Add to manage-entity or create manage-account tool

2. **Account Deletion** - Users cannot delete accounts via MCP
   - API wrapper exists: `deleteAccount`
   - Impact: High - Users need to clean up old accounts
   - Recommendation: Add to manage-entity or create manage-account tool

3. **Account Close/Reopen** - Users cannot close or reopen accounts via MCP
   - API wrappers exist: `closeAccount`, `reopenAccount`
   - Impact: Medium - Important for account lifecycle management
   - Recommendation: Add to manage-account tool

### Minor Gaps (Medium Priority)

4. **Account Balance Query** - Users cannot query account balance via MCP
   - API wrapper exists: `getAccountBalance`
   - Impact: Medium - Useful for reporting, but can be calculated from transactions
   - Recommendation: Add dedicated tool or extend get-accounts

5. **Transaction Update Wrapper** - Update operation bypasses API wrapper
   - API exists: `updateTransaction`
   - Impact: Low - Functionality works, but inconsistent pattern
   - Recommendation: Add wrapper for consistency

### Non-Gaps (Intentional Exclusions)

6. **Budget File Management** - Operations like `getBudgets`, `loadBudget`, `downloadBudget`
   - Reason: These are server-level operations, not budget data operations
   - Status: Correctly excluded from MCP tools

7. **Sync Operations** - Operations like `sync`, `runBankSync`
   - Status: `runBankSync` is exposed, `sync` is internal
   - Reason: Sync is automatic, runBankSync is user-initiated

## Components and Interfaces

### Option 1: Extend manage-entity Tool

Add account entity type to the existing manage-entity tool.

**Pros**:
- Consistent with other entities
- Reuses existing infrastructure
- Single tool for all entity management

**Cons**:
- Accounts have special operations (close, reopen) that don't fit CRUD
- Account creation requires initial balance parameter
- May make manage-entity too complex

**Recommendation**: ⚠️ Not ideal due to special operations

### Option 2: Create manage-account Tool

Create a dedicated tool similar to manage-transaction.

**Pros**:
- Can handle account-specific operations (close, reopen, balance)
- Follows pattern of manage-transaction
- Clear separation of concerns

**Cons**:
- Another tool to maintain
- Duplicates some patterns from manage-entity

**Recommendation**: ✅ Preferred approach

### Option 3: Create Individual Account Tools

Create separate tools: create-account, delete-account, close-account, etc.

**Pros**:
- Very simple, focused tools
- Easy to understand and use

**Cons**:
- Tool proliferation
- Inconsistent with manage-entity pattern
- More maintenance overhead

**Recommendation**: ❌ Not recommended

## Data Models

### Account Entity

```typescript
interface Account {
  id?: string;           // UUID, not required for create
  name: string;          // Required
  type: AccountType;     // Required
  offbudget?: boolean;   // Defaults to false
  closed?: boolean;      // Defaults to false
}

type AccountType = 
  | 'checking'
  | 'savings'
  | 'credit'
  | 'investment'
  | 'mortgage'
  | 'debt'
  | 'other';
```

### Account Operations

```typescript
interface ManageAccountArgs {
  operation: 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';
  id?: string;                    // Required for update, delete, close, reopen, balance
  account?: {
    name?: string;
    type?: AccountType;
    offbudget?: boolean;
  };
  initialBalance?: number;        // Optional for create, in cents
  transferAccountId?: string;     // Required for close if balance != 0
  transferCategoryId?: string;    // Optional for close
  date?: string;                  // Optional for balance query
}
```

## Error Handling

### Account-Specific Errors

1. **Close Account with Balance**
   - Error: "Cannot close account with non-zero balance without transfer account"
   - Solution: Provide `transferAccountId` parameter

2. **Delete Account with Transactions**
   - Error: "Cannot delete account with existing transactions"
   - Solution: User must delete transactions first or use close instead

3. **Invalid Account Type**
   - Error: "Invalid account type. Must be one of: checking, savings, credit, ..."
   - Solution: Provide valid account type from enum

4. **Duplicate Account Name**
   - Error: "Account with name '{name}' already exists"
   - Solution: Choose a unique account name

## Testing Strategy

### Unit Tests

1. **Input Parser Tests**
   - Validate operation types
   - Validate required fields for each operation
   - Validate account type enum
   - Test name resolution (if applicable)

2. **Data Fetcher Tests**
   - Test create with initial balance
   - Test update with partial fields
   - Test delete operation
   - Test close with transfer
   - Test reopen operation
   - Test balance query

3. **Report Generator Tests**
   - Test create confirmation message
   - Test update confirmation message
   - Test delete confirmation message
   - Test close confirmation message
   - Test balance response format

### Integration Tests

1. **End-to-End Account Lifecycle**
   - Create account
   - Update account name
   - Add transactions
   - Close account with transfer
   - Reopen account
   - Delete account

2. **Error Scenarios**
   - Create with invalid type
   - Close with balance but no transfer
   - Delete with transactions
   - Update non-existent account

### Manual Testing

1. **Account Creation**
   - Create checking account
   - Create savings account with initial balance
   - Create credit card account
   - Verify accounts appear in get-accounts

2. **Account Management**
   - Update account name
   - Update account type
   - Toggle offbudget status
   - Query account balance

3. **Account Closure**
   - Close account with zero balance
   - Close account with balance and transfer
   - Reopen closed account
   - Verify closed accounts in UI

## Implementation Approach

### Phase 1: Add API Wrapper for updateTransaction

1. Add `updateTransaction` wrapper to `actual-api.ts`
2. Update manage-transaction data-fetcher to use wrapper
3. Add cache invalidation
4. Add tests

**Effort**: 1-2 hours

### Phase 2: Create manage-account Tool

1. Create tool structure following manage-transaction pattern
   - `src/tools/manage-account/index.ts`
   - `src/tools/manage-account/types.ts`
   - `src/tools/manage-account/input-parser.ts`
   - `src/tools/manage-account/data-fetcher.ts`
   - `src/tools/manage-account/report-generator.ts`

2. Implement operations:
   - create (with optional initialBalance)
   - update
   - delete
   - close (with optional transfer)
   - reopen
   - balance (query)

3. Add comprehensive tests
4. Register tool in `src/tools/index.ts`
5. Update documentation

**Effort**: 8-12 hours

### Phase 3: Documentation and Examples

1. Update README with account management examples
2. Add to API documentation
3. Create usage examples
4. Update CHANGELOG

**Effort**: 2-3 hours

## Performance Considerations

### Cache Strategy

- Invalidate `accounts:all` cache on create, update, delete, close, reopen
- No caching needed for balance queries (calculated on demand)

### API Calls

- All operations require single API call
- Close with transfer creates transfer transaction (handled by API)
- Balance query is efficient (uses internal calculation)

## Security Considerations

### Write Permissions

- All account operations require write permissions
- Balance query is read-only, no write permission needed

### Validation

- Validate account type against enum
- Validate transfer account exists for close operation
- Validate account exists before update/delete/close/reopen

## Migration Strategy

### Backward Compatibility

- No breaking changes to existing tools
- New tool is additive only
- Existing update-account tool remains functional

### Deprecation Plan

- Consider deprecating standalone update-account tool in future
- Migrate users to manage-account tool
- Maintain backward compatibility for at least 2 major versions

## Summary

### Current CRUD Coverage

| Entity | Create | Read | Update | Delete | Status |
|--------|--------|------|--------|--------|--------|
| Transactions | ✅ | ✅ | ✅ | ✅ | Complete |
| Accounts | ❌ | ✅ | ✅ | ❌ | Incomplete |
| Categories | ✅ | ✅ | ✅ | ✅ | Complete |
| Category Groups | ✅ | ✅ | ✅ | ✅ | Complete |
| Payees | ✅ | ✅ | ✅ | ✅ | Complete |
| Rules | ✅ | ✅ | ✅ | ✅ | Complete |
| Schedules | ✅ | ✅ | ✅ | ✅ | Complete |

### Priority Recommendations

1. **High Priority**: Create manage-account tool with create, delete, close, reopen operations
2. **Medium Priority**: Add updateTransaction API wrapper for consistency
3. **Low Priority**: Add account balance query tool
4. **Future**: Consider consolidating update-account into manage-account

### Success Metrics

- All entities have complete CRUD coverage
- All API wrappers follow consistent patterns
- All tools have comprehensive test coverage
- Documentation is complete and includes examples
