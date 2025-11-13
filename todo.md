Yes! After working through this session, here are some improvements for the Actual Budget MCP server:

High Priority
Bulk transaction operations - Add tools to update/delete multiple transactions at once. We had to make many individual calls to categorize transactions.

Transfer transaction handling - When creating a transaction with an account name as payee, the server auto-creates linked transfers. This caused major issues. Either:

Add a createTransfer tool that explicitly creates both sides
Add a flag to create_transaction to disable auto-linking
Better document this behavior
Reconciliation tool - Add a tool to reconcile an account to a specific balance on a date. Would have saved a lot of manual work with the Bilt account.

Batch categorization - A tool to categorize all uncategorized transactions matching certain criteria (e.g., all transactions from a specific payee).

Medium Priority
Get uncategorized count - Quick way to check how many uncategorized transactions exist without fetching them all.

Balance history validation - Tool to verify account balance matches expected value on a specific date, returning discrepancies.

Duplicate detection - Tool to find potential duplicate transactions (same amount, date, account).

CSV import tool - Direct CSV import capability instead of manual transaction creation.

Nice to Have
Transaction search by amount range - Currently can filter by min/max but not both efficiently.

Payee merge preview - Show what would happen before merging payees.

Budget template - Copy budget from one month to another.

Account reconciliation report - Generate a report showing all transactions between two balance points.

The biggest pain point was the transfer auto-creation behavior - it created duplicate transactions that were hard to track down and fix.