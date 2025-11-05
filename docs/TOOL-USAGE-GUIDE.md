# Actual Budget MCP Server - Tool Usage Guide

## Overview

This guide provides comprehensive workflow examples, common patterns, troubleshooting tips, and quick references for using the Actual Budget MCP Server tools effectively. It's designed to help both AI agents and human developers understand when and how to use each tool.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Common Workflows](#common-workflows)
3. [Tool Categories](#tool-categories)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Best Practices](#best-practices)

---

## Quick Reference

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Query Tools** | get-accounts, get-transactions, get-grouped-categories, get-payees, get-rules, get-schedules | Retrieve data |
| **Management Tools** | manage-transaction, manage-account, manage-entity | Create, update, delete entities |
| **Budget Tools** | set-budget, hold-budget-for-next-month, reset-budget-hold, get-budget-month, get-budget-months | Budget operations |
| **Analysis Tools** | monthly-summary, spending-by-category, balance-history | Financial insights |
| **Utility Tools** | merge-payees, get-payee-rules, run-bank-sync, run-import, run-query | Advanced operations |

### Most Common Tools

1. **get-accounts** - Start here to find account IDs
2. **get-transactions** - View transaction history
3. **manage-transaction** - Create/update/delete transactions
4. **get-grouped-categories** - Find category IDs
5. **set-budget** - Set monthly budgets
6. **spending-by-category** - Analyze spending patterns
7. **monthly-summary** - Get financial overview

### Format Quick Reference

- **Dates**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Months**: `YYYY-MM` (e.g., `2024-01`)
- **Amounts**: Cents as integers (e.g., `5000` = $50.00)
  - Negative for expenses/outflows
  - Positive for income/inflows
- **IDs**: UUIDs or entity names (names preferred for readability)


---

## Common Workflows

### 1. Transaction Management Workflow

#### Creating a New Transaction

**Goal**: Record a new expense or income transaction

**Steps**:
1. Get account ID (if needed): `get-accounts`
2. Get category ID (if needed): `get-grouped-categories`
3. Get payee ID (if needed): `get-payees`
4. Create transaction: `manage-transaction` with operation="create"
5. Verify creation: `get-transactions` to confirm

**Example**:
```json
// Step 1: Find account (optional - can use name)
{"tool": "get-accounts"}

// Step 2: Create transaction using names
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "account": "Checking",
      "date": "2024-01-15",
      "amount": -5000,
      "payee": "Grocery Store",
      "category": "Groceries",
      "notes": "Weekly shopping"
    }
  }
}

// Step 3: Verify
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-15",
    "endDate": "2024-01-15"
  }
}
```

#### Updating an Existing Transaction

**Goal**: Modify transaction details

**Steps**:
1. Find transaction ID: `get-transactions` with filters
2. Update transaction: `manage-transaction` with operation="update"
3. Verify update: `get-transactions` to confirm changes

**Example**:
```json
// Step 1: Find transaction
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "payeeName": "Grocery Store",
    "startDate": "2024-01-15"
  }
}

// Step 2: Update (using ID from step 1)
{
  "tool": "manage-transaction",
  "args": {
    "operation": "update",
    "id": "transaction-id-here",
    "transaction": {
      "amount": -5500,
      "notes": "Updated amount"
    }
  }
}
```

#### Deleting a Transaction

**Goal**: Remove an incorrect or duplicate transaction

**Steps**:
1. Find transaction ID: `get-transactions` with filters
2. Delete transaction: `manage-transaction` with operation="delete"
3. Verify deletion: `get-transactions` to confirm removal

**Example**:
```json
// Step 1: Find transaction
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-15",
    "limit": 10
  }
}

// Step 2: Delete (WARNING: Cannot be undone!)
{
  "tool": "manage-transaction",
  "args": {
    "operation": "delete",
    "id": "transaction-id-here"
  }
}
```


### 2. Account Management Workflow

#### Creating a New Account

**Goal**: Add a new bank account, credit card, or other account

**Steps**:
1. Create account: `manage-account` with operation="create"
2. Optionally set initial balance
3. Verify creation: `get-accounts` to confirm

**Example**:
```json
// Create checking account with initial balance
{
  "tool": "manage-account",
  "args": {
    "operation": "create",
    "account": {
      "name": "Chase Checking",
      "type": "checking"
    },
    "initialBalance": 100000
  }
}

// Verify
{"tool": "get-accounts"}
```

#### Closing an Account

**Goal**: Close an account while preserving transaction history

**Steps**:
1. Check account balance: `manage-account` with operation="balance"
2. If balance ≠ 0, identify transfer destination: `get-accounts`
3. Close account: `manage-account` with operation="close"
4. Verify closure: `get-accounts` with includeClosed=true

**Example**:
```json
// Step 1: Check balance
{
  "tool": "manage-account",
  "args": {
    "operation": "balance",
    "id": "account-id-here"
  }
}

// Step 2: Close with balance transfer
{
  "tool": "manage-account",
  "args": {
    "operation": "close",
    "id": "account-id-here",
    "transferAccountId": "destination-account-id",
    "transferCategoryId": "category-id"
  }
}
```

### 3. Budget Management Workflow

#### Setting Monthly Budgets

**Goal**: Set budget amounts for categories

**Steps**:
1. Get category list: `get-grouped-categories`
2. Set budget: `set-budget` for each category
3. Track spending: `spending-by-category` to monitor

**Example**:
```json
// Step 1: Get categories
{"tool": "get-grouped-categories"}

// Step 2: Set budget (can use category name)
{
  "tool": "set-budget",
  "args": {
    "month": "2024-01",
    "category": "Groceries",
    "amount": 50000,
    "carryover": true
  }
}

// Step 3: Track spending
{
  "tool": "spending-by-category",
  "args": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

#### Budget Carryover Management

**Goal**: Hold budget for next month or reset holds

**Steps**:
1. Hold budget: `hold-budget-for-next-month`
2. Or reset hold: `reset-budget-hold`
3. Verify: `get-budget-month` to check status

**Example**:
```json
// Hold budget for next month
{
  "tool": "hold-budget-for-next-month",
  "args": {
    "month": "2024-01",
    "category": "Emergency Fund",
    "amount": 100000
  }
}

// Reset hold if needed
{
  "tool": "reset-budget-hold",
  "args": {
    "month": "2024-02",
    "category": "Emergency Fund"
  }
}
```


### 4. Financial Analysis Workflow

#### Monthly Financial Review

**Goal**: Understand income, expenses, and savings for a month

**Steps**:
1. Get overview: `monthly-summary` for the month
2. Drill into categories: `spending-by-category` for details
3. Review specific transactions: `get-transactions` for line items
4. Check account balances: `balance-history` for trends

**Example**:
```json
// Step 1: Monthly overview
{
  "tool": "monthly-summary",
  "args": {
    "startMonth": "2024-01",
    "endMonth": "2024-01"
  }
}

// Step 2: Category breakdown
{
  "tool": "spending-by-category",
  "args": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}

// Step 3: Drill into specific category
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "categoryName": "Groceries",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}

// Step 4: Balance trends
{
  "tool": "balance-history",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

#### Spending Pattern Analysis

**Goal**: Identify spending trends and anomalies

**Steps**:
1. Get category spending: `spending-by-category` for period
2. Compare to budget: `get-budget-month` for targets
3. Find large transactions: `get-transactions` with minAmount filter
4. Review specific payees: `get-transactions` with payeeName filter

**Example**:
```json
// Step 1: Category spending
{
  "tool": "spending-by-category",
  "args": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "accounts": ["Checking", "Credit Card"]
  }
}

// Step 2: Find large expenses
{
  "tool": "get-transactions",
  "args": {
    "account": "Credit Card",
    "minAmount": 100,
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }
}

// Step 3: Review specific merchant
{
  "tool": "get-transactions",
  "args": {
    "account": "Credit Card",
    "payeeName": "Amazon",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }
}
```


### 5. Category and Entity Management Workflow

#### Creating a New Category

**Goal**: Add a new category to organize transactions

**Steps**:
1. Find category group: `get-grouped-categories`
2. Create category: `manage-entity` with entityType="category"
3. Verify creation: `get-grouped-categories` to confirm

**Example**:
```json
// Step 1: Find group ID
{"tool": "get-grouped-categories"}

// Step 2: Create category
{
  "tool": "manage-entity",
  "args": {
    "entityType": "category",
    "operation": "create",
    "data": {
      "name": "Streaming Services",
      "group_id": "entertainment-group-id"
    }
  }
}
```

#### Creating Transaction Rules

**Goal**: Auto-categorize transactions based on conditions

**Steps**:
1. Get payee IDs: `get-payees`
2. Get category IDs: `get-grouped-categories`
3. Create rule: `manage-entity` with entityType="rule"
4. Verify: `get-rules` to confirm

**Example**:
```json
// Step 1 & 2: Get IDs (or use names)
{"tool": "get-payees"}
{"tool": "get-grouped-categories"}

// Step 3: Create rule
{
  "tool": "manage-entity",
  "args": {
    "entityType": "rule",
    "operation": "create",
    "data": {
      "conditions": [
        {
          "field": "payee",
          "op": "is",
          "value": "payee-id-here"
        }
      ],
      "actions": [
        {
          "field": "category",
          "value": "category-id-here"
        }
      ]
    }
  }
}
```

#### Creating Recurring Schedules

**Goal**: Set up recurring transactions (rent, subscriptions, etc.)

**Steps**:
1. Get account ID: `get-accounts`
2. Get payee/category IDs: `get-payees`, `get-grouped-categories`
3. Create schedule: `manage-entity` with entityType="schedule"
4. Verify: `get-schedules` to confirm

**Example**:
```json
// Step 1: Get account
{"tool": "get-accounts"}

// Step 2: Create schedule
{
  "tool": "manage-entity",
  "args": {
    "entityType": "schedule",
    "operation": "create",
    "data": {
      "name": "Monthly Rent",
      "account": "checking-account-id",
      "amount": -150000,
      "date": "2024-01-01",
      "frequency": "monthly",
      "payee": "Landlord",
      "category": "Housing"
    }
  }
}
```


### 6. Data Import and Sync Workflow

#### Importing Transactions from File

**Goal**: Import transactions from CSV, OFX, or QIF file

**Steps**:
1. Ensure file is on server filesystem
2. Get account ID: `get-accounts`
3. Import: `run-import` with file path and account
4. Verify: `get-transactions` to check imported data

**Example**:
```json
// Step 1: Get account
{"tool": "get-accounts"}

// Step 2: Import
{
  "tool": "run-import",
  "args": {
    "accountId": "account-id-here",
    "filePath": "/path/to/transactions.csv"
  }
}

// Step 3: Verify recent imports
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "limit": 50
  }
}
```

#### Bank Sync

**Goal**: Sync transactions from connected bank account

**Steps**:
1. Ensure bank sync is configured
2. Get account ID: `get-accounts`
3. Run sync: `run-bank-sync`
4. Verify: `get-transactions` to check new data

**Example**:
```json
// Step 1: Get account
{"tool": "get-accounts"}

// Step 2: Sync
{
  "tool": "run-bank-sync",
  "args": {
    "accountId": "account-id-here"
  }
}
```

### 7. Payee Management Workflow

#### Merging Duplicate Payees

**Goal**: Consolidate duplicate payee entries

**Steps**:
1. Find payees: `get-payees`
2. Identify duplicates and choose target
3. Merge: `merge-payees` (WARNING: Permanent!)
4. Verify: `get-payees` to confirm merge

**Example**:
```json
// Step 1: Find payees
{"tool": "get-payees"}

// Step 2: Merge duplicates (source payees will be deleted)
{
  "tool": "merge-payees",
  "args": {
    "targetPayeeId": "keep-this-payee-id",
    "sourcePayeeIds": ["delete-this-id", "and-this-id"]
  }
}
```

#### Viewing Payee Rules

**Goal**: See auto-categorization rules for a payee

**Steps**:
1. Find payee: `get-payees`
2. Get rules: `get-payee-rules` with payee ID
3. Optionally modify: `manage-entity` with entityType="rule"

**Example**:
```json
// Step 1: Find payee
{"tool": "get-payees"}

// Step 2: Get rules
{
  "tool": "get-payee-rules",
  "args": {
    "payeeId": "payee-id-here"
  }
}
```


---

## Tool Categories

### Query Tools (Read-Only)

These tools retrieve data without making changes.

#### get-accounts
**Purpose**: List all accounts with balances  
**When to use**: First step in most workflows to find account IDs  
**Returns**: Account ID, name, balance, type, status  
**Common filters**: account name, includeClosed

#### get-transactions
**Purpose**: Retrieve transaction history with filtering  
**When to use**: View transactions, find transaction IDs, analyze spending  
**Returns**: Transaction details with enriched data  
**Common filters**: date range, amount range, category, payee

#### get-grouped-categories
**Purpose**: List all category groups and categories  
**When to use**: Find category IDs, understand budget structure  
**Returns**: Category groups with nested categories and budget info

#### get-payees
**Purpose**: List all payees  
**When to use**: Find payee IDs, see available payees  
**Returns**: Payee ID, name, category, transfer account

#### get-rules
**Purpose**: List all transaction rules  
**When to use**: Review auto-categorization rules  
**Returns**: Rule conditions and actions

#### get-schedules
**Purpose**: List all recurring schedules  
**When to use**: Review scheduled transactions  
**Returns**: Schedule details including frequency

#### get-budget-months
**Purpose**: List all available budget months  
**When to use**: Find which months have budget data  
**Returns**: Array of month strings (YYYY-MM)

#### get-budget-month
**Purpose**: Get detailed budget data for a specific month  
**When to use**: Review budget allocations and spending  
**Returns**: Category budgets, spending, and balances

#### get-payee-rules
**Purpose**: Get rules associated with a specific payee  
**When to use**: Understand how a payee is auto-categorized  
**Returns**: Rules that match the payee


### Management Tools (Write Operations)

These tools create, update, or delete data. Use with caution!

#### manage-transaction
**Purpose**: Create, update, or delete transactions  
**Operations**: create, update, delete  
**When to use**: Record new transactions, fix errors, remove duplicates  
**Requires**: Account, date, amount for create; ID for update/delete  
**Warning**: Delete is permanent!

#### manage-account
**Purpose**: Complete account lifecycle management  
**Operations**: create, update, delete, close, reopen, balance  
**When to use**: Add accounts, rename, close old accounts, check balances  
**Requires**: Varies by operation  
**Warning**: Delete is permanent! Use close for accounts with transactions.

#### manage-entity
**Purpose**: CRUD operations for categories, groups, payees, rules, schedules  
**Entity types**: category, categoryGroup, payee, rule, schedule  
**Operations**: create, update, delete  
**When to use**: Organize budget structure, set up automation  
**Requires**: Entity-specific data structures  
**Warning**: Delete is permanent!

### Budget Tools (Write Operations)

These tools manage budget allocations and carryover.

#### set-budget
**Purpose**: Set budget amount and/or carryover for a category  
**When to use**: Allocate monthly budget, enable/disable carryover  
**Requires**: month (YYYY-MM), category, amount and/or carryover  
**Note**: Amount in cents, can use category name or ID

#### hold-budget-for-next-month
**Purpose**: Hold unspent budget for next month  
**When to use**: Save unspent funds for future use  
**Requires**: month, category, amount  
**Note**: Creates a hold that carries to next month

#### reset-budget-hold
**Purpose**: Remove budget hold  
**When to use**: Release held budget back to available funds  
**Requires**: month, category  
**Note**: Safe to call even if no hold exists


### Analysis Tools (Read-Only)

These tools provide financial insights and summaries.

#### monthly-summary
**Purpose**: Get monthly income, expenses, and savings metrics  
**When to use**: Financial overview, track savings rate, compare months  
**Parameters**: startMonth, endMonth (optional, defaults to current month)  
**Returns**: Income, expenses, savings, savings rate per month

#### spending-by-category
**Purpose**: Generate spending breakdown by category  
**When to use**: Analyze spending patterns, compare to budget  
**Parameters**: startDate, endDate, accounts (optional)  
**Returns**: Spending by category group and category

#### balance-history
**Purpose**: View account balance changes over time  
**When to use**: Track balance trends, identify unusual changes  
**Parameters**: account, startDate, endDate (optional)  
**Returns**: Daily balance snapshots

### Utility Tools

These tools provide advanced functionality.

#### merge-payees
**Purpose**: Consolidate duplicate payees  
**When to use**: Clean up payee list, merge variations  
**Requires**: targetPayeeId, sourcePayeeIds (array)  
**Warning**: Source payees are permanently deleted!

#### run-bank-sync
**Purpose**: Sync transactions from connected bank  
**When to use**: Update with latest bank transactions  
**Requires**: accountId, bank sync configuration  
**Note**: Requires SimpleFIN or GoCardless setup

#### run-import
**Purpose**: Import transactions from file  
**When to use**: Bulk import from CSV, OFX, or QIF  
**Requires**: accountId, filePath (on server filesystem)  
**Formats**: CSV, OFX, QIF  
**Note**: May create duplicates if transactions already exist

#### run-query
**Purpose**: Execute custom ActualQL queries  
**When to use**: Advanced queries not covered by other tools  
**Requires**: ActualQL knowledge  
**Warning**: Advanced tool, use standard tools when possible  
**Note**: Read-only, but powerful for complex queries


---

## Common Patterns

### Pattern 1: Name Resolution

**Problem**: Need to use entity IDs but only know names  
**Solution**: Most tools accept names OR IDs

```json
// Both of these work:
{"account": "Checking"}
{"account": "uuid-here"}

// Same for categories and payees:
{"category": "Groceries"}
{"payee": "Whole Foods"}
```

**When to use IDs**:
- Exact match required (multiple entities with similar names)
- Performance critical operations
- Programmatic access

**When to use names**:
- Human-readable requests
- Conversational AI interactions
- Quick one-off operations

### Pattern 2: Prerequisite Tool Chain

**Problem**: Need IDs from one tool to use in another  
**Solution**: Chain tools in sequence

```
get-accounts → manage-transaction
get-grouped-categories → set-budget
get-payees → manage-entity (rule)
get-transactions → manage-transaction (update/delete)
```

**Example**:
```json
// 1. Get account ID
{"tool": "get-accounts"}
// Response: [{id: "acc_123", name: "Checking"}]

// 2. Use ID in transaction
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "account": "acc_123",  // or just "Checking"
      "date": "2024-01-15",
      "amount": -5000
    }
  }
}
```

### Pattern 3: Filter Refinement

**Problem**: Too many results, need to narrow down  
**Solution**: Use multiple filters together

```json
// Start broad
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}

// Refine with more filters
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "categoryName": "Groceries",
    "minAmount": 50
  }
}
```

### Pattern 4: Verify After Write

**Problem**: Need to confirm write operation succeeded  
**Solution**: Always follow write with read

```json
// 1. Write operation
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {...}
  }
}

// 2. Verify
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-15",
    "limit": 1
  }
}
```

### Pattern 5: Batch Operations

**Problem**: Need to perform same operation multiple times  
**Solution**: Use loops or multiple calls

```json
// Set budgets for multiple categories
[
  {
    "tool": "set-budget",
    "args": {"month": "2024-01", "category": "Groceries", "amount": 50000}
  },
  {
    "tool": "set-budget",
    "args": {"month": "2024-01", "category": "Gas", "amount": 20000}
  },
  {
    "tool": "set-budget",
    "args": {"month": "2024-01", "category": "Dining", "amount": 30000}
  }
]
```


### Pattern 6: Error Recovery

**Problem**: Operation failed, need to retry or fix  
**Solution**: Read error message, adjust, retry

```json
// Failed operation
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "account": "Chequing",  // Typo!
      "date": "2024-01-15",
      "amount": -5000
    }
  }
}
// Error: "Account 'Chequing' not found. Available: Checking, Savings"

// Fix and retry
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "account": "Checking",  // Fixed!
      "date": "2024-01-15",
      "amount": -5000
    }
  }
}
```

### Pattern 7: Progressive Disclosure

**Problem**: Don't know what data is available  
**Solution**: Start with list tools, then drill down

```
1. get-accounts → See all accounts
2. get-transactions → See transactions for one account
3. get-grouped-categories → See category structure
4. spending-by-category → See spending breakdown
5. get-transactions (filtered) → See specific transactions
```

### Pattern 8: Amount Conversion

**Problem**: Need to convert between dollars and cents  
**Solution**: Multiply/divide by 100

```javascript
// Dollars to cents (for API)
$50.00 → 5000
$123.45 → 12345
-$75.50 → -7550

// Cents to dollars (from API)
5000 → $50.00
12345 → $123.45
-7550 → -$75.50
```

**In JSON**:
```json
// Always use cents in API calls
{"amount": 5000}  // $50.00
{"amount": -7550}  // -$75.50 (expense)
```

### Pattern 9: Date Range Queries

**Problem**: Need to query specific time periods  
**Solution**: Use appropriate date ranges

```json
// Current month
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

// Last 30 days
{
  "startDate": "2024-01-01",  // Calculate: today - 30 days
  "endDate": "2024-01-31"     // Today
}

// Year to date
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"     // Today
}

// Specific quarter (Q1)
{
  "startDate": "2024-01-01",
  "endDate": "2024-03-31"
}
```

### Pattern 10: Entity Hierarchy Navigation

**Problem**: Need to understand entity relationships  
**Solution**: Follow the hierarchy

```
Category Groups
  └─ Categories
       └─ Transactions

Accounts
  └─ Transactions

Payees
  ├─ Transactions
  └─ Rules

Schedules
  └─ Future Transactions
```

**Example**:
```json
// 1. Get category groups
{"tool": "get-grouped-categories"}
// Returns: [{id: "grp_1", name: "Food", categories: [...]}]

// 2. Find category in group
// Returns: [{id: "cat_1", name: "Groceries", group_id: "grp_1"}]

// 3. Get transactions for category
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "categoryName": "Groceries"
  }
}
```


---

## Troubleshooting Guide

### Common Errors and Solutions

#### Error: "Account not found"

**Cause**: Account name doesn't match exactly or account doesn't exist

**Solutions**:
1. List all accounts: `get-accounts`
2. Check spelling and capitalization
3. Use account ID instead of name for exact match
4. Verify account isn't closed (use `includeClosed: true`)

**Example**:
```json
// Error
{"account": "checking"}  // Wrong case

// Fix
{"account": "Checking"}  // Correct case
// Or use ID
{"account": "acc_123"}
```

#### Error: "Category not found"

**Cause**: Category name doesn't match or category doesn't exist

**Solutions**:
1. List all categories: `get-grouped-categories`
2. Check spelling and capitalization
3. Use category ID for exact match
4. Create category if it doesn't exist: `manage-entity`

**Example**:
```json
// List categories first
{"tool": "get-grouped-categories"}

// Use exact name from list
{"category": "Groceries"}
```

#### Error: "Invalid date format"

**Cause**: Date not in YYYY-MM-DD or YYYY-MM format

**Solutions**:
1. Use YYYY-MM-DD for dates: `2024-01-15`
2. Use YYYY-MM for months: `2024-01`
3. Don't use slashes or other separators
4. Ensure month and day are zero-padded

**Example**:
```json
// Wrong
{"date": "1/15/2024"}
{"date": "2024-1-15"}
{"month": "January 2024"}

// Right
{"date": "2024-01-15"}
{"month": "2024-01"}
```

#### Error: "Amount must be a number"

**Cause**: Amount includes currency symbols or is a string

**Solutions**:
1. Remove currency symbols ($, €, etc.)
2. Convert to cents (multiply by 100)
3. Use negative for expenses, positive for income
4. Ensure it's a number, not a string

**Example**:
```json
// Wrong
{"amount": "$50.00"}
{"amount": "50"}

// Right
{"amount": 5000}  // $50.00 in cents
{"amount": -5000}  // -$50.00 expense
```

#### Error: "Transaction not found"

**Cause**: Transaction ID is incorrect or transaction was deleted

**Solutions**:
1. Find transaction first: `get-transactions` with filters
2. Copy exact ID from response
3. Verify transaction still exists
4. Check if it was already deleted

**Example**:
```json
// Step 1: Find transaction
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "payeeName": "Grocery Store",
    "startDate": "2024-01-15"
  }
}

// Step 2: Use exact ID from response
{
  "tool": "manage-transaction",
  "args": {
    "operation": "update",
    "id": "exact-id-from-response"
  }
}
```


#### Error: "Cannot close account with balance"

**Cause**: Account has non-zero balance and no transfer destination specified

**Solutions**:
1. Check balance: `manage-account` with operation="balance"
2. Specify transfer account: `transferAccountId`
3. Optionally specify category: `transferCategoryId`
4. Or zero out balance first with transactions

**Example**:
```json
// Check balance first
{
  "tool": "manage-account",
  "args": {
    "operation": "balance",
    "id": "account-id"
  }
}

// Close with transfer
{
  "tool": "manage-account",
  "args": {
    "operation": "close",
    "id": "account-id",
    "transferAccountId": "destination-account-id",
    "transferCategoryId": "category-id"
  }
}
```

#### Error: "Cannot delete account with transactions"

**Cause**: Account has existing transactions

**Solutions**:
1. Use `close` operation instead of `delete`
2. Closing preserves transaction history
3. Delete is only for accounts with no transactions

**Example**:
```json
// Don't delete - use close instead
{
  "tool": "manage-account",
  "args": {
    "operation": "close",
    "id": "account-id"
  }
}
```

#### Error: "Required field missing"

**Cause**: Required parameter not provided

**Solutions**:
1. Check tool description for required fields
2. For create operations, provide all required fields
3. For update operations, provide ID
4. For delete operations, provide ID only

**Example**:
```json
// Wrong - missing required fields
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "amount": -5000
    }
  }
}

// Right - all required fields
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {
      "account": "Checking",  // Required
      "date": "2024-01-15",   // Required
      "amount": -5000         // Required
    }
  }
}
```

#### Error: "Invalid operation"

**Cause**: Operation not supported for this tool or entity type

**Solutions**:
1. Check tool description for valid operations
2. Verify operation spelling (create, update, delete)
3. Ensure entity type supports the operation

**Example**:
```json
// Wrong
{"operation": "modify"}  // Not a valid operation

// Right
{"operation": "update"}  // Valid operation
```


### Performance Issues

#### Slow Query Response

**Symptoms**: Tool takes a long time to respond

**Causes & Solutions**:
1. **Large date range**: Narrow down date range
2. **Multiple accounts**: Query one account at a time
3. **No filters**: Add filters to reduce result set
4. **First request**: First request is slower (600-2200ms) due to connection setup
5. **Subsequent requests**: Should be 70-90% faster (50-200ms)

**Example**:
```json
// Slow - too broad
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2020-01-01",
    "endDate": "2024-12-31"
  }
}

// Faster - narrower range
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 100
  }
}
```

#### Too Many Results

**Symptoms**: Response is very large or truncated

**Causes & Solutions**:
1. **No limit**: Add `limit` parameter
2. **Broad filters**: Add more specific filters
3. **Long date range**: Reduce date range

**Example**:
```json
// Add limit
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 50  // Limit results
  }
}
```

### Data Issues

#### Duplicate Transactions

**Symptoms**: Same transaction appears multiple times

**Causes & Solutions**:
1. **Multiple imports**: Avoid re-importing same file
2. **Bank sync + manual**: Disable one source
3. **Manual duplicates**: Delete duplicates with `manage-transaction`

**Example**:
```json
// Find duplicates
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "payeeName": "Grocery Store",
    "startDate": "2024-01-15",
    "endDate": "2024-01-15"
  }
}

// Delete duplicate
{
  "tool": "manage-transaction",
  "args": {
    "operation": "delete",
    "id": "duplicate-transaction-id"
  }
}
```

#### Missing Transactions

**Symptoms**: Expected transactions don't appear

**Causes & Solutions**:
1. **Wrong account**: Check account name/ID
2. **Wrong date range**: Expand date range
3. **Filtered out**: Remove filters
4. **Not imported**: Run import or sync

**Example**:
```json
// Expand search
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",  // Broader range
    "endDate": "2024-12-31"
  }
}
```

#### Incorrect Balances

**Symptoms**: Account balance doesn't match expected

**Causes & Solutions**:
1. **Pending transactions**: Check for uncleared transactions
2. **Wrong account**: Verify account ID
3. **Date mismatch**: Check balance date
4. **Missing transactions**: Import or sync

**Example**:
```json
// Check balance at specific date
{
  "tool": "manage-account",
  "args": {
    "operation": "balance",
    "id": "account-id",
    "date": "2024-01-31"
  }
}

// Check recent transactions
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```


### Workflow Issues

#### Can't Find IDs

**Symptoms**: Don't know what ID to use

**Solutions**:
1. Use names instead of IDs (most tools support this)
2. Use getter tools to find IDs:
   - `get-accounts` for account IDs
   - `get-grouped-categories` for category IDs
   - `get-payees` for payee IDs
   - `get-transactions` for transaction IDs

**Example**:
```json
// Option 1: Use names (easier)
{"account": "Checking"}
{"category": "Groceries"}

// Option 2: Get IDs first
{"tool": "get-accounts"}
// Then use ID
{"account": "acc_123"}
```

#### Don't Know Which Tool to Use

**Symptoms**: Multiple tools seem to do similar things

**Solutions**:
1. **Query data**: Use `get-*` tools
2. **Modify data**: Use `manage-*` tools
3. **Analyze data**: Use analysis tools (monthly-summary, spending-by-category)
4. **Set budgets**: Use `set-budget` or budget tools
5. **Check tool descriptions**: Each has "COMMON USE CASES" section

**Decision Tree**:
```
Need to...
├─ View data? → get-* tools
├─ Create/update/delete? → manage-* tools
├─ Analyze spending? → spending-by-category, monthly-summary
├─ Set budget? → set-budget
├─ Import data? → run-import, run-bank-sync
└─ Advanced query? → run-query
```

#### Operation Failed, Don't Know Why

**Symptoms**: Tool returns error without clear cause

**Solutions**:
1. Read error message carefully
2. Check for suggestions in error response
3. Verify all required fields are provided
4. Check data formats (dates, amounts, IDs)
5. Use getter tools to verify data exists
6. Try with simpler parameters first

**Example**:
```json
// Failed operation
{
  "tool": "manage-transaction",
  "args": {
    "operation": "update",
    "id": "wrong-id",
    "transaction": {"amount": 5000}
  }
}
// Error: "Transaction not found"

// Solution: Find correct ID first
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "limit": 10
  }
}
// Then retry with correct ID
```


---

## Best Practices

### 1. Use Names Over IDs When Possible

**Why**: More readable, easier to understand, less error-prone

**Example**:
```json
// Good - readable
{
  "account": "Checking",
  "category": "Groceries",
  "payee": "Whole Foods"
}

// Also works, but less readable
{
  "account": "acc_123",
  "category": "cat_456",
  "payee": "pay_789"
}
```

**When to use IDs**:
- Multiple entities with similar names
- Programmatic/automated operations
- Performance-critical operations

### 2. Always Verify Write Operations

**Why**: Confirms operation succeeded, catches errors early

**Pattern**:
```
Write → Read → Verify
```

**Example**:
```json
// 1. Write
{
  "tool": "manage-transaction",
  "args": {
    "operation": "create",
    "transaction": {...}
  }
}

// 2. Read & Verify
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-15",
    "limit": 1
  }
}
```

### 3. Start Broad, Then Narrow

**Why**: Easier to find data, less likely to miss results

**Pattern**:
```
List all → Filter by category → Filter by date → Filter by amount
```

**Example**:
```json
// 1. Start broad
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}

// 2. Narrow down
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "categoryName": "Groceries",
    "minAmount": 50
  }
}
```

### 4. Use Appropriate Date Ranges

**Why**: Faster queries, more relevant results

**Guidelines**:
- **Daily review**: Last 7 days
- **Weekly review**: Last 30 days
- **Monthly review**: Current month
- **Quarterly review**: Last 3 months
- **Annual review**: Current year

**Example**:
```json
// Monthly review
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

// Last 30 days
{
  "startDate": "2024-01-01",  // Calculate: today - 30
  "endDate": "2024-01-31"     // Today
}
```

### 5. Leverage Tool Cross-References

**Why**: Discover related tools, understand workflows

**Pattern**:
- Check "SEE ALSO" sections in tool descriptions
- Follow "TYPICAL WORKFLOW" guidance
- Use prerequisite tools first

**Example**:
```
get-accounts (find IDs)
  ↓
manage-transaction (create)
  ↓
get-transactions (verify)
  ↓
spending-by-category (analyze)
```


### 6. Handle Errors Gracefully

**Why**: Better user experience, easier debugging

**Pattern**:
1. Read error message
2. Check suggestions
3. Verify inputs
4. Retry with corrections

**Example**:
```json
// Error response
{
  "error": "Account 'Chequing' not found",
  "suggestion": "Available accounts: Checking, Savings, Credit Card"
}

// Fix and retry
{
  "account": "Checking"  // Use suggested name
}
```

### 7. Use Limits for Large Queries

**Why**: Faster responses, manageable result sets

**Guidelines**:
- Default: 100 results
- Quick check: 10 results
- Detailed review: 50 results
- Full export: 1000 results (max)

**Example**:
```json
// Quick check
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "limit": 10
  }
}

// Detailed review
{
  "tool": "get-transactions",
  "args": {
    "account": "Checking",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 50
  }
}
```

### 8. Understand Amount Signs

**Why**: Avoid confusion between income and expenses

**Rules**:
- **Negative amounts**: Expenses, outflows, debits
- **Positive amounts**: Income, inflows, credits
- **Credit cards**: Purchases are positive (increase balance owed)

**Example**:
```json
// Expense (money out)
{"amount": -5000}  // -$50.00

// Income (money in)
{"amount": 5000}   // $50.00

// Credit card purchase (balance increases)
{"amount": 5000}   // $50.00 charged
```

### 9. Keep Operations Atomic

**Why**: Easier to debug, clearer intent, better error handling

**Pattern**:
- One operation per tool call
- Don't combine create + update
- Verify each step before proceeding

**Example**:
```json
// Good - atomic operations
// 1. Create
{"operation": "create", "transaction": {...}}

// 2. Verify
{"tool": "get-transactions", ...}

// 3. Update if needed
{"operation": "update", "id": "...", "transaction": {...}}

// Bad - trying to do too much
// Don't try to create and update in one call
```

### 10. Document Your Workflows

**Why**: Reproducible, shareable, maintainable

**Pattern**:
1. List steps in order
2. Include example calls
3. Note prerequisites
4. Document expected results

**Example**:
```markdown
## Monthly Budget Setup Workflow

1. Get categories: `get-grouped-categories`
2. For each category:
   - Set budget: `set-budget` with amount
   - Enable carryover if needed
3. Verify: `get-budget-month` for the month
4. Track: `spending-by-category` throughout month
```

---

## Additional Resources

### Related Documentation

- **README.md**: Installation, setup, and tool reference
- **ARCHITECTURE.md**: Technical architecture and design patterns
- **CONTRIBUTING.md**: Development guidelines and coding standards
- **docs/MIGRATION-GUIDE.md**: Tool consolidation and migration
- **docs/PATTERNS.md**: Code patterns and best practices
- **docs/PERFORMANCE.md**: Performance optimization guide

### Getting Help

1. **Check tool descriptions**: Each tool has comprehensive documentation
2. **Review error messages**: They include suggestions for fixes
3. **Consult this guide**: Common workflows and troubleshooting
4. **Check GitHub issues**: Known issues and solutions
5. **Ask in discussions**: Community support

### Contributing

Found a missing workflow or pattern? Contributions welcome!

1. Fork the repository
2. Add your workflow to this guide
3. Submit a pull request
4. Include examples and explanations

---

**Last Updated**: November 2024  
**Version**: 2.0.0  
**Status**: Complete ✅

