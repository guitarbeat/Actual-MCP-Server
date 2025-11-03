# Actual Budget API Implementation Review

This document reviews the implementation against the [Actual Budget API Reference](https://actualbudget.org/docs/api/reference/).

## Summary

The implementation covers most of the Actual Budget API methods, but there are several issues that need to be addressed:

1. **Critical Issues** - Incorrect method signatures that will cause runtime errors
2. **Missing Methods** - API methods that are documented but not implemented
3. **Minor Issues** - Type mismatches or parameter naming inconsistencies

---

## Critical Issues

### 1. Budget API Method Signatures

The following methods have incorrect signatures compared to the API reference:

#### `setBudgetCarryover`

**Current Implementation:**
```typescript
// src/actual-api.ts:329
setBudgetCarryover(categoryId: string, flag: boolean)
```

**API Reference:**
```typescript
setBudgetCarryover(month: month, categoryId: id, flag: bool) → Promise<null>
```

**Issue:** Missing `month` parameter. The API requires the month (YYYY-MM format) as the first parameter.

**Affected Files:**
- `src/actual-api.ts:329`
- `src/tools/budget/set-budget-carryover/index.ts:38`

---

#### `holdBudgetForNextMonth`

**Current Implementation:**
```typescript
// src/actual-api.ts:337
holdBudgetForNextMonth(categoryId: string, flag: boolean)
```

**API Reference:**
```typescript
holdBudgetForNextMonth(month: month, amount: value) → Promise<null>
```

**Issue:** Completely wrong signature. The API takes `month` and `amount`, not `categoryId` and `flag`.

**Affected Files:**
- `src/actual-api.ts:337`
- `src/tools/budget/hold-budget-for-next-month/index.ts:38`

---

#### `resetBudgetHold`

**Current Implementation:**
```typescript
// src/actual-api.ts:345
resetBudgetHold(categoryId: string)
```

**API Reference:**
```typescript
resetBudgetHold(month: month) → Promise<null>
```

**Issue:** Wrong parameter. The API takes `month`, not `categoryId`.

**Affected Files:**
- `src/actual-api.ts:345`
- `src/tools/budget/reset-budget-hold/index.ts:31`

---

## Missing Methods

### 2. Budget Methods

#### `getBudgetMonths`
**API Reference:**
```typescript
getBudgetMonths() → Promise<month[]>
```
**Status:** Not implemented
**Impact:** Cannot retrieve list of months with budget data

#### `getBudgetMonth`
**API Reference:**
```typescript
getBudgetMonth(month: month) → Promise<Budget>
```
**Status:** Not implemented
**Impact:** Cannot retrieve budget data for a specific month

---

### 3. Transaction Methods

#### `importTransactions`
**API Reference:**
```typescript
importTransactions(accountId: id, transactions: Transaction[]) 
  → Promise<{ errors, added, updated }>
```
**Status:** Not implemented (only `addTransactions` is used)
**Impact:** Missing duplicate detection and reconciliation features that `importTransactions` provides. The `create-transaction` tool uses `addTransactions` which doesn't avoid duplicates.

**Note:** According to the API docs, `importTransactions`:
- Runs all rules on transactions before adding
- Reconciles transactions to avoid duplicates
- Creates transfers automatically
- Returns detailed results with `added`, `updated`, and `errors` arrays

---

### 4. Misc Methods

#### `runQuery`
**API Reference:**
```typescript
runQuery({ ActualQLquery }) → Promise<unknown>
```
**Status:** Not implemented
**Impact:** Cannot run arbitrary ActualQL queries for advanced data retrieval

#### `getServerVersion`
**API Reference:**
```typescript
getServerVersion() → Promise<{error?: string;} | {version: string;}>
```
**Status:** Not implemented
**Impact:** Cannot check server version for compatibility

---

## Minor Issues

### 5. `get-id-by-name` Tool Type Mismatch

**Current Implementation:**
```typescript
// src/tools/utilities/get-id-by-name/index.ts:20
enum: ['account', 'category', 'payee', 'category-group']
```

**API Reference:**
```typescript
getIDByName({ type: string, string: string })
// Allowed types: 'accounts', 'schedules', 'categories', 'payees'
```

**Issues:**
1. Uses singular forms ('account', 'category') but API expects plural ('accounts', 'categories')
2. Uses 'category-group' but API expects 'categories' (categories are found directly, not groups)
3. Missing 'schedules' type
4. The actual API method `getIDByName` should be used instead of manual searching

**Affected Files:**
- `src/tools/utilities/get-id-by-name/index.ts`

**Note:** The current implementation manually searches through entities, but the API provides `getIDByName` which should be used instead.

---

### 6. Transaction Creation - Missing `importTransactions` Option

The `create-transaction` tool uses `addTransactions` which doesn't provide:
- Duplicate detection
- Automatic rule execution
- Detailed error reporting

Consider using `importTransactions` for better transaction handling.

**Affected Files:**
- `src/tools/create-transaction/data-fetcher.ts:139`

---

## Correctly Implemented Methods

The following methods appear to match the API reference correctly:

### Accounts
- ✅ `getAccounts()` 
- ✅ `createAccount(args)`
- ✅ `updateAccount(id, args)`
- ✅ `closeAccount(id)`
- ✅ `reopenAccount(id)`
- ✅ `deleteAccount(id)`
- ✅ `getAccountBalance(accountId, date?)`

### Categories
- ✅ `getCategories()`
- ✅ `createCategory(args)`
- ✅ `updateCategory(id, args)`
- ✅ `deleteCategory(id)`

### Category Groups
- ✅ `getCategoryGroups()`
- ✅ `createCategoryGroup(args)`
- ✅ `updateCategoryGroup(id, args)`
- ✅ `deleteCategoryGroup(id)`

### Payees
- ✅ `getPayees()`
- ✅ `createPayee(args)`
- ✅ `updatePayee(id, args)`
- ✅ `deletePayee(id)`
- ✅ `mergePayees(targetId, sourceIds)`
- ✅ `getPayeeRules(payeeId)`

### Rules
- ✅ `getRules()`
- ✅ `createRule(args)`
- ✅ `updateRule(args)` - Note: API takes `id` and `fields`, but implementation may need verification
- ✅ `deleteRule(id)`

### Schedules
- ✅ `getSchedules()`
- ✅ `createSchedule(args)`
- ✅ `updateSchedule(id, args)`
- ✅ `deleteSchedule(id)`

### Transactions
- ✅ `getTransactions(accountId, start, end)`
- ✅ `addTransactions(accountId, transactions, options?)`
- ✅ `updateTransaction(id, fields)`
- ⚠️ `deleteTransaction` - Not found in tools, but may exist in API

### Budget
- ✅ `setBudgetAmount(month, categoryId, amount)` - Correctly implemented

### Misc
- ✅ `init(config)`
- ✅ `shutdown()`
- ✅ `sync()`
- ✅ `runBankSync(accountId?)`
- ✅ `runImport(budgetName, func)` - Implementation exists but signature may differ
- ✅ `getBudgets()`
- ✅ `loadBudget(syncId)`
- ✅ `downloadBudget(syncId, password?)`
- ✅ `batchBudgetUpdates(updates?)` - Implementation exists

---

## Status: ✅ Fixed

All critical issues and most missing methods have been implemented:

### ✅ Fixed (Priority 1)
1. ✅ Fixed `setBudgetCarryover` to include `month` parameter - **COMPLETED**
2. ✅ Fixed `holdBudgetForNextMonth` signature completely (month + amount) - **COMPLETED**
3. ✅ Fixed `resetBudgetHold` to take `month` instead of `categoryId` - **COMPLETED**

### ✅ Implemented (Priority 2)
1. ✅ Implemented `getBudgetMonths()` and `getBudgetMonth(month)` - **COMPLETED**
2. ✅ Implemented `importTransactions()` - **COMPLETED** (available in actual-api.ts, consider using in create-transaction tool)
3. ✅ Implemented `runQuery()` for advanced queries - **COMPLETED**
4. ✅ Implemented `getServerVersion()` - **COMPLETED**

### ✅ Improved (Priority 3)
1. ✅ Updated `get-id-by-name` tool to use API's `getIDByName` method directly - **COMPLETED**
2. ✅ Fixed type names to match API reference ('accounts', 'categories', 'payees', 'schedules') - **COMPLETED**
3. ✅ Updated `create-transaction` to use `importTransactions` for better duplicate handling - **COMPLETED**

## All Issues Resolved ✅

All critical issues, missing methods, and optional improvements have been completed.

---

## Testing Recommendations

After fixing the issues, test the following:

1. **Budget Methods:**
   - Set carryover for a category in a specific month
   - Hold budget amount for next month
   - Reset budget hold for a month
   - Retrieve budget months and specific month budget data

2. **Transaction Import:**
   - Create transactions with duplicate detection
   - Verify rule execution on imported transactions

3. **Utility Methods:**
   - Test `getIDByName` with correct type names
   - Test `runQuery` with various ActualQL queries

---

## Notes

- The `actual-api.ts` file is a wrapper around `@actual-app/api`. Some signature mismatches might be due to differences between the wrapper and the actual API library.
- Consider checking the actual `@actual-app/api` package source to verify if the wrapper signatures match the underlying library.
- Some methods like `runImport` and `batchBudgetUpdates` have conditional existence checks, suggesting API version differences.
