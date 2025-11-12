# Design Document

## Overview

This design introduces a generic CRUD factory pattern to eliminate code duplication across ~30 entity tool files in the Actual Budget MCP server. The factory will generate create, update, and delete tool definitions from entity configurations while maintaining full backward compatibility with existing tool schemas and behavior.

The refactoring leverages the existing entity handler architecture (CategoryHandler, PayeeHandler, etc.) and builds a thin factory layer on top to generate tool definitions programmatically.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tool Registry                            │
│  (tools/index.ts - CategorizedToolDefinition[])             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Populated by
                 │
┌────────────────▼────────────────────────────────────────────┐
│              CRUD Factory                                    │
│  (tools/crud-factory.ts)                                    │
│                                                              │
│  • createCRUDTools<THandler>(config)                        │
│  • Generates: create, update, delete tool definitions       │
│  • Returns: CategorizedToolDefinition[]                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Uses
                 │
┌────────────────▼────────────────────────────────────────────┐
│          Entity Configuration                                │
│  (tools/crud-factory-config.ts)                             │
│                                                              │
│  • Entity schemas (Zod)                                     │
│  • Entity handlers (classes)                                │
│  • Tool descriptions (strings)                              │
│  • Metadata (requiresWrite, category)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Instantiates
                 │
┌────────────────▼────────────────────────────────────────────┐
│          Entity Handlers                                     │
│  (manage-entity/entity-handlers/)                           │
│                                                              │
│  • CategoryHandler                                          │
│  • PayeeHandler                                             │
│  • AccountHandler                                           │
│  • RuleHandler                                              │
│  • etc.                                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
1. Server Startup
   └─> setupTools() called
       └─> Imports CRUD factory configurations
           └─> For each entity type:
               └─> createCRUDTools() generates tool definitions
                   └─> Returns array of CategorizedToolDefinition
                       └─> Added to toolRegistry array

2. Tool Invocation (e.g., "create-category")
   └─> MCP server receives request
       └─> Finds tool in toolRegistry
           └─> Executes generated handler function
               └─> Validates input with Zod schema
                   └─> Instantiates entity handler (e.g., CategoryHandler)
                       └─> Calls handler.create(data)
                           └─> Invalidates cache
                               └─> Returns success response
```

## Components and Interfaces

### 1. CRUD Factory Core (`tools/crud-factory.ts`)

The main factory function that generates tool definitions:

```typescript
/**
 * Configuration for a single CRUD operation (create, update, or delete)
 */
interface CRUDOperationConfig<TSchema extends z.ZodType> {
  /** Zod schema for input validation */
  schema: TSchema;
  /** Tool description for LLMs */
  description: string;
  /** Whether this operation requires write permission */
  requiresWrite: boolean;
  /** Tool category (core or nini) */
  category: 'core' | 'nini';
}

/**
 * Complete configuration for an entity's CRUD tools
 */
interface EntityCRUDConfig<
  TCreateSchema extends z.ZodType,
  TUpdateSchema extends z.ZodType,
  TDeleteSchema extends z.ZodType,
  THandler extends EntityHandler
> {
  /** Entity name (e.g., "category", "payee") */
  entityName: string;
  /** Display name for messages (e.g., "Category", "Payee") */
  displayName: string;
  /** Entity handler class constructor */
  handlerClass: new () => THandler;
  /** Configuration for create operation */
  create: CRUDOperationConfig<TCreateSchema>;
  /** Configuration for update operation */
  update: CRUDOperationConfig<TUpdateSchema>;
  /** Configuration for delete operation */
  delete: CRUDOperationConfig<TDeleteSchema>;
}

/**
 * Generate CRUD tool definitions for an entity type
 * 
 * @param config - Entity CRUD configuration
 * @returns Array of tool definitions (create, update, delete)
 */
export function createCRUDTools<
  TCreateSchema extends z.ZodType,
  TUpdateSchema extends z.ZodType,
  TDeleteSchema extends z.ZodType,
  THandler extends EntityHandler
>(
  config: EntityCRUDConfig<TCreateSchema, TUpdateSchema, TDeleteSchema, THandler>
): CategorizedToolDefinition[];
```

**Implementation Details:**

- Generates three tool definitions: create, update, delete
- Each tool has:
  - `schema`: Tool name, description, and JSON schema from Zod
  - `handler`: Async function that validates, executes, and returns response
  - `requiresWrite`: Permission flag
  - `category`: Feature flag category
- Handler function flow:
  1. Parse and validate input with Zod schema
  2. Instantiate entity handler
  3. Call appropriate handler method (create/update/delete)
  4. Invalidate cache
  5. Return success/error response

### 2. Entity Configurations (`tools/crud-factory-config.ts`)

Centralized configuration for all entity types:

```typescript
import { CategoryHandler } from './manage-entity/entity-handlers/category-handler.js';
import { PayeeHandler } from './manage-entity/entity-handlers/payee-handler.js';
// ... other imports

/**
 * CRUD configurations for all entity types
 * Each configuration defines schemas, descriptions, and metadata
 */
export const entityConfigurations = {
  category: {
    entityName: 'category',
    displayName: 'category',
    handlerClass: CategoryHandler,
    create: {
      schema: z.object({
        name: z.string().min(1, 'Category name is required'),
        groupId: z.string().uuid('Group ID must be a valid UUID'),
      }),
      description: `Create a new category in Actual Budget.

REQUIRED:
- name: Category name
- groupId: Category group ID (UUID)

EXAMPLES:
- {"name": "Groceries", "groupId": "group-id"}
- {"name": "Gas", "groupId": "group-id"}

COMMON USE CASES:
- Add new spending categories
- Create income categories
- Organize budget by category

SEE ALSO:
- Use get-grouped-categories to find group IDs
- Use update-category to modify categories
- Use delete-category to remove categories

NOTES:
- Group ID must be a valid UUID
- Use get-grouped-categories to find available group IDs`,
      requiresWrite: true,
      category: 'core',
    },
    update: {
      schema: z.object({
        id: z.string().uuid('Category ID must be a valid UUID'),
        name: z.string().min(1).optional(),
        groupId: z.string().uuid().optional(),
      }),
      description: `Update an existing category in Actual Budget...`,
      requiresWrite: true,
      category: 'core',
    },
    delete: {
      schema: z.object({
        id: z.string().uuid('Category ID must be a valid UUID'),
      }),
      description: `Delete a category from Actual Budget...`,
      requiresWrite: true,
      category: 'core',
    },
  },
  payee: {
    // Similar structure for payees
  },
  // ... configurations for other entities
};
```

### 3. Tool Registry Integration (`tools/index.ts`)

Modified to use factory-generated tools:

```typescript
import { createCRUDTools } from './crud-factory.js';
import { entityConfigurations } from './crud-factory-config.js';

// Generate CRUD tools for all entities
const categoryCRUDTools = createCRUDTools(entityConfigurations.category);
const payeeCRUDTools = createCRUDTools(entityConfigurations.payee);
const accountCRUDTools = createCRUDTools(entityConfigurations.account);
const ruleCRUDTools = createCRUDTools(entityConfigurations.rule);
const categoryGroupCRUDTools = createCRUDTools(entityConfigurations.categoryGroup);

// Existing non-CRUD tools
import * as getTransactions from './get-transactions/index.js';
import * as spendingByCategory from './spending-by-category/index.js';
// ... other read-only tools

const toolRegistry: CategorizedToolDefinition[] = [
  // Factory-generated CRUD tools
  ...categoryCRUDTools,
  ...payeeCRUDTools,
  ...accountCRUDTools,
  ...ruleCRUDTools,
  ...categoryGroupCRUDTools,
  
  // Existing read-only tools
  { schema: getTransactions.schema, handler: getTransactions.handler, requiresWrite: false, category: 'core' },
  { schema: spendingByCategory.schema, handler: spendingByCategory.handler, requiresWrite: false, category: 'core' },
  // ... other tools
];
```

### 4. Entity Handlers (Existing - No Changes)

The existing entity handler classes remain unchanged:

```typescript
// manage-entity/entity-handlers/category-handler.ts
export class CategoryHandler implements EntityHandler<CategoryData, CategoryData> {
  async create(data: CategoryData): Promise<string> { /* ... */ }
  async update(id: string, data: CategoryData): Promise<void> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
  validate(operation: Operation, id?: string, data?: unknown): void { /* ... */ }
  invalidateCache(): void { /* ... */ }
}
```

## Data Models

### Tool Definition Structure

```typescript
interface CategorizedToolDefinition {
  schema: {
    name: string;                    // e.g., "create-category"
    description: string;              // LLM-friendly description
    inputSchema: JSONSchema;          // Generated from Zod schema
  };
  handler: (args: any) => Promise<MCPResponse>;
  requiresWrite: boolean;             // Permission flag
  category: 'core' | 'nini';         // Feature flag
}
```

### Entity Configuration Structure

```typescript
interface EntityCRUDConfig {
  entityName: string;                 // "category", "payee", etc.
  displayName: string;                // "Category", "Payee", etc.
  handlerClass: new () => EntityHandler;
  create: CRUDOperationConfig;
  update: CRUDOperationConfig;
  delete: CRUDOperationConfig;
}

interface CRUDOperationConfig {
  schema: z.ZodType;                  // Input validation schema
  description: string;                // Tool description
  requiresWrite: boolean;             // Permission requirement
  category: 'core' | 'nini';         // Feature category
}
```

## Error Handling

### Validation Errors

```typescript
// Zod validation errors are caught and wrapped
try {
  const validated = schema.parse(args);
} catch (error) {
  return errorFromCatch(error, {
    fallbackMessage: `Failed to validate ${operation} ${entityName} input`,
    suggestion: 'Check the input parameters match the tool schema',
  });
}
```

### Handler Errors

```typescript
// Entity handler errors are caught and wrapped
try {
  const handler = new handlerClass();
  const result = await handler.create(validated);
} catch (error) {
  return errorFromCatch(error, {
    fallbackMessage: `Failed to ${operation} ${entityName}`,
    suggestion: 'Check the Actual Budget server logs for details',
  });
}
```

### Cache Invalidation Errors

```typescript
// Cache invalidation errors are logged but don't fail the operation
try {
  handler.invalidateCache();
} catch (error) {
  console.error(`Failed to invalidate cache for ${entityName}:`, error);
  // Continue - cache invalidation failure shouldn't fail the operation
}
```

## Testing Strategy

### Unit Tests

**Factory Function Tests** (`crud-factory.test.ts`):
- Test tool generation for each entity type
- Verify tool schema structure
- Verify handler function signature
- Test with valid and invalid configurations

**Generated Tool Tests** (`crud-factory-integration.test.ts`):
- Test create operation with valid data
- Test update operation with valid data
- Test delete operation with valid ID
- Test validation errors for each operation
- Test handler errors are properly wrapped
- Test cache invalidation is called

### Integration Tests

**Tool Registry Tests** (`tools/index.test.ts`):
- Verify all expected tools are registered
- Verify tool names match expected format
- Verify tool categories are correct
- Verify write permissions are correct

**End-to-End Tests** (`integration.test.ts`):
- Test complete create → update → delete flow
- Test with actual Actual Budget API
- Verify responses match expected format
- Verify cache invalidation works

### Backward Compatibility Tests

**Schema Compatibility Tests** (`crud-factory-compatibility.test.ts`):
- Compare generated schemas with original schemas
- Verify tool names are identical
- Verify input parameters are identical
- Verify response formats are identical

## Migration Strategy

### Phase 1: Create Factory Infrastructure
1. Create `crud-factory.ts` with core factory function
2. Create `crud-factory-config.ts` with entity configurations
3. Add unit tests for factory function
4. Verify factory generates correct tool definitions

### Phase 2: Integrate One Entity Type
1. Generate tools for categories using factory
2. Add to tool registry alongside existing tools
3. Run integration tests to verify behavior
4. Compare generated vs. original tool schemas

### Phase 3: Migrate Remaining Entities
1. Add configurations for payees, accounts, rules, category groups
2. Generate tools for all entity types
3. Replace original tool imports with factory-generated tools
4. Run full test suite

### Phase 4: Remove Original Tool Files
1. Verify all tests pass with factory-generated tools
2. Delete original CRUD tool files (create-*, update-*, delete-*)
3. Update documentation
4. Final integration test run

### Phase 5: Cleanup and Optimization
1. Remove unused imports
2. Optimize factory function if needed
3. Add JSDoc comments
4. Update README with new architecture

## Performance Considerations

### Tool Generation Performance
- Factory generates tools once at server startup
- No runtime overhead compared to original implementation
- Tool generation time: < 1ms per entity type

### Runtime Performance
- Generated handlers have identical performance to original
- No additional function call overhead
- Cache invalidation behavior unchanged

### Memory Usage
- Reduced memory footprint due to fewer function definitions
- Shared factory code vs. duplicated handler code
- Estimated reduction: ~30KB of JavaScript code

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas (unchanged)
- Schema validation happens before handler execution
- Type safety maintained through TypeScript generics

### Permission Checks
- Write permission checks remain in tool registry
- Factory-generated tools respect requiresWrite flag
- No changes to permission model

### Error Information Disclosure
- Error messages remain consistent with original
- No additional sensitive information exposed
- Error wrapping maintains same level of detail

## Future Enhancements

### 1. Auto-Generate Descriptions
Generate tool descriptions from schema definitions:
```typescript
function generateDescription(entityName: string, operation: string, schema: z.ZodType): string {
  // Parse schema to extract fields
  // Generate description template
  // Return formatted description
}
```

### 2. Support Custom Operations
Extend factory to support entity-specific operations:
```typescript
interface EntityCRUDConfig {
  // ... existing fields
  customOperations?: {
    [operationName: string]: CRUDOperationConfig;
  };
}
```

### 3. Add Batch Operations
Generate batch versions of CRUD operations:
```typescript
createBatchCRUDTools(config) // Generates create-many, update-many, delete-many
```

### 4. Generate OpenAPI Specs
Auto-generate OpenAPI documentation from tool schemas:
```typescript
generateOpenAPISpec(toolRegistry) // Returns OpenAPI 3.0 spec
```

## Dependencies

### Existing Dependencies
- `zod`: Schema validation (already in use)
- `zod-to-json-schema`: Convert Zod to JSON Schema (already in use)
- `@modelcontextprotocol/sdk`: MCP server types (already in use)

### New Dependencies
None - uses only existing dependencies

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback**: Revert tool registry to use original imports
2. **Partial Rollback**: Keep factory for some entities, revert others
3. **Fix Forward**: Fix factory bugs and redeploy

Rollback is safe because:
- Original tool files remain until Phase 4
- Factory-generated tools are drop-in replacements
- No database schema changes
- No API contract changes
