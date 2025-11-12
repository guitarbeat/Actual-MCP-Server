# Implementation Plan

- [x] 1. Create CRUD factory infrastructure
  - Create `mcp-server/src/tools/crud-factory.ts` with core factory function that generates tool definitions from entity configurations
  - Implement `CRUDOperationConfig` and `EntityCRUDConfig` TypeScript interfaces
  - Implement `createCRUDTools()` function that returns array of `CategorizedToolDefinition`
  - Add proper TypeScript generics for type safety with entity handlers
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3_

- [x] 2. Create entity configuration registry
  - Create `mcp-server/src/tools/crud-factory-config.ts` with centralized entity configurations
  - Define configuration for category entity (schemas, descriptions, handler class, metadata)
  - Define configuration for payee entity
  - Define configuration for account entity
  - Define configuration for rule entity
  - Define configuration for category group entity
  - Export `entityConfigurations` object with all entity configs
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Integrate factory with tool registry for categories
  - Import `createCRUDTools` and `entityConfigurations` in `mcp-server/src/tools/index.ts`
  - Generate category CRUD tools using factory: `createCRUDTools(entityConfigurations.category)`
  - Add generated category tools to `toolRegistry` array alongside existing tools
  - Keep original category tool imports temporarily for comparison
  - Verify tool registry builds without TypeScript errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.4_

- [x] 4. Test category tools integration
  - Run existing integration tests to verify category tools work correctly
  - Compare generated tool schemas with original tool schemas
  - Test create-category, update-category, delete-category operations
  - Verify error handling matches original behavior
  - Verify cache invalidation is called correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Migrate remaining entity types
  - Generate tools for payee entity and add to tool registry
  - Generate tools for account entity and add to tool registry
  - Generate tools for rule entity and add to tool registry
  - Generate tools for category group entity and add to tool registry
  - Remove original CRUD tool imports from tool registry
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Remove original CRUD tool files
  - Delete `mcp-server/src/tools/categories/create-category/index.ts`
  - Delete `mcp-server/src/tools/categories/update-category/index.ts`
  - Delete `mcp-server/src/tools/categories/delete-category/index.ts`
  - Delete `mcp-server/src/tools/payees/create-payee/index.ts`
  - Delete `mcp-server/src/tools/payees/update-payee/index.ts`
  - Delete `mcp-server/src/tools/payees/delete-payee/index.ts`
  - Delete `mcp-server/src/tools/accounts/create-account/index.ts`
  - Delete `mcp-server/src/tools/accounts/update-account/index.ts`
  - Delete `mcp-server/src/tools/accounts/delete-account/index.ts`
  - Delete `mcp-server/src/tools/rules/create-rule/index.ts`
  - Delete `mcp-server/src/tools/rules/update-rule/index.ts`
  - Delete `mcp-server/src/tools/rules/delete-rule/index.ts`
  - Delete `mcp-server/src/tools/category-groups/create-category-group/index.ts`
  - Delete `mcp-server/src/tools/category-groups/update-category-group/index.ts`
  - Delete `mcp-server/src/tools/category-groups/delete-category-group/index.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Verify full integration
  - Run complete test suite to verify all tools work correctly
  - Test MCP server startup with factory-generated tools
  - Verify tool listing returns all expected tools
  - Test write permission filtering works correctly
  - Test nini category filtering works correctly
  - Verify no TypeScript compilation errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Update documentation
  - Update `mcp-server/README.md` to document factory pattern
  - Add JSDoc comments to factory functions
  - Add code examples for adding new entity types
  - Document entity configuration structure
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
