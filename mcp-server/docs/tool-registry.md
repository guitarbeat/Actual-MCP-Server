# MCP Surface Registry

Generated from the declarative MCP modules in `src/mcp/`. Edit those modules, then run `pnpm docs:generate`.

## Read-Only Core

- `audit-historical-transfers`: Audit already-imported transactions for strict historical transfer candidates, then separate softer payment-style leftovers for manual review.
- `audit-uncategorized-transactions`: Audit uncategorized transactions at scale and group them into rule opportunities versus manual cleanup work.
- `balance-history`: Track how an account balance has changed over time with monthly snapshots. Use this when the user asks about balance trends or account growth.
- `get-account-balance`: Check the current or historical balance of a specific account. Use this when the user asks about a single account balance.
- `get-accounts`: List all accounts with current balances. Use this when the user asks about accounts, balances, or needs to find an account name.
- `get-budget-month`: View budget details for a specific month showing budgeted amounts vs actual spending. Use this when the user asks about budget for a particular month.
- `get-financial-insights`: Get a pre-analyzed financial health summary. Returns actionable insights instead of raw data.
- `get-grouped-categories`: List all budget categories organized by groups. Use this when the user asks about categories or you need to find a category name.
- `get-payees`: List all merchants and payees, or search for specific ones. Use this when you need to find payee names or IDs.
- `get-rules`: List auto-categorization rules that automatically assign categories to transactions. Use this when the user asks about rules or automatic categorization.
- `get-schedules`: Retrieve all recurring transaction schedules.
- `get-tags`: List all tags in Actual Budget, or search for specific tags. Use this when you need tag IDs before creating, updating, or deleting tags.
- `get-transactions`: Query and filter transaction history from a specific account or across all accounts. Returns enriched transaction data including ID, date, amount, payee, and category.
- `monthly-summary`: Generate high-level financial overview showing income, expenses, savings, and savings rate trends for a specified period (default 3 months).
- `recommend-budget-plan`: Analyze recent budget history and recommend category targets for a month without mutating data.
- `spending-by-category`: Break down spending by category to show where money is going. Useful for analyzing spending patterns, top categories, or budget analysis.

## Write Core

- `apply-budget-plan`: Apply category budget recommendations to a target month. Use this after reviewing the output of recommend-budget-plan.
- `apply-historical-transfers`: Link strict historical transfer candidates as real transfers without creating duplicate counterpart transactions.
- `create-category`: Create a new category in Actual Budget.
- `create-category-group`: Create a new category group in Actual Budget.
- `create-payee`: Create a new payee in Actual Budget.
- `create-rule`: Create a new auto-categorization rule in Actual Budget.
- `create-schedule`: Create a new recurring transaction schedule in Actual Budget.
- `create-tag`: Create a new tag in Actual Budget.
- `create-transaction`: Add a new transaction to an account. Use this when the user wants to manually record a purchase, payment, or income.
- `delete-category`: Delete a category from Actual Budget.
- `delete-category-group`: Delete a category group from Actual Budget.
- `delete-payee`: Delete a payee from Actual Budget.
- `delete-rule`: Delete an auto-categorization rule from Actual Budget.
- `delete-schedule`: Delete a recurring transaction schedule from Actual Budget.
- `delete-tag`: Delete a tag from Actual Budget.
- `delete-transaction`: Remove a transaction permanently. Use this when the user wants to delete a duplicate or incorrect transaction.
- `import-transaction-batch`: Import a structured batch of transactions into Actual Budget with duplicate detection and rule execution. This keeps the existing bank-sync import tool unchanged while exposing the SDK import pipeline to MCP clients.
- `import-transactions`: Sync transactions from connected bank accounts to update your budget. Use this when the user wants to refresh bank data.
- `merge-payees`: Combine duplicate payees into one. Use this when the user wants to clean up duplicate merchant names.
- `reconcile-account`: Compare an account against a statement balance, identify uncleared transactions, and optionally mark eligible transactions as cleared.
- `set-account-starting-balance`: Create or update the single starting balance transaction for an existing account.
- `set-budget`: Set or update the budget amount for a category in a specific month. Use this when the user wants to create or change a budget.
- `update-account`: Modify account properties like name, type, or budget status. Use this when the user wants to change account details.
- `update-category`: Update an existing category in Actual Budget.
- `update-category-group`: Update an existing category group in Actual Budget.
- `update-payee`: Update an existing payee in Actual Budget.
- `update-rule`: Update an existing auto-categorization rule in Actual Budget.
- `update-schedule`: Update an existing recurring transaction schedule in Actual Budget.
- `update-tag`: Update an existing tag in Actual Budget.
- `update-transaction`: Modify an existing transaction. Use this when the user wants to fix or change transaction details.

## Advanced (`--enable-advanced`)

- `close-account`: Close an account in Actual Budget. This keeps transaction history but marks the account as closed.
- `create-account`: Add a new account to the budget. Use this when the user wants to set up a new bank account, credit card, or investment account.
- `delete-account`: Permanently remove an account. Use this when the user wants to delete a test or duplicate account.
- `get-budget-files`: List all available budget files (local and remote). Use to see available budget files before switching.
- `hold-budget`: Hold budget amount for the next month. Use to save for large purchases or irregular expenses.
- `reopen-account`: Reopen a closed account in Actual Budget.
- `reset-budget-hold`: Reset (clear) a budget hold for a specific month.
- `switch-budget`: Switch to a different budget file. Downloads and loads the specified budget.

## Prompts

- `analyze-monthly-spending`: Analyze spending for a specific month
- `financial-health-check`: Perform a comprehensive check of financial health (balances, recent trends)
- `triage-uncategorized-transactions`: Audit uncategorized transactions, turn strong clusters into rule improvements, and leave ambiguous leftovers for manual cleanup

## Resources

- `actual://accounts` (static): Accounts Directory. Browse all accounts. Use the get-accounts tool for detailed account information and balances.
- `actual://accounts/{accountId}` (template): Account Overview. Provides balance, status, and metadata for a specific account.
- `actual://accounts/{accountId}/transactions` (template): Account Transactions. Shows recent transactions for an account across the default reporting window.
- `actual://budgets` (static): Budget Months Directory. Browse budget months. Use the get-budget-month tool to retrieve detailed budget data for specific months.
- `actual://budgets/{month}` (template): Monthly Budget. Detailed budget breakdown for a specific month (YYYY-MM format).
- `actual://health` (static): Current Month Health Dashboard. High-level budget health dashboard for the current month.
- `actual://health/{month}` (template): Monthly Health Dashboard. Budget health dashboard for a specific month (YYYY-MM format).
- `actual://payees/{payeeId}/rules` (template): Payee Rules. Show Actual Budget rules associated with a payee.
- `actual://rules` (static): Rule Directory. Browse Actual Budget automation rules.
- `actual://tags` (static): Tag Directory. Browse all tags available in Actual Budget.
- `actual://uncategorized` (static): Uncategorized Audit. Audit uncategorized transactions across all on-budget accounts.
