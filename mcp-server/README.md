# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Quick Start

```bash
pnpm install
pnpm run build
```

Configure environment:

```bash
ACTUAL_SERVER_URL=https://your-server.com
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
```

## Features

- **17 core tools** for budget management
- **2 built-in prompts** for common financial analysis tasks
- **Dual transport support** - Both legacy SSE and modern Streamable HTTP transports
- **Name resolution** - Use account/category names instead of UUIDs
- **Auto-loading** - Budget loads automatically on startup
- **Persistent connection** - 70-90% faster consecutive requests
- **Intelligent caching** - Frequently accessed data cached in memory
- **Type-safe** - Full TypeScript type safety with proper error handling
- **Consistent error handling** - Standardized error messages with helpful suggestions

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

## Transport Options

The server supports two MCP transport protocols:

### Stdio Transport (Default - for Claude Desktop)

Used for local desktop applications like Claude Desktop. Messages are exchanged via stdin/stdout.

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

### HTTP Transports (for Remote/Web Clients)

For remote or web-based MCP clients, start the server in HTTP mode:

```bash
node build/index.js --sse --enable-write --enable-bearer
```

**Available endpoints:**

**Legacy SSE Transport:**

- `GET /sse` - Establish SSE connection
- `POST /messages` - Send messages

**Modern Streamable HTTP Transport:**

- `GET/POST/DELETE /mcp` - Streamable HTTP endpoint

**Environment variables:**

```bash
BEARER_TOKEN=your-secret-token  # Required when --enable-bearer is used
PORT=3000                        # Optional, defaults to 3000
```

## Example Queries

- "What's my current account balance?"
- "Show me spending by category last month"
- "Create a transaction for $50 at Whole Foods"
- "Set my Food budget to $500 for January"
- "What's my savings rate over the past 3 months?"

## Development

```bash
pnpm run watch    # Auto-rebuild
pnpm test         # Run tests
pnpm run quality  # Lint + format + type-check
```

## MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a debugging tool that provides a web UI to interact with your MCP server. It's useful for testing tools, resources, and prompts during development.

### Quick Start

The easiest way to use the inspector is with the provided npm script:

```bash
pnpm run inspector
```

This will:

1. Build the project (if needed)
2. Load environment variables from `.env` file
3. Start the MCP Inspector with your server

The inspector runs two services:

- **MCP Inspector Client UI** (default port 6274) - Open this in your browser
- **MCP Proxy Server** (default port 6277) - Handles communication between client and server

### Custom Usage

For more control, you can use the inspector directly:

```bash
# Build first
pnpm run build

# Pass environment variables from .env file
pnpm run inspector

# Or pass environment variables directly
npx @modelcontextprotocol/inspector \
  -e ACTUAL_SERVER_URL=https://your-server.com \
  -e ACTUAL_PASSWORD=your-password \
  -e ACTUAL_BUDGET_SYNC_ID=your-budget-id \
  node build/index.js

# Pass both environment variables and server arguments
npx @modelcontextprotocol/inspector \
  -e ACTUAL_SERVER_URL=https://your-server.com \
  -e ACTUAL_PASSWORD=your-password \
  node build/index.js --enable-write

# Use -- to separate inspector flags from server arguments
npx @modelcontextprotocol/inspector \
  -e ACTUAL_SERVER_URL=$ACTUAL_SERVER_URL \
  -- node build/index.js -e server-flag
```

### Custom Ports

You can customize the ports if needed:

```bash
CLIENT_PORT=8080 SERVER_PORT=9000 pnpm run inspector
```

Or with direct npx:

```bash
CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node build/index.js
```

For more details, see the [MCP Inspector documentation](https://modelcontextprotocol.io/docs/tools/inspector).

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
│   ├── response/     # Response builders with error handling
│   ├── input/        # Validation
│   ├── formatting/   # Date/amount formatting
│   └── logging/      # Safe logging utilities
├── tools/            # MCP tools
│   ├── crud-factory.ts        # Generic CRUD tool generator
│   ├── crud-factory-config.ts # Entity configurations
│   └── manage-entity/         # Entity handlers
└── index.ts          # Server entry point
```

### CRUD Factory Pattern

The server uses a generic factory pattern to eliminate code duplication across CRUD operations. Instead of maintaining ~30 separate tool files, entity configurations are defined once and tools are generated automatically.

**Benefits:**

- **DRY Principle**: Single source of truth for CRUD logic
- **Type Safety**: Full TypeScript inference from Zod schemas with `Record<string, unknown>` for handler arguments
- **Consistency**: Uniform error handling and response formats with contextual error messages
- **Maintainability**: Changes to CRUD logic apply to all entities
- **Extensibility**: Add new entity types with minimal code

**Architecture:**

```
Entity Configuration → CRUD Factory → Tool Definitions → Tool Registry
```

1. **Entity Configuration** (`crud-factory-config.ts`): Define schemas, descriptions, and handlers
2. **CRUD Factory** (`crud-factory.ts`): Generate create/update/delete tool definitions
3. **Tool Registry** (`tools/index.ts`): Register generated tools with MCP server
4. **Entity Handlers** (`manage-entity/entity-handlers/`): Implement business logic

**Adding a New Entity Type:**

```typescript
// 1. Define schemas in crud-factory-config.ts
const CreateWidgetSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['foo', 'bar']),
});

const UpdateWidgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: z.enum(['foo', 'bar']).optional(),
});

const DeleteWidgetSchema = z.object({
  id: z.string().uuid(),
});

// 2. Add entity configuration
export const entityConfigurations = {
  // ... existing entities
  widget: {
    entityName: 'widget',
    displayName: 'widget',
    handlerClass: WidgetHandler,
    create: {
      schema: CreateWidgetSchema,
      description: 'Create a new widget...',
      requiresWrite: true,
      category: 'core',
    },
    update: {
      schema: UpdateWidgetSchema,
      description: 'Update an existing widget...',
      requiresWrite: true,
      category: 'core',
    },
    delete: {
      schema: DeleteWidgetSchema,
      description: 'Delete a widget...',
      requiresWrite: true,
      category: 'core',
    },
  },
};

// 3. Generate tools in tools/index.ts
const widgetCRUDTools = createCRUDTools(entityConfigurations.widget);

// 4. Add to tool registry
const toolRegistry: CategorizedToolDefinition[] = [
  ...widgetCRUDTools,
  // ... other tools
];
```

**Entity Configuration Structure:**

```typescript
interface EntityCRUDConfig {
  entityName: string; // Tool name prefix (e.g., "category" → "create-category")
  displayName: string; // Human-readable name for messages
  handlerClass: EntityHandler; // Handler class constructor
  create: {
    schema: z.ZodType; // Zod schema for input validation
    description: string; // LLM-friendly tool description
    requiresWrite: boolean; // Permission requirement
    category: 'core' | 'nini'; // Feature flag category
  };
  update: {
    /* same structure */
  };
  delete: {
    /* same structure */
  };
}
```

**Generated Tools:**

For each entity configuration, the factory generates three tools:

- `create-{entityName}`: Create new entity
- `update-{entityName}`: Update existing entity
- `delete-{entityName}`: Delete entity

Each tool includes:

- JSON schema from Zod definition
- Input validation with type-safe handlers
- Handler execution with proper error context
- Cache invalidation
- Consistent error handling with operation, tool, and args context

## Code Quality

The codebase follows best practices for maintainability and reliability:

- **Type Safety**: All tool handlers use `Record<string, unknown>` instead of `any` for better type checking
- **Error Handling**: Consistent error context (operation, tool, args) for easier debugging
- **Documentation**: Comprehensive JSDoc comments for all public APIs
- **Logging**: Structured logging with consistent formatting and context
- **Validation**: Strong input validation using Zod schemas with `z.unknown()` for flexible data fields

## Performance

- **Persistent connection**: 70-90% faster after first request
- **Intelligent caching**: 60-80% cache hit rate
- **Parallel fetching**: 50% faster multi-account queries
- **Name resolution**: Cached for instant lookups

## Deployment & Debugging

- **Easy Panel Deployment:** See [Easy Panel Deployment Guide](./docs/easypanel-deployment.md)
- **General Debugging:** See [Debugging Guide](./docs/debugging.md)

Quick tips:

- Use `pnpm run inspector` to test the server interactively
- Enable performance tracking: `DEBUG_PERFORMANCE=true pnpm run inspector`
- View Claude Desktop logs: `tail -F ~/Library/Logs/Claude/mcp*.log`

## Support the Project

If you find this MCP server useful, consider supporting its development!

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_badges/orange_card.png)](https://www.buymeacoffee.com/your-username)

## License

MIT

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines.
