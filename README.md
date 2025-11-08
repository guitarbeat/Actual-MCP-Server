# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

**Optimized for Conversational AI:**
- **17 core tools** (down from 37) - 54% reduction in context window consumption
- **Name resolution** - Use account, category, and payee names instead of UUIDs
- **Auto-loading** - Budget loads automatically on startup (no manual loading required)
- **Consolidated operations** - Unified interfaces for common tasks
- **Optional tools** - Advanced features available via environment variables

## Features

### Resources

- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools

The server provides **17 core tools** optimized for conversational budget management. These tools support name resolution, allowing you to use account, category, and payee names instead of UUIDs.

#### Transaction & Account Management (1 tool)

- **`manage-entity`** - Unified tool for all entity operations including transactions and accounts. Supports name resolution and automatic amount conversion.

**Create Transaction Example:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "create",
    "data": {
      "account": "Checking",
      "date": "2025-01-15",
      "amount": -50.00,
      "payee": "Grocery Store",
      "category": "Food"
    }
  }
}
```

**Create Account Example:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "create",
    "data": {
      "name": "My Checking",
      "type": "checking"
    }
  }
}
```

> ⚠️ **Note**: `manage-transaction` and `manage-account` are deprecated. Use `manage-entity` with `entityType: "transaction"` or `entityType: "account"` instead.

**Query Account Balance Example:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "balance",
    "id": "account-id-here"
  }
}
```

**Close Account Example:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "close",
    "id": "account-id-here"
  }
}
```

**Delete Account Example:**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "delete",
    "id": "account-id-here"
  }
}
```

> ⚠️ **Warning:** Account deletion is permanent and cannot be undone. Accounts with existing transactions cannot be deleted - use the close operation instead.

**Account Types:**
- `checking` - Standard checking account
- `savings` - Savings account
- `credit` - Credit card account
- `investment` - Investment account
- `mortgage` - Mortgage account
- `debt` - Other debt account
- `other` - Other account type

#### Categories & Budget (2 tools)

- **`get-grouped-categories`** - View all category groups with their categories and budget information
- **`set-budget`** - Set budget amount and/or carryover for a category in a specific month

**Consolidated Budget Example:**
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

#### Entity Management (3 tools)

- **`manage-entity`** - CRUD operations for categories, category groups, payees, rules, and schedules
- **`get-payees`** - List all payees with their details
- **`get-rules`** - List all transaction rules

> **Tip:** The `manage-entity` tool provides a unified interface for creating, updating, and deleting entities. See examples below.

**Example: Create a new category**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "category",
    "operation": "create",
    "data": {
      "name": "New Category Name",
      "groupId": "some-group-id"
    }
  }
}
```

**Example: Update a payee**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "payee",
    "operation": "update",
    "id": "some-payee-id",
    "data": {
      "name": "Updated Payee Name"
    }
  }
}
```

**Example: Delete a rule**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "rule",
    "operation": "delete",
    "id": "some-rule-id"
  }
}
```

#### Financial Insights (3 tools)

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics
- **`balance-history`** - View account balance changes over time

#### Advanced Operations (3 tools)

- **`merge-payees`** - Consolidate duplicate payees
- **`run-bank-sync`** - Sync with bank accounts
- **`run-import`** - Import transactions from files

#### Schedules (2 tools)

- **`get-schedules`** - List all recurring schedules
- Schedules are managed via `manage-entity` (create, update, delete)

**Example: Create a schedule**
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "schedule",
    "operation": "create",
    "data": {
      "name": "Rent",
      "accountId": "acc_123",
      "amount": -1240,
      "nextDate": "2025-12-01",
      "rule": "monthly",
      "payee": "Landlord",
      "category": "cat_housing"
    }
  }
}
```

#### Optional Tools

Advanced users can enable additional tools via environment variables:

**Budget File Management** (set `ENABLE_BUDGET_MANAGEMENT=true`):
- `get-budgets`, `load-budget`, `download-budget`, `sync`
- `get-budget-months`, `get-budget-month`

**Advanced Account Operations** (set `ENABLE_ADVANCED_ACCOUNT_OPS=true`):
- `create-account`, `close-account`, `reopen-account`, `delete-account`

**Utility Tools** (set `ENABLE_UTILITY_TOOLS=true`):
- `get-id-by-name`, `run-query`, `get-server-version`

> **Note:** These tools are disabled by default to reduce context window consumption. Most users won't need them since the server auto-loads your budget on startup.

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

### Troubleshooting

#### Validation Errors

- **Invalid IDs** – Most tools now support names instead of UUIDs. Use account, category, or payee names for easier usage.
- **Name not found** – If a name isn't recognized, the error message will suggest available options (e.g., "Account 'Chequing' not found. Available accounts: Checking, Savings, Credit Card").
- **Incorrect month format** – All budget tools expect `YYYY-MM`. If you only know a full date, trim it down (e.g., `2024-06-15` → `2024-06`).
- **Amount typos** – Amounts must be numbers. Remove currency symbols and ensure decimals use `.` (e.g., `250.5`). Negative numbers represent outflows where appropriate.

#### Account Management Errors

- **Cannot close account with balance** – If an account has a non-zero balance, you must provide a `transferAccountId` to transfer the balance to another account. Optionally provide `transferCategoryId` to categorize the transfer.
- **Cannot delete account with transactions** – Accounts that have existing transactions cannot be deleted. Use the `close` operation instead to mark the account as closed while preserving transaction history.
- **Invalid account type** – Account type must be one of: `checking`, `savings`, `credit`, `investment`, `mortgage`, `debt`, or `other`. Check the spelling and use lowercase.
- **Duplicate account name** – Account names must be unique. Choose a different name or update the existing account instead.
- **Account not found** – Verify the account ID is correct. Use `get-accounts` to list all available accounts and their IDs.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client

### Local setup

1. Clone the repository:

```bash
git clone https://github.com/sstefanov/actual-mcp.git
cd actual-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Configure environment variables:

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Auto-load budget on startup (recommended for single-budget users)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"

# Auto-sync interval in minutes (0 to disable, default: 5)
export AUTO_SYNC_INTERVAL_MINUTES=5

# Optional: Enable additional tool categories (default: false)
export ENABLE_BUDGET_MANAGEMENT=false      # Multi-budget file management
export ENABLE_ADVANCED_ACCOUNT_OPS=false   # Account creation/deletion
export ENABLE_UTILITY_TOOLS=false          # Low-level utilities
```

Optional: separate encryption budget password

If your Actual setup requires a different password to unlock the local/encrypted budget data than the server authentication password, you can set `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in addition to `ACTUAL_PASSWORD`.

```bash
# If server auth and encryption/unlock use different passwords
export ACTUAL_BUDGET_ENCRYPTION_PASSWORD="your-encryption-password"
```

### Automatic Budget Loading

When `ACTUAL_BUDGET_SYNC_ID` is set, the server automatically loads your budget on startup. This means:

- No need to call `load-budget` or `download-budget` tools
- Your budget is ready immediately when the first tool is called
- Automatic background sync keeps your data up-to-date (configurable via `AUTO_SYNC_INTERVAL_MINUTES`)

This optimization is ideal for single-budget users (95% of users) and reduces context window consumption by removing budget management tools.

## Usage with Claude Desktop

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following to your configuration...

### a. Using Node.js (npx version):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "AUTO_SYNC_INTERVAL_MINUTES": "5"
      }
    }
  }
}

### b. Using Node.js (local only):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/your/clone/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "AUTO_SYNC_INTERVAL_MINUTES": "5"
      }
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 Use `--enable-write` to enable write-access tools.

## Running an SSE Server

To expose the server over a port:

```bash
npm run build
node build/index.js --sse --enable-write --enable-bearer
```

Set environment variables before running:

```bash
export ACTUAL_PASSWORD="your-password"
export ACTUAL_SERVER_URL="http://your-actual-server.com"
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
export BEARER_TOKEN="your-bearer-token"
```

> ⚠️ Important: When using --enable-bearer, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

## Performance Optimization

The Actual Budget MCP Server includes built-in performance optimizations to ensure fast response times, especially when working with large datasets and multiple accounts.

### Key Features

- **Persistent API Connection** - Single connection maintained throughout server lifetime for 70-90% faster consecutive requests
- **Intelligent Caching** - Frequently accessed data (accounts, categories, payees) is cached in memory with automatic invalidation
- **Parallel Data Fetching** - Transaction queries across multiple accounts execute concurrently
- **Optimized Enrichment** - Lookup tables are reused across transactions to minimize API calls

### How Persistent Connections Work

The server maintains a single connection to your Actual Budget data throughout its lifetime:

1. **First Request**: Initializes connection (600-2200ms)
   - Connects to Actual server
   - Downloads budget file
   - Executes your request

2. **Subsequent Requests**: Reuses connection (50-200ms)
   - No initialization needed
   - Executes immediately
   - 70-90% faster than first request

This means consecutive operations (like asking multiple questions about your budget) are dramatically faster than if the server had to reconnect each time.

### Configuration

Performance features can be configured via environment variables:

```bash
# Cache Configuration
CACHE_ENABLED=true                      # Enable/disable caching (default: true)
CACHE_TTL_SECONDS=300                   # Cache TTL in seconds (default: 300 = 5 minutes)
CACHE_MAX_ENTRIES=1000                  # Maximum cache entries (default: 1000)

```

### Cache TTL Recommendations

Different data types have different update frequencies. The default TTL of 5 minutes works well for most use cases, but you can tune it based on your needs:

- **Accounts** (5 minutes) - Account structure rarely changes
- **Categories** (5 minutes) - Category structure rarely changes
- **Category Groups** (5 minutes) - Groups rarely change
- **Payees** (5 minutes) - Payees change occasionally
- **Transactions** (not cached) - Transactions change frequently and are not cached

### Performance Targets

The optimization provides significant improvements for common operations:

- **Consecutive Requests**: 70-90% faster after first request (persistent connection)
- **Multi-Account Queries**: 50% reduction in execution time when fetching transactions from 5+ accounts
- **Cache Hit Rate**: >80% for accounts, categories, and payees under normal usage
- **Transaction Enrichment**: <100ms for 1000+ transactions (after lookup tables are loaded)
- **Memory Usage**: <50MB for cache with 1000 entries
- **Cache Overhead**: <5ms per cache operation

### Troubleshooting Performance Issues

#### First Request is Slow

If your first request takes 600-2200ms, this is normal behavior. The server must:
- Connect to your Actual Budget server
- Download your budget file
- Initialize the API

Subsequent requests will be 70-90% faster (50-200ms) because they reuse the connection. This is expected and optimal behavior.

#### Cache Not Working

If you suspect caching isn't working:

1. Check that `CACHE_ENABLED=true` in your environment
2. Run the same tool twice and confirm the second call completes faster (connection reuse + cache hit)
3. Use `npm run test` to ensure the cache service unit tests pass—these cover hit/miss tracking and TTL handling

#### Slow Query Performance

If queries are slower than expected:

1. Check if caching is enabled (`CACHE_ENABLED=true`)
2. Instrument a representative tool call with `console.time`/`console.timeEnd` to pinpoint slow phases
3. For multi-account queries, confirm `Promise.all` calls are executing by logging timestamps before/after the batch fetch
4. Consider increasing `CACHE_TTL_SECONDS` if your data doesn't change frequently

#### High Memory Usage

If the server is using too much memory:

1. Reduce `CACHE_MAX_ENTRIES` to limit cache size
2. Reduce `CACHE_TTL_SECONDS` to expire entries more quickly
3. Disable caching entirely with `CACHE_ENABLED=false` if memory is constrained

#### Debugging Cache Behavior

To debug cache-related issues:

1. Run the same tool twice—warm caches should make the second call faster.
2. Temporarily log `cacheService.getStats()` in development to inspect hit/miss counts after repeated requests.
3. Compare behavior with caching disabled (`CACHE_ENABLED=false`) to isolate differences.

#### Cache Invalidation Issues

If you're seeing stale data:

1. Verify that write operations (create, update, delete) are invalidating the cache
2. Check that `CACHE_TTL_SECONDS` isn't set too high
3. Manually clear cache by restarting the server
4. Review logs for cache invalidation events

### Disabling Performance Features

For debugging or comparison purposes, you can disable performance features:

```bash
# Disable all caching
CACHE_ENABLED=false

# Silence startup timing logs (optional)
PERFORMANCE_LOGGING_ENABLED=false
```

Note: The persistent connection cannot be disabled as it's fundamental to the server architecture. When caching is disabled, the server still maintains a persistent connection but doesn't cache data lookups.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "Create a transaction for $50 at Whole Foods in my Checking account for Food category"
- "Set my Food budget to $500 for January with carryover enabled"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"

The server supports natural language with automatic name resolution - you can use account, category, and payee names instead of UUIDs.

## Development

For development with auto-rebuild:

```bash
npm run watch
```

### Code Quality

The project maintains high code quality standards with automated checks:

```bash
# Run all quality checks
npm run quality              # Lint + format + type-check

# Code duplication detection
npm run duplication          # Quick check
npm run duplication:report   # Full HTML report

# Complexity analysis
npm run lint                 # Includes complexity checks

# Run all metrics
npm run metrics              # Duplication + lint
```

Pre-commit hooks automatically run quality checks on staged files. See [docs/CODE_QUALITY.md](./docs/CODE_QUALITY.md) for detailed information about code quality metrics and standards.

### Testing the connection to Actual

To verify the server can connect to your Actual Budget data:

```bash
node build/index.js --test-resources
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
src/
├── core/                          # Shared core functionality
│   ├── aggregation/              # Data aggregation utilities
│   ├── api/                      # API wrapper and cache invalidation
│   ├── cache/                    # Caching service
│   ├── data/                     # Data fetchers (accounts, categories, etc.)
│   ├── formatting/               # Date and amount formatting
│   ├── input/                    # Input validation and parsing
│   ├── mapping/                  # Entity mappers (categories, transactions)
│   ├── response/                 # Response and error builders
│   └── types/                    # Domain types and schemas
│
├── tools/                        # MCP tools (each follows consistent structure)
│   ├── [tool-name]/
│   │   ├── index.ts             # Schema + handler export
│   │   ├── input-parser.ts      # Argument validation
│   │   ├── data-fetcher.ts      # Data retrieval
│   │   ├── report-generator.ts  # Response formatting
│   │   └── types.ts             # Tool-specific types
│   └── index.ts                 # Tool registration
│
├── actual-api.ts                # Actual Budget API wrapper
├── index.ts                     # Server entry point
├── prompts.ts                   # MCP prompts
├── resources.ts                 # MCP resources
└── types.ts                     # Top-level type exports
```

For detailed architecture documentation, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

For development guidelines and coding standards, see [CONTRIBUTING.md](./docs/CONTRIBUTING.md).

## Documentation

### For Users
- **[Tool Usage Guide](./docs/TOOL-USAGE-GUIDE.md)** - Comprehensive guide to using all MCP tools with examples and workflows

### For Developers
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - Development setup, coding standards, and contribution process
- **[Tool Description Template](./docs/TOOL-DESCRIPTION-TEMPLATE.md)** - Standard template for creating discoverable tool descriptions
- **[New Tool PR Checklist](./docs/NEW-TOOL-PR-CHECKLIST.md)** - Quality checklist for adding or updating tools
- **[Architecture Documentation](./docs/ARCHITECTURE.md)** - System design and architecture details
- **[Performance Guide](./docs/PERFORMANCE.md)** - Caching and persistent connection best practices
- **[Common Patterns](./docs/PATTERNS.md)** - Reusable code patterns and examples

## License

MIT

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on:
- Development setup and workflow
- Coding standards and best practices
- Tool description requirements
- Testing guidelines
- Pull request process

When adding new tools, follow the [Tool Description Template](./docs/TOOL-DESCRIPTION-TEMPLATE.md) and complete the [New Tool PR Checklist](./docs/NEW-TOOL-PR-CHECKLIST.md) to ensure high quality and discoverability.
