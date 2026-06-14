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
- `get-transactions`: Query and filter transaction history from a specific account or across all accounts. Returns enriched transaction data including ID, date, amount, payee, and category. Results are sorted newest-first; use limit/offset for pagination (defaults apply when limit is omitted—see report footer for hasMore and next_offset).
- `monthly-summary`: Generate high-level financial overview showing income, expenses, savings, and savings rate trends for a specified period (default 3 months).
- `recommend-budget-plan`: Analyze recent budget history and recommend category targets for a month without mutating data.
- `spending-by-category`: Break down spending by category to show where money is going. Useful for analyzing spending patterns, top categories, or budget analysis.

## Write Core

- `apply-budget-plan`: Apply category budget recommendations to a target month. Use this after reviewing the output of recommend-budget-plan.
- `apply-historical-transfers`: Link strict historical transfer candidates as real transfers without creating duplicate counterpart transactions.
- `create-schedule`: Create a new recurring transaction schedule in Actual Budget.
- `create-transaction`: Add a new transaction to an account. Use this when the user wants to manually record a purchase, payment, or income.
- `delete-schedule`: Delete a recurring transaction schedule from Actual Budget.
- `delete-transaction`: Remove a transaction permanently. Use this when the user wants to delete a duplicate or incorrect transaction.
- `import-transaction-batch`: Import a structured batch of transactions into Actual Budget with duplicate detection and rule execution. This keeps the existing bank-sync import tool unchanged while exposing the SDK import pipeline to MCP clients.
- `import-transactions`: Sync transactions from connected bank accounts to update your budget. Use this when the user wants to refresh bank data.
- `manage-category`: Create, update, or delete a category. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `manage-category-group`: Create, update, or delete a category group. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `manage-payee`: Create, update, or delete a payee. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `manage-rule`: Create, update, or delete a rule. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `manage-tag`: Create, update, or delete a tag. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `merge-payees`: Combine duplicate payees into one. Use this when the user wants to clean up duplicate merchant names.
- `reconcile-account`: Compare an account against a statement balance, identify uncleared transactions, and optionally mark eligible transactions as cleared.
- `set-account-starting-balance`: Create or update the single starting balance transaction for an existing account.
- `set-budget`: Set or update the budget amount for a category in a specific month. Use this when the user wants to create or change a budget.
- `update-schedule`: Update an existing recurring transaction schedule in Actual Budget.
- `update-transaction`: Modify an existing transaction. Use this when the user wants to fix or change transaction details.

## Advanced (`--enable-advanced`)

- `backup-budget`: Creates a backup or snapshot of the currently loaded budget.
- `close-account`: Close an account in Actual Budget. This keeps transaction history but marks the account as closed.
- `get-budget-files`: List all available budget files (local and remote). Use to see available budget files before switching.
- `hold-budget`: Hold budget amount for the next month. Use to save for large purchases or irregular expenses.
- `list-backups`: Returns a list of available backups with timestamps.
- `manage-account`: Create, update, or delete a account. Set "action" to "create", "update", or "delete" and include the relevant fields.
- `reopen-account`: Reopen a closed account in Actual Budget.
- `reset-budget-hold`: Reset (clear) a budget hold for a specific month.
- `restore-budget`: Restores the budget from a specified backup ID.
- `switch-budget`: Switch to a different budget file. Downloads and loads the specified budget.

## Prompts

- `analyze-monthly-spending`: Analyze spending for a specific month
- `financial-health-check`: Perform a comprehensive check of financial health (balances, recent trends)
- `historical-transfer-review`: Audit strict historical-transfer candidates then selectively apply ONLY explicit candidate IDs from the audit output.
- `import-sync-checklist`: Safe checklist after bank import then validate with sampled transactions (requires written import tool).
- `monthly-budget-review`: Compare budget vs actual spending for one month then optionally request non-destructive replan hints (requires read tools).
- `reconcile-accounts-pass`: Structured pass to reconcile one account against a stated statement balance using write-aware tools.
- `schedule-health-check`: Review recurring schedules against recent postings to detect drift or dormant rules (read-heavy).
- `triage-uncategorized-transactions`: Audit uncategorized transactions, turn strong clusters into rule improvements, and leave ambiguous leftovers for manual cleanup

## Resources

- `actual://accounts` (static): Accounts Directory. Browse all accounts. Use the get-accounts tool for detailed account information and balances.
- `actual://accounts/{accountId}` (template): Account Overview. Provides balance, status, and metadata for a specific account.
- `actual://accounts/{accountId}/transactions` (template): Account Transactions. Shows recent transactions for an account across the default reporting window.
- `actual://budgets` (static): Budget Months Directory. Browse budget months. Use the get-budget-month tool to retrieve detailed budget data for specific months.
- `actual://budgets/{month}` (template): Monthly Budget. Detailed budget breakdown for a specific month (YYYY-MM format).
- `actual://health` (static): Current Month Health Dashboard. High-level budget health dashboard for the current month.
- `actual://health/{month}` (template): Monthly Health Dashboard. Budget health dashboard for a specific month (YYYY-MM format).
- `actual://mcp/tool-surface` (static): MCP Tool Surface Catalog. JSON grouping of MCP tools by read/write/advanced tiers plus one-line hints for discovery.
- `actual://payees/{payeeId}/rules` (template): Payee Rules. Show Actual Budget rules associated with a payee.
- `actual://rules` (static): Rule Directory. Browse Actual Budget automation rules.
- `actual://tags` (static): Tag Directory. Browse all tags available in Actual Budget.
- `actual://uncategorized` (static): Uncategorized Audit. Audit uncategorized transactions across all on-budget accounts.
