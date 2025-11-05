# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

## Features

### Resources

- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools

#### Transaction & Account Management

- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, or payee
- **`get-accounts`** - Retrieve a list of all accounts with their current balance and ID
- **`balance-history`** - View account balance changes over time

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group
- **`update-category`** - Update an existing category's name or group
- **`delete-category`** - Delete a category
- **`create-category-group`** - Create a new category group
- **`update-category-group`** - Update a category group's name
- **`delete-category-group`** - Delete a category group

> **Tip:** Category tools validate that IDs resemble Actual Budget UUIDs before making API calls. Use [`get-grouped-categories`](#categories) to copy the correct `groupId`/`categoryId` values before creating or updating records.

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`create-payee`** - Create a new payee
- **`update-payee`** - Update an existing payee's details
- **`delete-payee`** - Delete a payee

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions
- **`update-rule`** - Update an existing transaction rule
- **`delete-rule`** - Delete a transaction rule

#### Schedules

- **`get-schedules`** - List all recurring schedules
- **`create-schedule`** - Create a new recurring schedule
  - Required: `name`, `accountId`, `amount`, `nextDate` (YYYY-MM-DD), `rule` (e.g., monthly/weekly/biweekly)
  - Optional: `payee`, `category`, `notes`
- **`update-schedule`** - Update an existing schedule by `scheduleId`
- **`delete-schedule`** - Delete a schedule by `scheduleId`

Examples:

```json
{ "tool": "create-schedule", "args": { "name": "Rent", "accountId": "acc_123", "amount": -1240, "nextDate": "2025-12-01", "rule": "monthly", "payee": "Bilt", "category": "cat_housing" } }
```

```json
{ "tool": "get-schedules", "args": {} }
```

```json
{ "tool": "update-schedule", "args": { "scheduleId": "sch_123", "amount": -1250, "nextDate": "2026-01-01" } }
```

```json
{ "tool": "delete-schedule", "args": { "scheduleId": "sch_123" } }
```

#### Budgeting

- **`set-budget-amount`** - Set the budgeted amount for a category in a specific month
- **`set-budget-carryover`** - Enable or disable carryover for a category in a month
- **`hold-budget-for-next-month`** - Reserve funds for the next month
- **`reset-budget-hold`** - Clear held funds for a month

These tools enforce month (`YYYY-MM`), category UUID, and numeric amount validations so that downstream API calls never mutate the wrong budget period or category.

##### `set-budget-amount`

| Parameter   | Type    | Required | Validation & Notes |
| ----------- | ------- | -------- | ------------------ |
| `month`     | string  | ✅       | Must be `YYYY-MM`. The server rejects other formats with `month is required and must be a string in YYYY-MM format`. |
| `categoryId`| string  | ✅       | Must be an Actual category UUID. Fetch valid IDs via [`get-grouped-categories`](#categories). |
| `amount`    | number  | ✅       | Accepts positive/negative numeric values. Any non-number triggers `amount is required and must be a number`. |

Example request:

```json
{
  "tool": "set-budget-amount",
  "args": {
    "month": "2024-06",
    "categoryId": "c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e",
    "amount": 250.5
  }
}
```

Success response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully set budget amount of 250.5 for category c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e in month 2024-06\""
    }
  ]
}
```

Example error (bad month format):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: month is required and must be a string in YYYY-MM format"
    }
  ]
}
```

##### `set-budget-carryover`

| Parameter   | Type    | Required | Validation & Notes |
| ----------- | ------- | -------- | ------------------ |
| `month`     | string  | ✅       | Must be `YYYY-MM`. |
| `categoryId`| string  | ✅       | Must be a category UUID; use [`get-grouped-categories`](#categories) to confirm the value. |
| `enabled`   | boolean | ✅       | Only accepts boolean literals (`true`/`false`). |

Example success:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully enabled budget carryover for category c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e in month 2024-06\""
    }
  ]
}
```

Example error (non-boolean `enabled`):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: enabled is required and must be a boolean"
    }
  ]
}
```

##### `hold-budget-for-next-month`

| Parameter | Type   | Required | Validation & Notes |
| --------- | ------ | -------- | ------------------ |
| `month`   | string | ✅       | `YYYY-MM` only. |
| `amount`  | number | ✅       | Must be numeric (positive to reserve funds, negative to release). |

Example error (amount typo):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: amount is required and must be a number"
    }
  ]
}
```

##### `reset-budget-hold`

| Parameter | Type   | Required | Validation & Notes |
| --------- | ------ | -------- | ------------------ |
| `month`   | string | ✅       | `YYYY-MM` only. |

Example success:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully reset budget hold for month 2024-06\""
    }
  ]
}
```

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

### Troubleshooting validation errors

- **Invalid IDs** – Ensure `categoryId`, `groupId`, and other identifiers come from Actual Budget. Use helper tools like [`get-grouped-categories`](#categories), [`get-accounts`](#transaction--account-management), or [`get-payees`](#payees) to copy valid UUIDs.
- **Incorrect month format** – All budget tools expect `YYYY-MM`. If you only know a full date, trim it down (e.g., `2024-06-15` → `2024-06`).
- **Amount typos** – Amounts must be numbers. Remove currency symbols and ensure decimals use `.` (e.g., `250.5`). Negative numbers represent outflows where appropriate.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (optional)

### Remote access

Pull the latest docker image:

```
docker pull sstefanov/actual-mcp:latest
```

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

4. Build the local docker image (optional):

```bash
docker build -t <local-image-name> .
```

5. Configure environment variables (optional):

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

Optional: separate encryption budget password

If your Actual setup requires a different password to unlock the local/encrypted budget data than the server authentication password, you can set `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in addition to `ACTUAL_PASSWORD`.

```bash
# If server auth and encryption/unlock use different passwords
export ACTUAL_BUDGET_ENCRYPTION_PASSWORD="your-encryption-password"
```

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
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}

### a. Using Node.js (local only):

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
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

### b. Using Docker (local or remote images):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/data:/data",
        "-e",
        "ACTUAL_PASSWORD=your-password",
        "-e",
        "ACTUAL_SERVER_URL=https://your-actual-server.com",
        "-e",
        "ACTUAL_BUDGET_SYNC_ID=your-budget-id",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 Use `--enable-write` to enable write-access tools.

## Running an SSE Server

To expose the server over a port using Docker:

```bash
docker run -i --rm \
  -p 3000:3000 \
  -v "/path/to/your/data:/data" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_SERVER_URL="http://your-actual-server.com" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e BEARER_TOKEN="your-bearer-token" \
  sstefanov/actual-mcp:latest \
  --sse --enable-write --enable-bearer
```

> ⚠️ Important: When using --enable-bearer, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

## Performance Optimization

The Actual Budget MCP Server includes built-in performance optimizations to ensure fast response times, especially when working with large datasets and multiple accounts.

### Key Features

- **Intelligent Caching** - Frequently accessed data (accounts, categories, payees) is cached in memory with automatic invalidation
- **Parallel Data Fetching** - Transaction queries across multiple accounts execute concurrently
- **Optimized Enrichment** - Lookup tables are reused across transactions to minimize API calls
- **Performance Monitoring** - Built-in metrics tracking to identify bottlenecks

### Configuration

Performance features can be configured via environment variables:

```bash
# Cache Configuration
CACHE_ENABLED=true                      # Enable/disable caching (default: true)
CACHE_TTL_SECONDS=300                   # Cache TTL in seconds (default: 300 = 5 minutes)
CACHE_MAX_ENTRIES=1000                  # Maximum cache entries (default: 1000)

# Performance Monitoring
PERFORMANCE_LOGGING_ENABLED=true        # Enable performance logging (default: true)
PERFORMANCE_LOG_THRESHOLD_MS=1000       # Log operations slower than this (default: 1000ms)
PERFORMANCE_CACHE_STATS_INTERVAL_MS=300000  # Cache stats logging interval (default: 5 minutes)
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

- **Multi-Account Queries**: 50% reduction in execution time when fetching transactions from 5+ accounts
- **Cache Hit Rate**: >80% for accounts, categories, and payees under normal usage
- **Transaction Enrichment**: <100ms for 1000+ transactions (after lookup tables are loaded)
- **Memory Usage**: <50MB for cache with 1000 entries
- **Cache Overhead**: <5ms per cache operation

### Troubleshooting Performance Issues

#### Cache Not Working

If you suspect caching isn't working:

1. Check that `CACHE_ENABLED=true` in your environment
2. Enable performance logging with `PERFORMANCE_LOGGING_ENABLED=true`
3. Look for cache statistics in the logs (logged every 5 minutes by default)
4. Verify cache hit rate is >0% for repeated queries

#### Slow Query Performance

If queries are slower than expected:

1. Check if caching is enabled (`CACHE_ENABLED=true`)
2. Review performance logs to identify bottlenecks
3. For multi-account queries, ensure parallel fetching is working (check logs for concurrent operations)
4. Consider increasing `CACHE_TTL_SECONDS` if your data doesn't change frequently

#### High Memory Usage

If the server is using too much memory:

1. Reduce `CACHE_MAX_ENTRIES` to limit cache size
2. Reduce `CACHE_TTL_SECONDS` to expire entries more quickly
3. Disable caching entirely with `CACHE_ENABLED=false` if memory is constrained

#### Debugging Cache Behavior

To debug cache-related issues:

1. Enable performance logging: `PERFORMANCE_LOGGING_ENABLED=true`
2. Set a low threshold to see all operations: `PERFORMANCE_LOG_THRESHOLD_MS=0`
3. Watch for cache hit/miss patterns in the logs
4. Temporarily disable cache (`CACHE_ENABLED=false`) to compare behavior

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

# Disable performance logging
PERFORMANCE_LOGGING_ENABLED=false
```

When caching is disabled, the server functions identically to the pre-optimization version, making it useful for troubleshooting or verifying that optimizations aren't causing issues.

### Running Performance Benchmarks

To measure the performance improvements and verify that optimization targets are met, run the benchmark script:

```bash
npm run benchmark
```

The benchmark script will:

1. **Test multi-account queries** - Measures performance with and without caching
2. **Verify cache hit rate** - Ensures cache effectiveness meets the >80% target
3. **Test enrichment performance** - Validates that transaction enrichment is under 100ms for 1000+ transactions
4. **Calculate improvement** - Reports the percentage improvement from optimizations

Example output:

```
🚀 Starting Performance Benchmarks

Configuration:
  - Target reduction: 50%
  - Cache hit rate target: 80%
  - Enrichment target: <100ms for 1000+ transactions
  - Iterations: 3

📊 Benchmark 1: Multi-account queries (cache disabled)
  ✓ Multi-account query (no cache): 2450.32ms
    - accounts: 5
    - iterations: 3
    - dateRange: 2024-08-04 to 2024-11-04

📊 Benchmark 2: Multi-account queries (cache enabled)
  ✓ Multi-account query (with cache): 1180.15ms
    - iterations: 3
    - dateRange: 2024-08-04 to 2024-11-04

📈 Performance Improvement Analysis
  ✓ Performance improvement: 0ms
    - noCacheDuration: 2450.32ms
    - withCacheDuration: 1180.15ms
    - improvement: 51.85%
    - target: 50%
    - passed: YES

📊 Benchmark 3: Cache hit rate
  ✓ Cache hit rate: 0ms
    - hitRate: 90.00%
    - target: 80%
    - hits: 27
    - misses: 3
    - passed: YES

📊 Benchmark 4: Transaction enrichment
  ✓ Transaction enrichment: 45.23ms
    - transactionCount: 1523
    - totalDuration: 45.23ms
    - perTransaction: 0.030ms
    - target: <100ms for 1000+ transactions
    - passed: YES

============================================================
📊 BENCHMARK SUMMARY
============================================================
Total Tests: 4
Passed: 4 ✓
Failed: 0 ✗

Cache Statistics:
  Hits: 27
  Misses: 3
  Hit Rate: 90.00%

============================================================
✅ All benchmarks passed!
```

The benchmark requires a configured Actual Budget connection (via environment variables or local data). If any benchmark fails to meet its target, the script will exit with a non-zero status code.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"

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

### Performance Monitoring

The project includes comprehensive performance monitoring tools:

```bash
# Run optimization benchmarks
npm run benchmark            # Cache and parallel fetching benchmarks

# Run refactoring performance tests
npm run perf:monitor         # Test all tools for performance
npm run perf:baseline        # Save performance baseline
npm run perf:compare         # Compare with baseline
```

Performance monitoring ensures no regressions during refactoring and tracks optimization improvements. See [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) for detailed performance documentation.

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
│   ├── performance/              # Performance tracking and logging
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

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

For development guidelines and coding standards, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
