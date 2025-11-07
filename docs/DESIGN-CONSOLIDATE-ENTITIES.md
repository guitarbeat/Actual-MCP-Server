# Design: Consolidate Transactions and Accounts into manage-entity

## Overview

This design explores consolidating `manage-transaction` and `manage-account` into the existing `manage-entity` tool to create a unified, consistent API for all entity management operations.

## Current State

### manage-entity (5 entity types)
- **Entity Types**: `category`, `categoryGroup`, `payee`, `rule`, `schedule`
- **Operations**: `create`, `update`, `delete`
- **Pattern**: EntityHandler interface with registry
- **Schema**: Nested data object
- **Complexity**: Simple CRUD operations

### manage-transaction (separate tool)
- **Operations**: `create`, `update`, `delete`
- **Special Features**:
  - Name resolution (account, payee, category names → IDs)
  - Amount conversion (dollars/cents auto-detection)
  - Flattened schema (not nested)
  - Split transaction support
- **Complexity**: Medium (name resolution, amount conversion)

### manage-account (separate tool)
- **Operations**: `create`, `update`, `delete`, `close`, `reopen`, `balance`
- **Special Features**:
  - Extended operations beyond CRUD (`close`, `reopen`, `balance`)
  - Nested schema (`account` object)
  - Initial balance handling
  - Transfer support for closing accounts
- **Complexity**: High (lifecycle management, special operations)

## Proposed Consolidation

### Extended Entity Types

Add two new entity types to `manage-entity`:
- `transaction` - Financial transactions
- `account` - Financial accounts

### Extended Operations

Extend the `Operation` type to support account-specific operations:
```typescript
type Operation = 'create' | 'update' | 'delete' | 'close' | 'reopen' | 'balance';
```

Note: `close`, `reopen`, and `balance` would only be valid for `entityType: 'account'`.

### Architecture Changes

#### 1. Entity Handler Pattern Extension

**Current Pattern:**
```typescript
interface EntityHandler<TCreateData, TUpdateData> {
  create(data: TCreateData): Promise<string>;
  update(id: string, data: TUpdateData): Promise<void>;
  delete(id: string): Promise<void>;
  validate(operation: Operation, id?: string, data?: unknown): void;
  invalidateCache(): void;
}
```

**Extended Pattern:**
```typescript
interface EntityHandler<TCreateData, TUpdateData> {
  // Standard CRUD
  create(data: TCreateData): Promise<string>;
  update(id: string, data: TUpdateData): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Extended operations (optional, account-specific)
  close?(id: string, data?: unknown): Promise<void>;
  reopen?(id: string): Promise<void>;
  balance?(id: string, date?: string): Promise<number>;
  
  // Validation and cache
  validate(operation: Operation, id?: string, data?: unknown): void;
  invalidateCache(): void;
  
  // Name resolution (optional, transaction-specific)
  resolveNames?(data: unknown): Promise<unknown>;
}
```

#### 2. Transaction Handler Implementation

**Key Features to Preserve:**
- Name resolution for accounts, payees, categories
- Amount conversion (dollars ↔ cents)
- Flattened input schema (for backward compatibility)
- Split transaction support

**Implementation Approach:**
```typescript
export class TransactionHandler implements EntityHandler<TransactionData, TransactionData> {
  async create(data: TransactionData): Promise<string> {
    // 1. Resolve names to IDs
    const resolved = await this.resolveNames(data);
    
    // 2. Convert amount to cents
    const normalized = this.normalizeAmount(resolved);
    
    // 3. Create transaction
    return createTransaction(normalized);
  }
  
  async resolveNames(data: TransactionData): Promise<TransactionData> {
    // Resolve account, payee, category names to IDs
    // Reuse existing name resolution logic
  }
  
  normalizeAmount(data: TransactionData): TransactionData {
    // Auto-detect dollars vs cents
    // Convert to cents if needed
  }
}
```

#### 3. Account Handler Implementation

**Key Features to Preserve:**
- Extended operations (`close`, `reopen`, `balance`)
- Nested schema support
- Initial balance handling
- Transfer support

**Implementation Approach:**
```typescript
export class AccountHandler implements EntityHandler<AccountData, AccountData> {
  // Standard CRUD
  async create(data: AccountData): Promise<string> {
    // Handle initialBalance if provided
    return createAccount(data);
  }
  
  async update(id: string, data: AccountData): Promise<void> {
    return updateAccount(id, data);
  }
  
  async delete(id: string): Promise<void> {
    return deleteAccount(id);
  }
  
  // Extended operations
  async close(id: string, data?: CloseAccountData): Promise<void> {
    // Handle transfer if balance non-zero
    return closeAccount(id, data?.transferAccountId);
  }
  
  async reopen(id: string): Promise<void> {
    return reopenAccount(id);
  }
  
  async balance(id: string, date?: string): Promise<number> {
    return getAccountBalance(id, date);
  }
}
```

#### 4. Schema Updates

**Extended EntityType:**
```typescript
export type EntityType = 
  | 'category' 
  | 'categoryGroup' 
  | 'payee' 
  | 'rule' 
  | 'schedule'
  | 'transaction'  // NEW
  | 'account';     // NEW
```

**Transaction Data Schema:**
```typescript
export interface TransactionData {
  account?: string;      // Name or ID
  date?: string;          // YYYY-MM-DD
  amount?: number;        // Dollars or cents (auto-detected)
  payee?: string;         // Name or ID
  category?: string;      // Name or ID
  notes?: string;
  cleared?: boolean;
  subtransactions?: Array<{
    amount: number;
    category?: string;
    notes?: string;
  }>;
}
```

**Account Data Schema:**
```typescript
export interface AccountData {
  name?: string;
  type?: 'checking' | 'savings' | 'credit' | 'investment' | 'mortgage' | 'debt' | 'other';
  offbudget?: boolean;
  initialBalance?: number;  // For create operation
}

export interface CloseAccountData {
  transferAccountId?: string;
  transferCategoryId?: string;
}
```

#### 5. Handler Registry Updates

```typescript
const entityHandlers: Record<EntityType, EntityHandler<any, any>> = {
  category: new CategoryHandler(),
  categoryGroup: new CategoryGroupHandler(),
  payee: new PayeeHandler(),
  rule: new RuleHandler(),
  schedule: new ScheduleHandler(),
  transaction: new TransactionHandler(),  // NEW
  account: new AccountHandler(),          // NEW
};
```

#### 6. Operation Routing

Update the main handler to route extended operations:

```typescript
export async function handler(args: ManageEntityArgs): Promise<MCPResponse> {
  const handler = entityHandlers[args.entityType];
  
  // Route standard operations
  if (args.operation === 'create') {
    const id = await handler.create(args.data);
    handler.invalidateCache();
    return success(`Created ${args.entityType} with ID: ${id}`);
  }
  
  if (args.operation === 'update') {
    await handler.update(args.id!, args.data);
    handler.invalidateCache();
    return success(`Updated ${args.entityType} ${args.id}`);
  }
  
  if (args.operation === 'delete') {
    await handler.delete(args.id!);
    handler.invalidateCache();
    return success(`Deleted ${args.entityType} ${args.id}`);
  }
  
  // Route extended operations (account-specific)
  if (args.operation === 'close' && 'close' in handler) {
    await handler.close!(args.id!, args.data);
    handler.invalidateCache();
    return success(`Closed account ${args.id}`);
  }
  
  if (args.operation === 'reopen' && 'reopen' in handler) {
    await handler.reopen!(args.id!);
    handler.invalidateCache();
    return success(`Reopened account ${args.id}`);
  }
  
  if (args.operation === 'balance' && 'balance' in handler) {
    const balance = await handler.balance!(args.id!, args.data?.date);
    return success(`Account ${args.id} balance: ${formatAmount(balance)}`);
  }
  
  throw new Error(`Unsupported operation: ${args.operation}`);
}
```

## Migration Strategy

### Phase 1: Add Handlers (Non-Breaking)
1. Create `TransactionHandler` and `AccountHandler`
2. Add to entity registry
3. Update types and schemas
4. Keep existing `manage-transaction` and `manage-account` tools active
5. **Validate with Cursor MCP**: Test all operations work correctly

### Phase 2: Update Documentation
1. Update `manage-entity` description to include transactions and accounts
2. Add examples for transaction and account operations
3. Document extended operations (`close`, `reopen`, `balance`)
4. **Validate with Cursor MCP**: Verify tool descriptions are clear and helpful

### Phase 3: Deprecation Period
1. Mark `manage-transaction` and `manage-account` as deprecated
2. Add deprecation warnings in tool descriptions
3. Maintain backward compatibility
4. **Validate with Cursor MCP**: Ensure deprecated tools still work, new tool is discoverable

### Phase 4: Removal (Future)
1. Remove `manage-transaction` and `manage-account` tools
2. Update all documentation
3. Update tests
4. **Final Cursor MCP validation**: Verify all functionality works through consolidated tool

## Benefits

### Consistency
- **Single tool** for all entity management
- **Unified interface** reduces cognitive load
- **Consistent error handling** across all entities

### Discoverability
- **One place** to look for entity operations
- **Clearer mental model** - everything is an "entity"
- **Better tool organization**

### Maintainability
- **Single codebase** for entity management
- **Shared patterns** reduce duplication
- **Easier to extend** with new entity types

### Context Window Optimization
- **Fewer tools** = less context consumption
- **Consolidated descriptions** = more efficient

## Challenges

### Complexity Management
- **Challenge**: `manage-entity` becomes more complex
- **Mitigation**: Use handler pattern to isolate complexity
- **Mitigation**: Clear documentation and examples

### Schema Differences
- **Challenge**: Transactions use flattened schema, accounts use nested
- **Mitigation**: Handler normalizes input before processing
- **Mitigation**: Support both formats for backward compatibility

### Extended Operations
- **Challenge**: Account operations (`close`, `reopen`, `balance`) don't fit standard CRUD
- **Mitigation**: Optional methods in handler interface
- **Mitigation**: Clear validation and error messages

### Name Resolution
- **Challenge**: Transactions need name resolution, others don't
- **Mitigation**: Optional `resolveNames` method
- **Mitigation**: Handler handles resolution internally

### Backward Compatibility
- **Challenge**: Existing code uses `manage-transaction` and `manage-account`
- **Mitigation**: Keep tools during deprecation period
- **Mitigation**: Provide migration guide

## Implementation Plan

### Step 1: Create Transaction Handler
- [ ] Create `src/tools/manage-entity/entity-handlers/transaction-handler.ts`
- [ ] Implement name resolution logic
- [ ] Implement amount conversion logic
- [ ] Add tests

### Step 2: Create Account Handler
- [ ] Create `src/tools/manage-entity/entity-handlers/account-handler.ts`
- [ ] Implement extended operations (`close`, `reopen`, `balance`)
- [ ] Handle initial balance and transfers
- [ ] Add tests

### Step 3: Update Types
- [ ] Add `transaction` and `account` to `EntityType`
- [ ] Create `TransactionData` and `AccountData` interfaces
- [ ] Extend `Operation` type to include extended operations
- [ ] Update Zod schemas

### Step 4: Update Handler Registry
- [ ] Register `TransactionHandler` and `AccountHandler`
- [ ] Update handler routing logic
- [ ] Add operation validation

### Step 5: Update Tool Schema
- [ ] Update `manage-entity` description
- [ ] Add transaction and account examples
- [ ] Document extended operations
- [ ] Update input schema

### Step 6: Testing
- [ ] Unit tests for handlers
- [ ] Integration tests for operations
- [ ] Backward compatibility tests
- [ ] Performance tests

### Step 7: MCP Tool Validation with Cursor
- [ ] Build the project (`npm run build`)
- [ ] Restart Cursor MCP server connection
- [ ] Validate `manage-entity` tool appears in Cursor with all entity types
- [ ] Test transaction operations via `manage-entity`:
  - [ ] Create transaction with name resolution
  - [ ] Update transaction
  - [ ] Delete transaction
- [ ] Test account operations via `manage-entity`:
  - [ ] Create account
  - [ ] Update account
  - [ ] Close account
  - [ ] Reopen account
  - [ ] Query account balance
- [ ] Verify existing entity types still work (category, payee, rule, schedule)
- [ ] Compare behavior with deprecated `manage-transaction` and `manage-account` tools
- [ ] Document any issues or differences found

### Step 8: Documentation
- [ ] Update README
- [ ] Update tool usage guide
- [ ] Create migration guide
- [ ] Add deprecation notices

## Validation Checklist

### Cursor MCP Integration Testing

After implementation, validate the following through Cursor's MCP interface:

#### Tool Discovery
- [ ] `manage-entity` tool appears in Cursor's tool list
- [ ] Tool description clearly explains all entity types
- [ ] Input schema shows `entityType` enum with all 7 types (including `transaction` and `account`)
- [ ] Operation enum shows all operations (including `close`, `reopen`, `balance`)

#### Transaction Operations
- [ ] **Create**: Create transaction using `entityType: "transaction"` with name resolution
- [ ] **Create**: Verify amount conversion (dollars → cents) works
- [ ] **Update**: Update transaction using `entityType: "transaction"`
- [ ] **Delete**: Delete transaction using `entityType: "transaction"`
- [ ] Verify responses match deprecated `manage-transaction` behavior

#### Account Operations
- [ ] **Create**: Create account using `entityType: "account"`
- [ ] **Update**: Update account properties
- [ ] **Close**: Close account with transfer support
- [ ] **Reopen**: Reopen closed account
- [ ] **Balance**: Query account balance with optional date
- [ ] Verify responses match deprecated `manage-account` behavior

#### Existing Entity Types
- [ ] Verify `category`, `categoryGroup`, `payee`, `rule`, `schedule` still work
- [ ] No regressions in existing functionality

#### Error Handling
- [ ] Invalid entity types show helpful errors
- [ ] Invalid operations show helpful errors (e.g., `balance` on non-account)
- [ ] Missing required fields show validation errors
- [ ] Name resolution failures show helpful messages

#### Performance
- [ ] Tool execution time is acceptable
- [ ] No noticeable performance degradation vs. separate tools
- [ ] Cache invalidation works correctly

## Example Usage

### Create Transaction
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "transaction",
    "operation": "create",
    "data": {
      "account": "Checking",
      "date": "2024-01-15",
      "amount": -50.00,
      "payee": "Grocery Store",
      "category": "Groceries"
    }
  }
}
```

### Update Account
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "update",
    "id": "abc123",
    "data": {
      "name": "Updated Name",
      "offbudget": true
    }
  }
}
```

### Close Account
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "close",
    "id": "abc123",
    "data": {
      "transferAccountId": "def456"
    }
  }
}
```

### Query Account Balance
```json
{
  "tool": "manage-entity",
  "args": {
    "entityType": "account",
    "operation": "balance",
    "id": "abc123",
    "data": {
      "date": "2024-01-15"
    }
  }
}
```

## Decision Points

### 1. Operation Type Extension
**Question**: Should we extend `Operation` type or use a separate field?
**Recommendation**: Extend `Operation` type, validate per entity type

### 2. Schema Format
**Question**: Support both flattened (transaction) and nested (account) schemas?
**Recommendation**: Yes, handlers normalize input internally

### 3. Name Resolution
**Question**: Should name resolution be handler-specific or shared?
**Recommendation**: Handler-specific, but reuse shared utilities

### 4. Backward Compatibility
**Question**: How long to maintain deprecated tools?
**Recommendation**: At least one major version (6-12 months)

### 5. Extended Operations
**Question**: Should extended operations be in handler interface or separate?
**Recommendation**: Optional methods in interface for type safety

## Conclusion

Consolidating transactions and accounts into `manage-entity` provides:
- **Better consistency** across the API
- **Improved discoverability** for users
- **Reduced context window** consumption
- **Easier maintenance** with shared patterns

The main challenges are:
- Managing complexity
- Handling schema differences
- Supporting extended operations
- Maintaining backward compatibility

These can be addressed through:
- Handler pattern isolation
- Input normalization
- Optional interface methods
- Deprecation period

**Recommendation**: Proceed with consolidation, following phased migration strategy.

