# Actual Budget MCP Server Features

This document outlines the core capabilities and tools available in the Actual Budget MCP Server.

## Core Features

### 1. Transaction Management
Full CRUD (Create, Read, Update, Delete) capabilities for transactions.
- **Tools**: `get-transactions`, `create-transaction`, `update-transaction`, `delete-transaction`
- **Capabilities**:
    - Filter transactions by date, account, payee, and category.
    - Import transactions from files.
    - Modify transaction details (notes, amounts, dates).

### 2. Budgeting Tools
Comprehensively manage your budget, categories, and goals.
- **Tools**: `get-budget`, `set-budget`, `hold-budget`, `reset-budget-hold`
- **Capabilities**:
    - View current budget status and "To Budget" amounts.
    - Set budget goals and rollover amounts.
    - "Hold" budget amounts for future months (Nini feature).

### 3. Account Management
View and manage financial accounts.
- **Tools**: `get-accounts`, `get-account-balance`, `close-account`, `reopen-account`
- **Capabilities**:
    - List all on-budget and off-budget accounts.
    - Check real-time balances.
    - Calculate net worth.

### 4. Financial Insights & Reporting
Generate reports and analysis on your financial data.
- **Tools**: `financial-insights`, `monthly-summary`, `spending-by-category`, `balance-history`
- **Capabilities**:
    - **Monthly Summary**: Get a high-level overview of income vs. expenses.
    - **Spending Analysis**: breakdown expenses by category for any time period.
    - **Balance History**: Track net worth and account trends over time.

### 5. Entity Management (CRUD)
The server provides standardized Connect/Read/Update/Delete operations for all major data entities:
- **Categories & Groups**: `create-category`, `update-category`, `delete-category`
- **Payees**: `create-payee`, `merge-payees`, `update-payee`
- **Rules**: `get-rules`, `create-rule`, `update-rule`
- **Schedules**: Manage recurring transactions.

## Advanced (Nini) Features
These features are enabled via the `--enable-nini` flag and provide advanced power-user capabilities.
- **Multiple Budget Files**: `get-budgets`, `switch-budget` (switch between different budget files on the fly).
- **Advanced Account Ops**: `close-account`, `reopen-account`.

## Technical Features
- **Streamable HTTP Transport**: Modern, high-performance connection protocol.
- **Legacy SSE Support**: Backward compatibility for older clients.
- **Bearer Authentication**: Secure access control.
- **Automated Versioning**: Server always reports the correct `package.json` version.
- **Resilient Startup**: graceful handling of API timeouts and "cold starts".
