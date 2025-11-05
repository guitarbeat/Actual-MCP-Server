# Tool Consolidation Design

## Overview

This design addresses the tool proliferation issue in the Actual Budget MCP Server by consolidating 49 tools into a more manageable set while maintaining type safety, clear error messages, and LLM usability.

## Current State Analysis

### Tool Inventory

**Total Tools: 49**

**CRUD Pattern Groups:**
- **Accounts** (6 tools): create, update, close, reopen, delete, get-balance
- **Categories** (3 tools): create, update, delete
- **Category Groups** (3 tools): create, update, delete
- **Payees** (4 tools): create, update, delete, merge
- **Rules** (3 tools): create, update, delete
- **Schedules** (4 tools): create, update, delete, get
- **Transactions** (2 tools): create, update
- **Budget Operations** (4 tools): set-amount, set-carryover, hold, reset-hold

**Read-Only Tools (17):**
- get-transactions, get-accounts, get-grouped-categories, get-payees, get-payee-rules
- get-rules, get-schedules, get-budgets, get-budget-months, get-budget-month
- balance-history, spending-by-category, monthly-summary
- get-id-by-name, run-query, get-server-version, get-account-balance

**Write Tools (32):**
- 23 CRUD operations across 7 entity types
- 4 budget-specific operations
- 5 budget file management operations

### Consolidation Opportunity

**High-value consolidation targets:**

- **Standard CRUD entities** (18 tools → 6 tools): Account, Category, CategoryGroup, Payee, Rule, Schedule
- **Potential reduction**: 12 tools (25% of total)

**Keep as-is:**
- Read-only reporting tools (unique logic per tool)
- Budget operations (domain-specific, not pure CRUD)
- Budget file management (specialized operations)
- Transaction tools (complex validation, partial CRUD)

## Design Approach

### Option A: Generic Entity Manager (Recommended)

Create a single `manage-entity` tool that handles CRUD operations across entity types.

**Pros:**
- Maximum consolidation (18 tools → 1 tool)
- Single implementation to maintain
- Consistent behavior across entities
- Easy to add new entity types

**Cons:**
- More complex schema with nested entity-specific fields
- Requires careful TypeScript generics
- May be less intuitive for LLMs initially

### Option B: Operation-Based Consolidation

Create operation-specific tools: `create-entity`, `update-entity`, `delete-entity`.

**Pros:**
- Clear operation intent (18 tools → 3 tools)
- Simpler schema per tool
- Familiar CRUD pattern

- Better for LLM tool selection

**Cons:**
- Still 3 tools to maintain
- Duplicate entity-type handling logic
- Less consolidation benefit

### Option C: Hybrid Approach (Selected)

Consolidate standard CRUD entities while keeping specialized operations separate.

**Consolidate:**
- `manage-entity` tool for: Category, CategoryGroup, Payee, Rule, Schedule (15 tools → 1)

**Keep Separate:**
- Account tools (6 tools) - has specialized operations (close, reopen, balance)
- Transaction tools (2 tools) - complex validation, partial CRUD
- All read-only tools (17 tools) - unique logic
- Budget operations (4 tools) - domain-specific
- Budget file management (5 tools) - specialized

**Result: 49 tools → 35 tools (29% reduction)**

## Architecture Design

### Generic Entity Manager Tool

#### Schema Structure

```typescript
{
  name: 'manage-entity',
  description: 'Create, update, or delete entities (categories, payees, rules, schedules)',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        enum: ['category', 'categoryGroup', 'payee', 'rule', 'schedule'],
        description: 'Type of entity to manage'
      },
      operation: {
        type: 'string',
        enum: ['create', 'update', 'delete'],

        description: 'Operation to perform'
      },
      id: {
        type: 'string',
        description: 'Entity ID (required for update/delete)'
      },
      data: {
        type: 'object',
        description: 'Entity-specific data (required for create/update)',
        properties: {
          // Dynamic based on entityType
        }
      }
    },
    required: ['entityType', 'operation']
  }
}
```

#### Type System

```typescript
// Entity type discriminator
type EntityType = 'category' | 'categoryGroup' | 'payee' | 'rule' | 'schedule';
type Operation = 'create' | 'update' | 'delete';

// Entity-specific data types
interface CategoryData {
  name: string;
  groupId: string;
}

interface CategoryGroupData {
  name: string;
}

interface PayeeData {
  name: string;
  transferAccount?: string;
}

interface RuleData {
  stage?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface ScheduleData {
  name: string;
  accountId: string;
  amount: number;
  nextDate: string;
  rule: string;
  payee?: string;
  category?: string;
  notes?: string;
}

// Discriminated union for type safety
type EntityData = 
  | { entityType: 'category'; data: CategoryData }
  | { entityType: 'categoryGroup'; data: CategoryGroupData }
  | { entityType: 'payee'; data: PayeeData }
  | { entityType: 'rule'; data: RuleData }
  | { entityType: 'schedule'; data: ScheduleData };
```



#### Handler Implementation Pattern

```typescript
export async function handler(args: ManageEntityArgs): Promise<CallToolResult> {
  try {
    // 1. Parse and validate
    const parsed = ManageEntityArgsSchema.parse(args);
    
    // 2. Route to entity-specific handler
    const entityHandler = getEntityHandler(parsed.entityType);
    
    // 3. Execute operation
    const result = await entityHandler.execute(parsed.operation, parsed.id, parsed.data);
    
    // 4. Return success
    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

#### Entity Handler Registry

```typescript
interface EntityHandler {
  create(data: unknown): Promise<string>;
  update(id: string, data: unknown): Promise<void>;
  delete(id: string): Promise<void>;
  validate(operation: Operation, id?: string, data?: unknown): void;
}

class CategoryHandler implements EntityHandler {
  async create(data: unknown): Promise<string> {
    const validated = CategoryDataSchema.parse(data);
    return await createCategory({
      name: validated.name,
      group_id: validated.groupId
    });
  }
  
  async update(id: string, data: unknown): Promise<void> {
    const validated = CategoryDataSchema.parse(data);
    await updateCategory(id, {
      name: validated.name,
      group_id: validated.groupId
    });
  }
  
  async delete(id: string): Promise<void> {
    await deleteCategory(id);
  }
  
  validate(operation: Operation, id?: string, data?: unknown): void {
    if (operation !== 'create' && !id) {
      throw new Error('id is required for update/delete operations');
    }
    if (operation !== 'delete' && !data) {
      throw new Error('data is required for create/update operations');
    }
  }
}

const entityHandlers: Record<EntityType, EntityHandler> = {
  category: new CategoryHandler(),
  categoryGroup: new CategoryGroupHandler(),
  payee: new PayeeHandler(),
  rule: new RuleHandler(),
  schedule: new ScheduleHandler(),
};
```



### Module Structure

```
src/tools/manage-entity/
├── index.ts                    # Schema + main handler
├── types.ts                    # Type definitions
├── entity-handlers/
│   ├── base-handler.ts        # EntityHandler interface
│   ├── category-handler.ts    # Category operations
│   ├── category-group-handler.ts
│   ├── payee-handler.ts
│   ├── rule-handler.ts
│   └── schedule-handler.ts
├── validation/
│   ├── entity-schemas.ts      # Zod schemas per entity
│   └── operation-validator.ts # Operation-level validation
└── manage-entity.test.ts      # Comprehensive tests
```

## Error Handling

### Entity-Specific Error Messages

```typescript
class EntityErrorBuilder {
  static notFound(entityType: EntityType, id: string): MCPResponse {
    const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    return notFoundError(entityName, id, {
      suggestion: `Use get-${entityType}s to list available ${entityType}s`
    });
  }
  
  static validationError(entityType: EntityType, field: string, message: string): MCPResponse {
    return validationError(`Invalid ${entityType} ${field}: ${message}`, {
      entityType,
      field
    });
  }
  
  static operationError(entityType: EntityType, operation: Operation, err: unknown): MCPResponse {
    return apiError(
      `Failed to ${operation} ${entityType}`,
      err,
      {
        entityType,
        operation,
        suggestion: `Check that the ${entityType} exists and you have write permissions`
      }
    );
  }
}
```

## Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)

1. Implement `manage-entity` tool alongside existing tools
2. Add feature flag: `ENABLE_CONSOLIDATED_TOOLS=false` (default)
3. Full test coverage for new tool
4. Documentation with migration examples

### Phase 2: Deprecation Period (Week 3-4)

1. Enable consolidated tools by default: `ENABLE_CONSOLIDATED_TOOLS=true`
2. Add deprecation warnings to old tools:
   ```typescript
   console.warn(`Tool '${toolName}' is deprecated. Use 'manage-entity' instead.`);
   ```
3. Update README with migration guide
4. Monitor usage patterns

### Phase 3: Removal (Week 5+)

1. Remove deprecated tool implementations
2. Keep tool names in registry as aliases that redirect to `manage-entity`
3. Update all documentation
4. Release as major version bump



### Migration Examples

```typescript
// Old way
await callTool('create-category', {
  name: 'Groceries',
  groupId: 'group-123'
});

// New way
await callTool('manage-entity', {
  entityType: 'category',
  operation: 'create',
  data: {
    name: 'Groceries',
    groupId: 'group-123'
  }
});

// Old way
await callTool('update-payee', {
  id: 'payee-123',
  name: 'New Name'
});

// New way
await callTool('manage-entity', {
  entityType: 'payee',
  operation: 'update',
  id: 'payee-123',
  data: {
    name: 'New Name'
  }
});

// Old way
await callTool('delete-rule', {
  id: 'rule-123'
});

// New way
await callTool('manage-entity', {
  entityType: 'rule',
  operation: 'delete',
  id: 'rule-123'
});
```

## LLM Usability Considerations

### Tool Description

```
manage-entity: Create, update, or delete financial entities (categories, category groups, payees, rules, schedules)

Examples:
- Create a category: { entityType: 'category', operation: 'create', data: { name: 'Groceries', groupId: 'group-id' } }
- Update a payee: { entityType: 'payee', operation: 'update', id: 'payee-id', data: { name: 'New Name' } }
- Delete a rule: { entityType: 'rule', operation: 'delete', id: 'rule-id' }

For accounts and transactions, use the dedicated account-* and transaction-* tools.
For reading data, use get-* tools (get-grouped-categories, get-payees, etc.).
```

### Schema Hints

Include entity-specific field hints in the schema:

```typescript
{
  data: {
    type: 'object',
    description: `Entity data. Required fields by type:
      - category: name (string), groupId (string)
      - categoryGroup: name (string)
      - payee: name (string), transferAccount (string, optional)
      - rule: conditions (array), actions (array), stage (string, optional)
      - schedule: name, accountId, amount, nextDate, rule (all required)`,
    additionalProperties: true
  }
}
```



## Performance Considerations

### Cache Invalidation

```typescript
class EntityCacheInvalidator {
  static invalidate(entityType: EntityType, operation: Operation): void {
    const cacheKeys = {
      category: ['categories', 'category-groups'],
      categoryGroup: ['category-groups', 'categories'],
      payee: ['payees'],
      rule: ['rules'],
      schedule: ['schedules']
    };
    
    if (operation !== 'read') {
      cacheKeys[entityType].forEach(key => cacheService.invalidate(key));
    }
  }
}
```

### Performance Targets

- **Routing overhead**: <2ms per operation
- **Validation overhead**: <3ms per operation
- **Total overhead vs. specific tools**: <5ms
- **Memory footprint**: Same as current implementation (handlers are singletons)

## Testing Strategy

### Test Coverage

```typescript
describe('manage-entity', () => {
  describe('category operations', () => {
    it('should create category with valid data');
    it('should update category with valid data');
    it('should delete category by id');
    it('should return validation error for missing groupId');
    it('should return not found error for invalid id');
  });
  
  describe('payee operations', () => {
    // Similar tests for payee
  });
  
  // ... tests for all entity types
  
  describe('error handling', () => {
    it('should return entity-specific error messages');
    it('should validate operation requirements');
    it('should handle API errors gracefully');
  });
  
  describe('cache invalidation', () => {
    it('should invalidate cache on create');
    it('should invalidate cache on update');
    it('should invalidate cache on delete');
  });
});
```

### Integration Tests

```typescript
describe('manage-entity integration', () => {
  it('should match behavior of create-category tool');
  it('should match behavior of update-payee tool');
  it('should match behavior of delete-rule tool');
  // ... verify parity with all replaced tools
});
```



## Alternative: Bulk Operations Tool

As an additional enhancement (not replacement), consider a `batch-operations` tool for multi-step workflows.

### Use Case

```typescript
// Instead of 3 separate tool calls:
await callTool('create-category', { name: 'Groceries', groupId: 'group-1' });
await callTool('create-category', { name: 'Dining', groupId: 'group-1' });
await callTool('create-payee', { name: 'Whole Foods' });

// Single batch call:
await callTool('batch-operations', {
  operations: [
    { tool: 'manage-entity', args: { entityType: 'category', operation: 'create', data: { name: 'Groceries', groupId: 'group-1' } } },
    { tool: 'manage-entity', args: { entityType: 'category', operation: 'create', data: { name: 'Dining', groupId: 'group-1' } } },
    { tool: 'manage-entity', args: { entityType: 'payee', operation: 'create', data: { name: 'Whole Foods' } } }
  ]
});
```

### Benefits

- Reduces round-trip latency for multi-step workflows
- Atomic validation (all or nothing)
- Single transaction context
- Detailed per-operation results

### Implementation Complexity

- Medium complexity
- Requires careful error handling
- Transaction safety considerations
- Should be a separate spec/phase

## Recommendation

**Implement Hybrid Approach (Option C) with phased migration:**

1. **Phase 1**: Implement `manage-entity` tool (15 tools → 1)
2. **Phase 2**: Deprecation period with parallel support
3. **Phase 3**: Remove old implementations
4. **Future**: Consider bulk operations tool as separate enhancement

**Expected Outcome:**
- 49 tools → 35 tools (29% reduction)
- Maintained type safety and error clarity
- Improved maintainability
- Minimal LLM usability impact with good documentation

