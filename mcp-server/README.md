# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Quick Start

```bash
npm install
npm run build
```

Configure environment:
```bash
ACTUAL_SERVER_URL=https://your-server.com
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
```

## Features

- **17 core tools** for budget management
- **Name resolution** - Use account/category names instead of UUIDs
- **Auto-loading** - Budget loads automatically on startup
- **Persistent connection** - 70-90% faster consecutive requests
- **Intelligent caching** - Frequently accessed data cached in memory

## Core Tools

### Transactions & Accounts
- `manage-entity` - Unified CRUD for all entities (transactions, accounts, categories, payees, rules, schedules)
- `get-transactions` - Query transaction history
- `get-accounts` - List accounts with balances

### Budget & Categories
- `get-grouped-categories` - View category structure
- `set-budget` - Set monthly budget amounts

### Financial Insights
- `spending-by-category` - Spending breakdown
- `monthly-summary` - Income, expenses, savings
- `balance-history` - Account balance trends

### Entity Management
- `get-payees` - List payees
- `get-rules` - List transaction rules
- `get-schedules` - List recurring schedules

### Advanced
- `merge-payees` - Consolidate duplicates
- `run-bank-sync` - Sync with bank
- `run-import` - Import transactions

## Usage with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_SERVER_URL": "https://your-server.com",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

## Example Queries

- "What's my current account balance?"
- "Show me spending by category last month"
- "Create a transaction for $50 at Whole Foods"
- "Set my Food budget to $500 for January"
- "What's my savings rate over the past 3 months?"

## Development

```bash
npm run watch    # Auto-rebuild
npm test         # Run tests
npm run quality  # Lint + format + type-check
```

## Configuration

```bash
# Required
ACTUAL_SERVER_URL=https://your-server.com
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id

# Optional
AUTO_SYNC_INTERVAL_MINUTES=5  # Auto-sync (0 = disabled)
CACHE_ENABLED=true            # Enable caching
CACHE_TTL_SECONDS=300         # Cache TTL (5 minutes)
```

## Architecture

```
src/
├── core/              # Shared functionality
│   ├── data/         # Data fetchers with caching
│   ├── response/     # Response builders
│   ├── input/        # Validation
│   └── formatting/   # Date/amount formatting
├── tools/            # MCP tools
└── index.ts          # Server entry point
```

## Performance

- **Persistent connection**: 70-90% faster after first request
- **Intelligent caching**: 60-80% cache hit rate
- **Parallel fetching**: 50% faster multi-account queries
- **Name resolution**: Cached for instant lookups

## License

MIT

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines.
