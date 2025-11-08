# Architecture Documentation

This document describes the architecture of the Actual Budget MCP Server after the comprehensive refactoring completed in Phase 1-3 of the code-refactoring spec.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [API Connection Architecture](#api-connection-architecture)
- [Core Modules](#core-modules)
- [Tool Architecture](#tool-architecture)
- [Type System](#type-system)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Testing Strategy](#testing-strategy)

## Overview

The Actual Budget MCP Server is built on the Model Context Protocol (MCP) and provides LLM assistants with access to Actual Budget financial data. The architecture emphasizes:

- **Modularity**: Clear separation of concerns with reusable components
- **Type Safety**: Comprehensive TypeScript typing throughout
- **Consistency**: Standardized patterns across all tools
- **Performance**: Built-in caching and optimization
- **Maintainability**: Well-documented, testable code

## Design Principles

### 1. Single Responsibility Principle

Each module has a single, well-defined purpose:
- **Data Fetchers**: Retrieve data from Actual Budget API
- **Input Parsers**: Validate and parse tool arguments
- **Report Generators**: Format responses for LLM consumption
- **Response Builders**: Create consistent MCP responses

### 2. Don't Repeat Yourself (DRY)

Common functionality is centralized in the `core/` directory:
- Shared validators in `core/input/`
- Shared formatters in `core/formatting/`
- Shared mappers in `core/mapping/`
- Shared response builders in `core/response/`

### 3. Dependency Inversion

Tools depend on abstractions (interfaces) rather than concrete implementations, making them easier to test and modify.

### 4. Fail Fast

Input validation happens early in the request lifecycle, providing clear error messages before expensive operations.

## API Connection Architecture

### Persistent Connection Model

The server maintains a single persistent connection to the Actual Budget API throughout its lifetime, eliminating the overhead of repeated initialization and shutdown cycles.

#### Connection Lifecycle

```
Server Startup
     │
     ├─> initActualApi() [once]
     │   ├─> Connect to Actual server
     │   ├─> Download budget file
     │   └─> Initialize API state
     │
     ├─> Start MCP server
     │
     ▼
┌────────────────────────────────────────┐
│  Persistent Connection Active          │
│                                        │
│  ┌──────────────────────────────┐    │
│  │  Tool Call 1                 │    │
│  │  └─> Execute (~50-200ms)     │    │
│  └──────────────────────────────┘    │
│                                        │
│  ┌──────────────────────────────┐    │
│  │  Tool Call 2                 │    │
│  │  └─> Execute (~50-200ms)     │    │
│  └──────────────────────────────┘    │
│                                        │
│  ┌──────────────────────────────┐    │
│  │  Resource Request            │    │
│  │  └─> Execute (~50-200ms)     │    │
│  └──────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
     │
     ├─> SIGINT/SIGTERM received
     │
     ├─> shutdownActualApi() [once]
     │   ├─> Close API connection
     │   └─> Clean up resources
     │
     ▼
Server Shutdown
```

#### Request Flow Comparison

**Before (Per-Request Connection):**
```
Request → Init API (500-2000ms) → Execute (50-200ms) → Shutdown (100-300ms)
Total: 650-2500ms per request
```

**After (Persistent Connection):**
```
Request → Execute (50-200ms)
Total: 50-200ms per request (70-90% faster!)
```

### Connection State Management

The API connection state is managed in `src/actual-api.ts` with built-in guards to prevent race conditions:

```typescript
let initialized = false;      // Connection is active
let initializing = false;     // Connection is being established
let initializationError: Error | null = null;  // Last error

export async function initActualApi(): Promise<void> {
  // Fast path: already initialized
  if (initialized) return;
  
  // Wait if initialization is in progress
  if (initializing) {
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }
  
  // Initialize connection
  initializing = true;
  try {
    // ... initialization logic ...
    
    // Auto-load budget if ACTUAL_BUDGET_SYNC_ID is set
    const syncId = process.env.ACTUAL_BUDGET_SYNC_ID;
    if (syncId) {
      await api.downloadBudget(syncId);
      console.error(`✓ Budget loaded: ${syncId}`);
    }
    
    // Optional: Auto-sync on interval
    const autoSyncInterval = process.env.AUTO_SYNC_INTERVAL_MINUTES;
    if (autoSyncInterval && parseInt(autoSyncInterval) > 0) {
      const interval = parseInt(autoSyncInterval) * 60000;
      setInterval(() => api.sync(), interval);
    }
    
    initialized = true;
  } catch (error) {
    initializationError = error;
    throw error;
  } finally {
    initializing = false;
  }
}
```

### Automatic Budget Loading

When `ACTUAL_BUDGET_SYNC_ID` is set, the server automatically loads the specified budget during initialization. This eliminates the need for budget management tools in typical single-budget workflows.

**Benefits:**
- Budget is ready immediately when first tool is called
- No need to call `load-budget` or `download-budget` tools
- Reduces context window consumption by removing budget management tools
- Automatic background sync keeps data up-to-date (configurable via `AUTO_SYNC_INTERVAL_MINUTES`)

**Configuration:**
```bash
# Auto-load budget on startup (recommended for single-budget users)
ACTUAL_BUDGET_SYNC_ID=your-budget-id

# Auto-sync interval in minutes (0 to disable, default: 5)
AUTO_SYNC_INTERVAL_MINUTES=5
```

### Concurrent Request Handling

The persistent connection safely handles concurrent requests:

1. **First Request**: Initializes connection (if not already initialized)
2. **Concurrent Requests**: Wait for initialization to complete, then proceed
3. **Subsequent Requests**: Use existing connection immediately (fast path)

This design ensures:
- No duplicate initialization attempts
- No race conditions between concurrent requests
- Minimal latency for requests after initial connection

### Cleanup and Shutdown

The server properly cleans up resources on shutdown:

```typescript
// SIGINT handler (Ctrl+C)
process.on('SIGINT', async () => {
  console.error('SIGINT received, shutting down server');

  // Shutdown API connection
  await shutdownActualApi();

  server.close();
  process.exit(0);
});

// SIGTERM handler (graceful shutdown)
process.on('SIGTERM', async () => {
  console.error('SIGTERM received, shutting down server');
  await shutdownActualApi();
  server.close();
  process.exit(0);
});
```

### Performance Benefits

The persistent connection architecture provides significant performance improvements:

| Scenario | Before (ms) | After (ms) | Improvement |
|----------|-------------|------------|-------------|
| Single tool call (cold start) | 600-2200 | 600-2200 | 0% (same) |
| Single tool call (warm) | 600-2200 | 50-200 | 70-90% |
| 3 consecutive calls | 1800-6600 | 150-600 | 75-90% |
| 10 consecutive calls | 6000-22000 | 500-2000 | 90-92% |

**Time Savings Per Request:**
- API initialization: 400-1800ms saved
- Budget download: 100-400ms saved
- API shutdown: 100-300ms saved
- **Total saved**: 600-2500ms per request

### Backward Compatibility

The persistent connection architecture maintains full backward compatibility:

- All tool interfaces remain unchanged
- All wrapper functions continue to call `initActualApi()` (with guard)
- Error handling behavior is preserved
- Can be tested in isolation (test modes still shutdown after completion)

## Core Modules

### Response Module (`src/core/response/`)

Centralizes all response building logic for consistent MCP responses.

**Key Files:**
- `response-builder.ts` - Success and error response builders
- `error-builder.ts` - Specialized error builders (validation, not found, API, permission)
- `types.ts` - Response type definitions

**Usage Example:**
```typescript
import { success, errorFromCatch } from '../../core/response/index.js';
import { validationError, notFoundError } from '../../core/response/error-builder.js';

// Success response
return success('Operation completed successfully');

// Validation error
return validationError('Invalid account ID', {
  field: 'accountId',
  value: accountId,
  expected: 'UUID format'
});

// Not found error
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts'
});

// Error from exception
try {
  // ... operation
} catch (err) {
  return errorFromCatch(err);
}
```

### Input Module (`src/core/input/`)

Provides validation and parsing utilities for tool arguments.

**Key Files:**
- `validators.ts` - Common validation functions (UUID, date, amount, month)
- `argument-parser.ts` - Generic argument parsing utilities

**Usage Example:**
```typescript
import { validateUUID, validateMonth } from '../../core/input/validators.js';

if (!validateUUID(accountId)) {
  return validationError('Invalid account ID format');
}

if (!validateMonth(month)) {
  return validationError('Month must be in YYYY-MM format');
}
```

### Formatting Module (`src/core/formatting/`)

Handles date and amount formatting consistently across the application.

**Key Files:**
- `date-formatter.ts` - Date formatting utilities
- `amount-formatter.ts` - Amount formatting utilities

**Usage Example:**
```typescript
import { formatDate, formatDateRange } from '../../core/formatting/index.js';
import { formatAmount } from '../../core/formatting/amount-formatter.js';

const formattedDate = formatDate(new Date());
const formattedAmount = formatAmount(125000); // "$1,250.00"
```

### Data Module (`src/core/data/`)

Centralized data fetching with caching and parallel execution support.

**Key Files:**
- `fetch-accounts.ts` - Account data fetching
- `fetch-categories.ts` - Category data fetching
- `fetch-payees.ts` - Payee data fetching
- `fetch-transactions.ts` - Transaction data fetching (with parallel support)
- `fetch-rules.ts` - Rule data fetching

**Features:**
- Automatic caching of frequently accessed data
- Parallel fetching for multi-account queries
- Consistent error handling

### Cache Module (`src/core/cache/`)

LRU cache with TTL support for performance optimization.

**Key Features:**
- Configurable TTL (default: 5 minutes)
- Automatic cache invalidation on write operations
- Pattern-based invalidation for related data
- Cache statistics tracking (hit rate, miss rate)

**Configuration:**
```bash
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
CACHE_MAX_ENTRIES=1000
```

### Mapping Module (`src/core/mapping/`)

Entity mapping and classification utilities.

**Key Files:**
- `category-mapper.ts` - Category mapping utilities
- `category-classifier.ts` - Income/expense/savings classification
- `transaction-mapper.ts` - Transaction enrichment

### Aggregation Module (`src/core/aggregation/`)

Data aggregation utilities for reporting.

**Key Files:**
- `group-by.ts` - Generic grouping utility
- `sort-by.ts` - Sorting utilities
- `sum-by.ts` - Summation utilities
- `transaction-grouper.ts` - Transaction grouping logic

### Utils Module (`src/core/utils/`)

Utility functions for common operations.

**Key Files:**
- `name-resolver.ts` - Name-to-ID resolution with caching

**Name Resolution:**

The `NameResolver` class provides automatic name-to-ID conversion for accounts, categories, and payees, making tools more intuitive to use.

```typescript
export class NameResolver {
  private accountCache: Map<string, string> = new Map();
  private categoryCache: Map<string, string> = new Map();
  private payeeCache: Map<string, string> = new Map();
  
  async resolveAccount(nameOrId: string): Promise<string> {
    // Check if already an ID (UUID format)
    if (validateUUID(nameOrId)) return nameOrId;
    
    // Check cache
    if (this.accountCache.has(nameOrId)) {
      return this.accountCache.get(nameOrId)!;
    }
    
    // Fetch and search
    const accounts = await fetchAllAccounts();
    const account = accounts.find(a => 
      a.name.toLowerCase() === nameOrId.toLowerCase()
    );
    
    if (!account) {
      const available = accounts.map(a => a.name).join(', ');
      throw new Error(
        `Account '${nameOrId}' not found. Available accounts: ${available}`
      );
    }
    
    this.accountCache.set(nameOrId, account.id);
    return account.id;
  }
  
  // Similar methods for categories and payees
}
```

**Benefits:**
- More intuitive tool usage (use names instead of UUIDs)
- Helpful error messages with suggestions
- Cached for performance (reduces API calls by 60-80%)
- Case-insensitive matching

**Usage Example:**
```typescript
const resolver = new NameResolver();

// Accepts both UUIDs and names
const accountId = await resolver.resolveAccount('Checking');
const categoryId = await resolver.resolveCategory('Food');
const payeeId = await resolver.resolvePayee('Grocery Store');
```

### Types Module (`src/core/types/`)

Centralized type definitions and schemas.

**Key Files:**
- `domain.ts` - Core domain entities (Account, Transaction, Category, etc.)
- `schemas.ts` - Zod schemas for validation
- `tool-args.ts` - Tool argument types
- `responses.ts` - Response types

## Tool Architecture

### Tool Consolidation Pattern

To reduce cognitive load on LLMs and improve maintainability, the server implements a tool consolidation pattern for CRUD operations. Instead of having separate tools for each operation on each entity type (e.g., `create-category`, `update-category`, `delete-category`), related operations are consolidated into a single generic tool.

#### Consolidation Benefits

1. **Reduced Tool Count**: 15 entity-specific CRUD tools → 1 consolidated tool (93% reduction)
2. **Consistent Interface**: Same pattern for all entity types
3. **Easier Maintenance**: Single codebase for CRUD logic
4. **Better Type Safety**: Discriminated unions ensure type correctness
5. **Simplified Testing**: Shared test patterns across entities

#### Tool Count Evolution

**Phase 1 - Entity Consolidation (v2.0.0):**
- Before: 49 tools (15 entity CRUD tools + 34 others)
- After: 35 tools (1 `manage-entity` + 34 others)
- Reduction: 29%

**Phase 2 - Transaction & Budget Consolidation (v2.1.0):**
- Before: 37 tools
- After: 20 core tools + 17 optional tools
- Core tool reduction: 46%
- Context window savings: ~2,550 tokens

**Consolidated Tools:**
- `manage-entity` - Handles all entity CRUD operations (5 entity types × 3 operations)
- `manage-transaction` - Handles transaction create/update/delete operations
- `set-budget` - Handles budget amount and carryover operations

**Optional Tools (disabled by default, can be re-enabled):**
- Budget file management (8 tools) - Enable with `ENABLE_BUDGET_MANAGEMENT=true`
- Advanced account operations (4 tools) - Enable with `ENABLE_ADVANCED_ACCOUNT_OPS=true`
- Utility tools (3 tools) - Enable with `ENABLE_UTILITY_TOOLS=true`
- Advanced budget operations (2 tools) - Permanently removed

### Consolidated Tools

The server implements three consolidated tools that reduce cognitive load and improve maintainability:

1. **`manage-entity`** - CRUD operations for categories, category groups, payees, rules, and schedules
2. **`manage-transaction`** - Create, update, and delete transactions with name resolution
3. **`set-budget`** - Set budget amount and/or carryover in a single call

### `manage-entity` (Consolidated Tool)

The `manage-entity` tool uses an entity handler registry pattern that dispatches operations to entity-specific handlers while maintaining a unified interface.

```
src/tools/manage-entity/
├── index.ts                    # Main handler with entity routing
├── types.ts                    # Entity types, schemas, and discriminated unions
├── errors/
│   └── entity-error-builder.ts # Entity-specific error messages
└── entity-handlers/
    ├── base-handler.ts         # EntityHandler interface
    ├── registry.ts             # Handler registry
    ├── category-handler.ts     # Category CRUD operations
    ├── category-group-handler.ts
    ├── payee-handler.ts
    ├── rule-handler.ts
    └── schedule-handler.ts
```

#### Entity Handler Pattern

Each entity handler implements the `EntityHandler` interface:

```typescript
interface EntityHandler<TCreateData, TUpdateData> {
  create(data: TCreateData): Promise<string>;
  update(id: string, data: TUpdateData): Promise<void>;
  delete(id: string): Promise<void>;
  validate(operation: Operation, id?: string, data?: unknown): void;
  invalidateCache(): void;
}
```

**Example Handler:**
```typescript
export class CategoryHandler implements EntityHandler<CategoryData, CategoryData> {
  async create(data: CategoryData): Promise<string> {
    const validated = CategoryDataSchema.parse(data);
    return createCategory({
      name: validated.name,
      group_id: validated.groupId,
    });
  }

  async update(id: string, data: CategoryData): Promise<void> {
    const validated = CategoryDataSchema.parse(data);
    await updateCategory(id, {
      name: validated.name,
      group_id: validated.groupId,
    });
  }

  async delete(id: string): Promise<void> {
    await deleteCategory(id);
  }

  validate(operation: Operation, id?: string, data?: unknown): void {
    if (operation !== 'create' && !id) {
      throw EntityErrorBuilder.missingParameter(operation, 'id');
    }
    if (operation !== 'delete' && !data) {
      throw EntityErrorBuilder.missingParameter(operation, 'data');
    }
  }

  invalidateCache(): void {
    cacheService.clear('categories:all');
  }
}
```

#### Type-Safe Entity Routing

The main handler uses TypeScript discriminated unions for type safety:

```typescript
type EntityType = 'category' | 'categoryGroup' | 'payee' | 'rule' | 'schedule';
type Operation = 'create' | 'update' | 'delete';

interface ManageEntityArgs {
  entityType: EntityType;
  operation: Operation;
  id?: string;
  data?: unknown;
}

const entityHandlers: Record<EntityType, EntityHandler<any, any>> = {
  category: new CategoryHandler(),
  categoryGroup: new CategoryGroupHandler(),
  payee: new PayeeHandler(),
  rule: new RuleHandler(),
  schedule: new ScheduleHandler(),
};

export async function handler(args: ManageEntityArgs): Promise<MCPResponse> {
  const { entityType, operation, id, data } = args;
  const handler = entityHandlers[entityType];
  
  handler.validate(operation, id, data);
  
  switch (operation) {
    case 'create':
      const newId = await handler.create(data);
      handler.invalidateCache();
      return success(`Successfully created ${entityType} with id ${newId}`);
    // ... update and delete cases
  }
}
```

#### Entity-Specific Error Messages

The `EntityErrorBuilder` provides contextual error messages:

```typescript
// Not found error with entity-specific suggestion
EntityErrorBuilder.notFound('category', categoryId);
// → "Category with ID 'abc-123' not found. Use 'get-grouped-categories' to list available categories."

// Validation error with entity context
EntityErrorBuilder.validationError('payee', 'name', 'Name is required');
// → "Invalid payee name: Name is required"

// Operation error with helpful context
EntityErrorBuilder.operationError('rule', 'create', error);
// → "Failed to create rule. Check that the Rule exists using 'get-rules' and you have write permissions enabled."
```

#### Migration Strategy

The consolidation was implemented with a phased migration approach:

**Phase 1: Parallel Implementation**
- Implement `manage-entity` alongside existing tools
- Feature flag: `features.manageEntityTool = false` (disabled by default)
- Full test coverage for new tool

**Phase 2: Deprecation Period** (Current)
- Enable consolidated tool: `features.manageEntityTool = true`
- Add deprecation warnings to old tools via `deprecate()` wrapper
- Both old and new tools work simultaneously

**Phase 3: Removal** (Future)
- Remove old tool implementations
- Keep tool names as aliases in registry
- Update all documentation

**Deprecation Example:**
```typescript
function deprecate(handler: Handler, newTool: string): Handler {
  return async (args: any) => {
    console.warn(`[DEPRECATION] This tool is deprecated. Use ${newTool} instead.`);
    return handler(args);
  };
}

const toolRegistry: ToolDefinition[] = [
  { 
    schema: createCategory.schema, 
    handler: deprecate(createCategory.handler, 'manage-entity'), 
    requiresWrite: true 
  },
  // ... other deprecated tools
];
```

#### Performance Characteristics

The consolidated tool maintains the same performance as individual tools:

- **Routing overhead**: <2ms per operation
- **Validation overhead**: <3ms per operation
- **Total overhead**: <5ms compared to specific tools
- **Memory footprint**: Same (handlers are singletons)
- **Cache invalidation**: Identical to specific tools

#### When to Consolidate

Tool consolidation is appropriate when:

1. **Similar Operations**: Tools perform similar CRUD operations
2. **Shared Logic**: Significant code duplication exists
3. **Type Safety**: Can be maintained with discriminated unions
4. **Clear Grouping**: Tools naturally belong together (e.g., entity management)
5. **LLM Benefit**: Reduces cognitive load without losing clarity

**Not appropriate for:**
- Tools with unique, complex logic
- Tools with very different parameter structures
- Read-only reporting tools (each has unique output)
- Domain-specific operations (e.g., budget operations)

### `manage-transaction` (Consolidated Tool)

The `manage-transaction` tool consolidates transaction creation, updating, and deletion into a single tool with automatic name resolution.

```
src/tools/manage-transaction/
├── index.ts              # Main handler with operation routing
├── input-parser.ts       # Argument validation
├── data-fetcher.ts       # Transaction data retrieval
├── report-generator.ts   # Response formatting
└── types.ts              # Transaction types and schemas
```

**Key Features:**
- Unified interface for create, update, and delete operations
- Automatic name-to-ID resolution for accounts, categories, and payees
- Operation-specific validation (e.g., `id` required for update and delete)
- Consistent error messages
- Automatic cache invalidation after mutations

**Example Usage:**
```typescript
// Create transaction with names
{
  "operation": "create",
  "transaction": {
    "account": "Checking",
    "date": "2025-01-15",
    "amount": 5000,
    "payee": "Grocery Store",
    "category": "Food"
  }
}

// Update transaction
{
  "operation": "update",
  "id": "transaction-id",
  "transaction": {
    "amount": 6000,
    "notes": "Updated amount"
  }
}

// Delete transaction
{
  "operation": "delete",
  "id": "transaction-id"
}
```

**Benefits:**
- Reduces tool count (consolidated CRUD operations)
- More intuitive with name resolution
- Consistent interface for all operations
- Automatic cache invalidation ensures data consistency
- Helpful error messages with suggestions

### `set-budget` (Consolidated Tool)

The `set-budget` tool consolidates budget amount and carryover operations into a single tool.

```
src/tools/set-budget/
├── index.ts              # Main handler
├── types.ts              # Budget types and schemas
└── index.test.ts         # Unit tests
```

**Key Features:**
- Set budget amount and/or carryover in one call
- Automatic name-to-ID resolution for categories
- Optional parameters (can set amount only, carryover only, or both)
- Validates month format (YYYY-MM)

**Example Usage:**
```typescript
// Set amount only
{
  "month": "2025-01",
  "category": "Food",
  "amount": 50000
}

// Set carryover only
{
  "month": "2025-01",
  "category": "Food",
  "carryover": true
}

// Set both
{
  "month": "2025-01",
  "category": "Food",
  "amount": 50000,
  "carryover": true
}
```

**Benefits:**
- Reduces tool count from 2 to 1
- More efficient (set both in one call)
- Name resolution for categories
- Simpler mental model

### Standard Tool Structure

Every tool follows a consistent modular pattern:

```
src/tools/[tool-name]/
├── index.ts              # Schema + handler export (REQUIRED)
├── input-parser.ts       # Argument validation (if needed)
├── data-fetcher.ts       # Data retrieval (if needed)
├── report-generator.ts   # Response formatting (if needed)
└── types.ts              # Tool-specific types (if needed)
```

### Tool Index Pattern

Every tool's `index.ts` exports a schema and handler:

```typescript
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import { ToolArgsSchema, type ToolArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';

export const schema = {
  name: 'tool-name',
  description: 'Tool description',
  inputSchema: zodToJsonSchema(ToolArgsSchema) as ToolInput,
};

export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    // 1. Parse and validate input
    const input = new InputParser().parse(args);
    
    // 2. Fetch required data
    const data = await new DataFetcher().fetchAll(input);
    
    // 3. Process/transform data
    const processed = processData(data);
    
    // 4. Generate response
    const markdown = new ReportGenerator().generate(processed);
    
    return successWithContent({ type: 'text', text: markdown });
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

### Tool Registration

Tools are registered in `src/tools/index.ts` using a registry pattern with support for core and optional tools:

```typescript
interface ToolDefinition {
  schema: ToolSchema;
  handler: (args: unknown) => Promise<CallToolResult>;
  requiresWrite: boolean;
}

// Core tools (always available)
const coreTools: ToolDefinition[] = [
  // Transactions (2)
  { schema: getTransactions.schema, handler: getTransactions.handler, requiresWrite: false },
  { schema: manageTransaction.schema, handler: manageTransaction.handler, requiresWrite: true },
  
  // Accounts (2)
  { schema: getAccounts.schema, handler: getAccounts.handler, requiresWrite: false },
  { schema: manageAccount.schema, handler: manageAccount.handler, requiresWrite: true },
  
  // Categories & Budget (2)
  { schema: getGroupedCategories.schema, handler: getGroupedCategories.handler, requiresWrite: false },
  { schema: setBudget.schema, handler: setBudget.handler, requiresWrite: true },
  
  // Entity Management (3)
  { schema: manageEntity.schema, handler: manageEntity.handler, requiresWrite: true },
  { schema: getPayees.schema, handler: getPayees.handler, requiresWrite: false },
  { schema: getRules.schema, handler: getRules.handler, requiresWrite: false },
  
  // Financial Insights (3)
  { schema: spendingByCategory.schema, handler: spendingByCategory.handler, requiresWrite: false },
  { schema: monthlySummary.schema, handler: monthlySummary.handler, requiresWrite: false },
  { schema: balanceHistory.schema, handler: balanceHistory.handler, requiresWrite: false },
  
  // Advanced Operations (3)
  { schema: mergePayees.schema, handler: mergePayees.handler, requiresWrite: true },
  { schema: runBankSync.schema, handler: runBankSync.handler, requiresWrite: true },
  { schema: runImport.schema, handler: runImport.handler, requiresWrite: true },
  
  // Schedules (2)
  { schema: getSchedules.schema, handler: getSchedules.handler, requiresWrite: false },
];

// Optional tools (disabled by default)
const optionalTools: ToolDefinition[] = [
  // Budget file management (ENABLE_BUDGET_MANAGEMENT=true)
  { schema: getBudgets.schema, handler: getBudgets.handler, requiresWrite: false },
  { schema: loadBudget.schema, handler: loadBudget.handler, requiresWrite: true },
  // ... other budget management tools
  
  // Advanced account operations (ENABLE_ADVANCED_ACCOUNT_OPS=true)
  { schema: createAccount.schema, handler: createAccount.handler, requiresWrite: true },
  { schema: closeAccount.schema, handler: closeAccount.handler, requiresWrite: true },
  // ... other account operations
  
  // Utility tools (ENABLE_UTILITY_TOOLS=true)
  { schema: getIdByName.schema, handler: getIdByName.handler, requiresWrite: false },
  { schema: runQuery.schema, handler: runQuery.handler, requiresWrite: false },
  { schema: getServerVersion.schema, handler: getServerVersion.handler, requiresWrite: false },
];

function getAvailableTools(enableWrite: boolean): ToolDefinition[] {
  let tools = [...coreTools];
  
  // Add optional tools if enabled
  if (process.env.ENABLE_BUDGET_MANAGEMENT === 'true') {
    tools.push(...optionalTools.filter(t => t.schema.name.includes('budget')));
  }
  
  if (process.env.ENABLE_ADVANCED_ACCOUNT_OPS === 'true') {
    tools.push(...optionalTools.filter(t => t.schema.name.includes('account')));
  }
  
  if (process.env.ENABLE_UTILITY_TOOLS === 'true') {
    tools.push(...optionalTools.filter(t => 
      ['get-id-by-name', 'run-query', 'get-server-version'].includes(t.schema.name)
    ));
  }
  
  return enableWrite ? tools : tools.filter(t => !t.requiresWrite);
}
```

This provides:
- Automatic write permission checking
- Easy tool discovery
- Consistent error handling
- Simple tool addition process
- Feature flag support for optional tools
- Reduced context window consumption (20 core tools vs 37 total)

## Type System

### Type Organization

Types are organized by purpose:

1. **Domain Types** (`core/types/domain.ts`)
   - Core entities: Account, Transaction, Category, Payee, etc.
   - Shared across multiple tools

2. **Schema Types** (`core/types/schemas.ts`)
   - Zod schemas for runtime validation
   - Generate TypeScript types automatically

3. **Tool Argument Types** (`core/types/tool-args.ts`)
   - Input types for each tool
   - Derived from Zod schemas

4. **Response Types** (`core/types/responses.ts`)
   - MCP response structures
   - Error payload formats

### Type Safety Benefits

- **Compile-time checking**: Catch errors before runtime
- **IDE support**: Better autocomplete and refactoring
- **Runtime validation**: Zod schemas validate at runtime
- **Self-documenting**: Types serve as documentation

## Error Handling

### Error Response Structure

All errors follow a consistent structure:

```typescript
interface ErrorPayload {
  error: true;
  message: string;
  suggestion: string;
}
```

### Error Types

1. **Validation Errors**: Invalid input format or missing required fields
2. **Not Found Errors**: Entity doesn't exist
3. **API Errors**: Actual Budget API failures
4. **Permission Errors**: Write access required but not enabled

### Error Suggestions

The response builder automatically infers helpful suggestions based on error messages:

```typescript
// Automatically suggests using get-accounts
return notFoundError('Account', accountId);

// Automatically suggests YYYY-MM format
return validationError('Invalid month format', { field: 'month' });
```

### Error Logging

All errors are logged with context:
- Tool name
- Input arguments
- Error message and stack trace
- Timestamp

## Performance Optimization

### Caching Strategy

**What's Cached:**
- Accounts (5 minute TTL)
- Categories (5 minute TTL)
- Category Groups (5 minute TTL)
- Payees (5 minute TTL)

**What's Not Cached:**
- Transactions (change frequently)
- Budget data (change frequently)

### Cache Invalidation

Write operations automatically invalidate related cache entries:

```typescript
// Creating a category invalidates category cache
await api.createCategory(data);
cacheService.invalidate('categories');
```

### Parallel Fetching

Multi-account transaction queries execute in parallel:

```typescript
const results = await Promise.all(
  accountIds.map(id => fetchTransactionsForAccount(id))
);
```

### Performance Targets

- **Multi-Account Queries**: 50% faster with caching
- **Cache Hit Rate**: >80% for accounts, categories, payees
- **Transaction Enrichment**: <100ms for 1000+ transactions
- **Cache Overhead**: <5ms per operation

## Testing Strategy

### Test Organization

Tests are co-located with source files using `.test.ts` naming:

```
src/core/response/
├── response-builder.ts
├── response-builder.test.ts
├── error-builder.ts
└── error-builder.test.ts
```

### Test Coverage Requirements

- **Core modules**: 90%+ coverage
- **Utility functions**: 100% coverage
- **Response builders**: 100% coverage
- **Validators**: 100% coverage

### Test Patterns

Each test suite includes:
1. **Happy path**: Expected use case
2. **Edge cases**: Boundary conditions
3. **Error cases**: Error handling

### Mocking Strategy

- External dependencies (Actual Budget API) are mocked
- Core utilities are tested with real implementations
- Integration tests verify end-to-end behavior

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:unit:watch

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

## Migration from Legacy Code

The refactoring maintained 100% backward compatibility:

1. **Gradual Migration**: Changes were made in phases
2. **Re-exports**: Old import paths still work via re-exports
3. **Regression Testing**: All existing tests pass
4. **Performance Benchmarks**: No performance degradation

### Backward Compatibility

Old code continues to work:

```typescript
// Old import (still works)
import { formatDate } from './utils.js';

// New import (preferred)
import { formatDate } from './core/formatting/index.js';
```

## Future Enhancements

Potential improvements for future consideration:

1. **Plugin System**: Allow external tools to be registered
2. **Tool Composition**: Combine multiple tools into workflows
3. **Response Streaming**: Stream large responses incrementally
4. **GraphQL API**: Add GraphQL layer on top of tools
5. **Tool Versioning**: Support multiple versions of tools

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Actual Budget API Documentation](https://actualbudget.org/docs/api/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Zod Documentation](https://zod.dev/)
