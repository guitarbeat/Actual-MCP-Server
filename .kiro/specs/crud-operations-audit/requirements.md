# Requirements Document

## Introduction

This document specifies the requirements for auditing and ensuring complete CRUD (Create, Read, Update, Delete) operation coverage across all entities in the Actual Budget MCP server. The goal is to identify gaps in CRUD operations and ensure consistent, complete API coverage for all supported entities.

## Glossary

- **CRUD**: Create, Read, Update, Delete - the four basic operations for persistent storage
- **MCP Server**: The Model Context Protocol server that wraps the Actual Budget API
- **Entity**: A data object in Actual Budget (e.g., Transaction, Account, Category, Payee, Rule, Schedule)
- **Tool**: An MCP tool that exposes API functionality to clients
- **API Wrapper**: A function in `actual-api.ts` that wraps the underlying Actual Budget API
- **manage-entity Tool**: A consolidated tool that handles CRUD operations for multiple entity types
- **Actual Budget API**: The underlying JavaScript API provided by @actual-app/api

## Requirements

### Requirement 1: Audit Current CRUD Coverage

**User Story:** As a developer, I want to understand the current state of CRUD operations across all entities, so that I can identify gaps and inconsistencies.

#### Acceptance Criteria

1. THE System SHALL identify all entity types supported by the Actual Budget API
2. THE System SHALL document which CRUD operations exist for each entity type
3. THE System SHALL identify which operations are exposed via MCP tools
4. THE System SHALL identify which operations have API wrappers in actual-api.ts
5. THE System SHALL create a comprehensive coverage matrix showing gaps

### Requirement 2: Identify Missing CRUD Operations

**User Story:** As a developer, I want to know which CRUD operations are missing, so that I can prioritize implementation work.

#### Acceptance Criteria

1. THE System SHALL identify entities with incomplete CRUD coverage
2. THE System SHALL identify API wrappers that exist but are not exposed via tools
3. THE System SHALL identify operations supported by Actual Budget API but not wrapped
4. THE System SHALL prioritize missing operations based on user value
5. THE System SHALL document why certain operations may be intentionally excluded

### Requirement 3: Ensure Consistent Tool Patterns

**User Story:** As a developer, I want all CRUD operations to follow consistent patterns, so that the API is predictable and maintainable.

#### Acceptance Criteria

1. THE System SHALL verify that all create operations follow the same pattern
2. THE System SHALL verify that all read operations follow the same pattern
3. THE System SHALL verify that all update operations follow the same pattern
4. THE System SHALL verify that all delete operations follow the same pattern
5. THE System SHALL identify tools that deviate from established patterns

### Requirement 4: Document Entity-Specific Constraints

**User Story:** As a developer, I want to understand entity-specific constraints and behaviors, so that I can implement operations correctly.

#### Acceptance Criteria

1. THE System SHALL document required fields for each entity type
2. THE System SHALL document special behaviors (e.g., transfer payees, split transactions)
3. THE System SHALL document cascade delete behaviors
4. THE System SHALL document validation rules for each entity
5. THE System SHALL document relationships between entities

### Requirement 5: Verify manage-entity Tool Coverage

**User Story:** As a developer, I want to ensure the manage-entity tool properly handles all supported entity types, so that CRUD operations are consistently available.

#### Acceptance Criteria

1. THE System SHALL verify which entity types are supported by manage-entity
2. THE System SHALL verify that all CRUD operations work for each entity type
3. THE System SHALL identify entities that should be added to manage-entity
4. THE System SHALL verify cache invalidation for all entity operations
5. THE System SHALL verify error handling for all entity operations

### Requirement 6: Assess Account Operations Coverage

**User Story:** As a user, I want complete CRUD operations for accounts, so that I can fully manage my account structure.

#### Acceptance Criteria

1. THE System SHALL verify create account operation exists and is exposed
2. THE System SHALL verify read account operations exist and are exposed
3. THE System SHALL verify update account operation exists and is exposed
4. THE System SHALL verify delete account operation exists and is exposed
5. THE System SHALL verify special operations (close, reopen) exist and are exposed

### Requirement 7: Assess Transaction Operations Coverage

**User Story:** As a user, I want complete CRUD operations for transactions, so that I can fully manage my transaction data.

#### Acceptance Criteria

1. THE System SHALL verify create transaction operation exists and is exposed
2. THE System SHALL verify read transaction operations exist and are exposed
3. THE System SHALL verify update transaction operation exists and is exposed
4. THE System SHALL verify delete transaction operation exists and is exposed
5. THE System SHALL verify special operations (import, add) exist and are exposed

### Requirement 8: Assess Category Operations Coverage

**User Story:** As a user, I want complete CRUD operations for categories, so that I can fully manage my budget structure.

#### Acceptance Criteria

1. THE System SHALL verify create category operation exists and is exposed
2. THE System SHALL verify read category operations exist and are exposed
3. THE System SHALL verify update category operation exists and is exposed
4. THE System SHALL verify delete category operation exists and is exposed
5. THE System SHALL verify operations handle income categories correctly

### Requirement 9: Assess Category Group Operations Coverage

**User Story:** As a user, I want complete CRUD operations for category groups, so that I can organize my categories effectively.

#### Acceptance Criteria

1. THE System SHALL verify create category group operation exists and is exposed
2. THE System SHALL verify read category group operations exist and are exposed
3. THE System SHALL verify update category group operation exists and is exposed
4. THE System SHALL verify delete category group operation exists and is exposed
5. THE System SHALL verify operations handle income groups correctly

### Requirement 10: Assess Payee Operations Coverage

**User Story:** As a user, I want complete CRUD operations for payees, so that I can manage my payee list effectively.

#### Acceptance Criteria

1. THE System SHALL verify create payee operation exists and is exposed
2. THE System SHALL verify read payee operations exist and are exposed
3. THE System SHALL verify update payee operation exists and is exposed
4. THE System SHALL verify delete payee operation exists and is exposed
5. THE System SHALL verify special operations (merge) exist and are exposed

### Requirement 11: Assess Rule Operations Coverage

**User Story:** As a user, I want complete CRUD operations for rules, so that I can automate transaction categorization.

#### Acceptance Criteria

1. THE System SHALL verify create rule operation exists and is exposed
2. THE System SHALL verify read rule operations exist and are exposed
3. THE System SHALL verify update rule operation exists and is exposed
4. THE System SHALL verify delete rule operation exists and is exposed
5. THE System SHALL verify payee rule operations exist and are exposed

### Requirement 12: Assess Schedule Operations Coverage

**User Story:** As a user, I want complete CRUD operations for schedules, so that I can manage recurring transactions.

#### Acceptance Criteria

1. THE System SHALL verify create schedule operation exists and is exposed
2. THE System SHALL verify read schedule operations exist and are exposed
3. THE System SHALL verify update schedule operation exists and is exposed
4. THE System SHALL verify delete schedule operation exists and is exposed
5. THE System SHALL verify schedule-specific fields are properly handled

### Requirement 13: Assess Budget Operations Coverage

**User Story:** As a user, I want complete operations for budget management, so that I can plan and track my spending.

#### Acceptance Criteria

1. THE System SHALL verify read budget month operations exist and are exposed
2. THE System SHALL verify set budget amount operation exists and is exposed
3. THE System SHALL verify set budget carryover operation exists and is exposed
4. THE System SHALL verify hold budget operations exist and are exposed
5. THE System SHALL verify reset budget hold operation exists and is exposed

### Requirement 14: Create Implementation Recommendations

**User Story:** As a developer, I want clear recommendations for filling CRUD gaps, so that I can prioritize and implement missing operations efficiently.

#### Acceptance Criteria

1. THE System SHALL prioritize missing operations by user impact
2. THE System SHALL provide implementation guidance for each missing operation
3. THE System SHALL identify operations that can be added to manage-entity
4. THE System SHALL identify operations that need dedicated tools
5. THE System SHALL estimate implementation effort for each missing operation

### Requirement 15: Document Testing Requirements

**User Story:** As a developer, I want to ensure all CRUD operations are properly tested, so that the API is reliable.

#### Acceptance Criteria

1. THE System SHALL identify CRUD operations without unit tests
2. THE System SHALL identify CRUD operations without integration tests
3. THE System SHALL recommend test scenarios for each operation
4. THE System SHALL verify error handling is tested for all operations
5. THE System SHALL verify cache invalidation is tested for all operations
