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
│   ├── crud-factory.ts        # Generic CRUD tool generator
│   ├── crud-factory-config.ts # Entity configurations
│   └── manage-entity/         # Entity handlers
└── index.ts          # Server entry point
```

### CRUD Factory Pattern

The server uses a generic factory pattern to eliminate code duplication across CRUD operations. Instead of maintaining ~30 separate tool files, entity configurations are defined once and tools are generated automatically.

**Benefits:**
- **DRY Principle**: Single source of truth for CRUD logic
- **Type Safety**: Full TypeScript inference from Zod schemas
- **Consistency**: Uniform error handling and response formats
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
  entityName: string;           // Tool name prefix (e.g., "category" → "create-category")
  displayName: string;          // Human-readable name for messages
  handlerClass: EntityHandler;  // Handler class constructor
  create: {
    schema: z.ZodType;          // Zod schema for input validation
    description: string;        // LLM-friendly tool description
    requiresWrite: boolean;     // Permission requirement
    category: 'core' | 'nini';  // Feature flag category
  };
  update: { /* same structure */ };
  delete: { /* same structure */ };
}
```

**Generated Tools:**

For each entity configuration, the factory generates three tools:
- `create-{entityName}`: Create new entity
- `update-{entityName}`: Update existing entity
- `delete-{entityName}`: Delete entity

Each tool includes:
- JSON schema from Zod definition
- Input validation
- Handler execution
- Cache invalidation
- Consistent error handling

## Performance

- **Persistent connection**: 70-90% faster after first request
- **Intelligent caching**: 60-80% cache hit rate
- **Parallel fetching**: 50% faster multi-account queries
- **Name resolution**: Cached for instant lookups

## License

MIT

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines.
