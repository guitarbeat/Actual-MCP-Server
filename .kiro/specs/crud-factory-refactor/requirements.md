# Requirements Document

## Introduction

This feature aims to eliminate code duplication across CRUD (Create, Read, Update, Delete) tools in the Actual Budget MCP server by introducing a generic factory pattern. Currently, there are ~30 nearly identical tool files that follow the same structure for creating, updating, and deleting entities (categories, payees, accounts, rules, etc.). This refactoring will consolidate the common patterns into reusable factory functions while maintaining all existing functionality and tool schemas.

## Glossary

- **MCP Server**: The Actual Budget Model Context Protocol server that exposes budget operations to LLMs
- **CRUD Tools**: Tools that perform Create, Read, Update, Delete operations on budget entities
- **Entity Handler**: A class that implements CRUD operations for a specific entity type (e.g., CategoryHandler, PayeeHandler)
- **Tool Schema**: The JSON schema definition that describes a tool's name, description, and input parameters
- **Tool Registry**: The centralized array in `tools/index.ts` that registers all available tools
- **Zod Schema**: TypeScript-first schema validation library used for input validation

## Requirements

### Requirement 1: Create Generic CRUD Factory

**User Story:** As a developer, I want a generic factory function that generates CRUD tools, so that I can eliminate duplicate code across entity types.

#### Acceptance Criteria

1. WHEN the factory function is called with entity configuration, THE System SHALL generate create, update, and delete tool definitions
2. WHEN a generated tool is invoked, THE System SHALL validate inputs using the provided Zod schema
3. WHEN a generated tool executes successfully, THE System SHALL return a success response with the entity ID
4. WHEN a generated tool encounters an error, THE System SHALL return an error response with appropriate context
5. WHEN a generated tool completes, THE System SHALL invalidate the entity handler cache

### Requirement 2: Maintain Existing Tool Schemas

**User Story:** As an LLM using the MCP server, I want all existing tool names and schemas to remain unchanged, so that my existing prompts and workflows continue to work.

#### Acceptance Criteria

1. WHEN the refactoring is complete, THE System SHALL expose the same tool names as before (e.g., "create-category", "update-payee")
2. WHEN an LLM calls a tool, THE System SHALL accept the same input parameters as before
3. WHEN a tool executes, THE System SHALL return responses in the same format as before
4. WHEN tools are listed, THE System SHALL include the same descriptions as before
5. WHEN validation fails, THE System SHALL return the same error messages as before

### Requirement 3: Preserve Entity-Specific Behavior

**User Story:** As a developer, I want entity-specific validation and behavior to be preserved, so that business logic remains correct after refactoring.

#### Acceptance Criteria

1. WHEN creating an account, THE System SHALL validate the account type enum (checking, savings, credit, etc.)
2. WHEN creating a category, THE System SHALL require a valid groupId UUID
3. WHEN creating a payee, THE System SHALL allow optional transferAccount field
4. WHEN creating a rule, THE System SHALL validate complex condition and action schemas
5. WHEN any entity is created, THE System SHALL use the appropriate entity handler class

### Requirement 4: Reduce Code Duplication

**User Story:** As a developer, I want to eliminate duplicate CRUD tool files, so that the codebase is easier to maintain and extend.

#### Acceptance Criteria

1. WHEN the refactoring is complete, THE System SHALL have fewer than 10 CRUD tool files (down from ~30)
2. WHEN adding a new entity type, THE System SHALL require only schema definitions and handler class
3. WHEN updating CRUD logic, THE System SHALL require changes in only one location (the factory)
4. WHEN reviewing the codebase, THE System SHALL have no duplicate handler invocation patterns
5. WHEN measuring lines of code, THE System SHALL have at least 50% reduction in CRUD tool code

### Requirement 5: Maintain Type Safety

**User Story:** As a developer, I want full TypeScript type safety, so that I catch errors at compile time rather than runtime.

#### Acceptance Criteria

1. WHEN the factory generates tools, THE System SHALL preserve TypeScript type inference from Zod schemas
2. WHEN a tool handler is called, THE System SHALL have typed arguments based on the schema
3. WHEN entity data is passed to handlers, THE System SHALL enforce correct types for each entity
4. WHEN the code is compiled, THE System SHALL produce no TypeScript errors
5. WHEN using IDE autocomplete, THE System SHALL provide accurate type hints for all factory parameters

### Requirement 6: Support Tool Registry Integration

**User Story:** As a developer, I want generated tools to integrate seamlessly with the existing tool registry, so that no changes are needed to the server setup code.

#### Acceptance Criteria

1. WHEN tools are generated, THE System SHALL produce objects compatible with CategorizedToolDefinition interface
2. WHEN the tool registry is built, THE System SHALL include all generated tools with correct metadata
3. WHEN write permissions are checked, THE System SHALL correctly identify which tools require write access
4. WHEN nini features are disabled, THE System SHALL correctly filter nini-category tools
5. WHEN tools are registered, THE System SHALL maintain the same registration order as before

### Requirement 7: Preserve Error Handling

**User Story:** As an LLM using the MCP server, I want consistent error messages, so that I can understand and recover from failures.

#### Acceptance Criteria

1. WHEN validation fails, THE System SHALL return errorFromCatch with appropriate context
2. WHEN an entity is not found, THE System SHALL include the entity type and ID in the error
3. WHEN a handler throws an error, THE System SHALL wrap it with fallback message
4. WHEN cache invalidation fails, THE System SHALL log the error but not fail the operation
5. WHEN multiple errors occur, THE System SHALL return the most relevant error to the user

### Requirement 8: Enable Easy Extension

**User Story:** As a developer, I want to easily add new CRUD tools for new entity types, so that extending the server is straightforward.

#### Acceptance Criteria

1. WHEN adding a new entity type, THE System SHALL require only a schema definition and handler class
2. WHEN entity-specific descriptions are needed, THE System SHALL accept custom description templates
3. WHEN special validation is needed, THE System SHALL allow schema customization per entity
4. WHEN a new tool is added, THE System SHALL automatically appear in the tool registry
5. WHEN documentation is generated, THE System SHALL include all factory-generated tools
