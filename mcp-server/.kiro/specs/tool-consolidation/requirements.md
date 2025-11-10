# Requirements Document

## Introduction

The Actual Budget MCP Server currently exposes 49 tools to LLM clients. Analysis reveals significant CRUD pattern repetition across entity types (accounts, categories, payees, rules, schedules). This spec explores consolidating tools to reduce cognitive load on LLMs while maintaining type safety, clear error messages, and the project's architectural principles.

## Glossary

- **MCP Server**: The Actual Budget Model Context Protocol server that exposes financial data tools to LLMs
- **Tool**: An MCP-exposed function that LLMs can invoke (e.g., `create-category`, `update-payee`)
- **Entity**: A domain object in Actual Budget (Account, Category, Payee, Rule, Schedule, Transaction)
- **CRUD Operations**: Create, Read, Update, Delete operations on entities
- **Tool Registry**: The centralized registry in `src/tools/index.ts` that manages all available tools
- **LLM**: Large Language Model (e.g., Claude) that consumes the MCP server
- **Generic Tool**: A consolidated tool that handles multiple entity types through a type parameter
- **Specific Tool**: Current implementation where each entity type has dedicated tools

## Requirements

### Requirement 1: Analyze Current Tool Proliferation

**User Story:** As a developer, I want to understand the current tool landscape, so that I can identify consolidation opportunities.

#### Acceptance Criteria

1. WHEN analyzing the tool registry, THE MCP Server SHALL identify all CRUD pattern groups across entity types
2. WHEN counting tools, THE MCP Server SHALL report the total count and breakdown by operation type (create/read/update/delete)
3. WHEN examining entity types, THE MCP Server SHALL list all entities with full CRUD operations (Account, Category, CategoryGroup, Payee, Rule, Schedule)
4. WHERE partial CRUD exists, THE MCP Server SHALL identify entities with incomplete CRUD patterns (Transaction has create/update but no delete)
5. WHEN evaluating consolidation candidates, THE MCP Server SHALL calculate the potential tool reduction from consolidation

### Requirement 2: Design Generic Tool Architecture

**User Story:** As a developer, I want a generic tool design that maintains type safety, so that consolidation doesn't compromise code quality.

#### Acceptance Criteria

1. THE Generic Tool Architecture SHALL support entity-type parameters while maintaining full TypeScript type safety
2. THE Generic Tool Architecture SHALL preserve Zod schema validation for all entity-specific fields
3. THE Generic Tool Architecture SHALL maintain the existing modular structure (input-parser, data-fetcher, report-generator)
4. THE Generic Tool Architecture SHALL provide entity-specific error messages that are as clear as current specific tools
5. WHERE entity operations differ significantly, THE Generic Tool Architecture SHALL allow entity-specific handler overrides

### Requirement 3: Evaluate LLM Usability Impact

**User Story:** As an LLM user, I want tool consolidation to improve (not degrade) my ability to accomplish tasks, so that the system remains intuitive.

#### Acceptance Criteria

1. WHEN comparing tool counts, THE Consolidated Design SHALL reduce the total tool count by at least 30%
2. WHEN an LLM selects a tool, THE Consolidated Design SHALL provide clear entity-type options in the schema
3. THE Consolidated Design SHALL maintain backward compatibility with existing tool names through aliases or migration period
4. WHEN errors occur, THE Consolidated Design SHALL provide entity-specific error messages equivalent to current specific tools
5. THE Consolidated Design SHALL include comprehensive examples in tool descriptions for each supported entity type

### Requirement 4: Maintain Architectural Principles

**User Story:** As a maintainer, I want consolidation to align with existing architectural principles, so that code quality remains high.

#### Acceptance Criteria

1. THE Consolidated Implementation SHALL follow the Single Responsibility Principle as defined in ARCHITECTURE.md
2. THE Consolidated Implementation SHALL maintain the DRY principle by eliminating duplicate CRUD logic
3. THE Consolidated Implementation SHALL preserve the existing test coverage requirements (90%+ for core modules)
4. THE Consolidated Implementation SHALL maintain the modular tool structure pattern
5. THE Consolidated Implementation SHALL not increase file sizes beyond the 500-line limit specified in AGENTS.md

### Requirement 5: Implement Phased Migration Strategy

**User Story:** As a user, I want tool consolidation to happen gradually, so that my existing workflows aren't disrupted.

#### Acceptance Criteria

1. THE Migration Strategy SHALL support both old and new tool names during a deprecation period
2. WHEN old tools are called, THE MCP Server SHALL log deprecation warnings but continue to function
3. THE Migration Strategy SHALL provide clear migration documentation mapping old tools to new consolidated tools
4. THE Migration Strategy SHALL include a feature flag to enable/disable consolidated tools during testing
5. WHEN the deprecation period ends, THE MCP Server SHALL remove old tool implementations while maintaining the registry pattern

### Requirement 6: Preserve Performance Characteristics

**User Story:** As a user, I want consolidated tools to maintain current performance levels, so that response times don't degrade.

#### Acceptance Criteria

1. THE Consolidated Tools SHALL maintain cache invalidation patterns equivalent to current specific tools
2. THE Consolidated Tools SHALL not introduce additional latency beyond 5ms per operation
3. THE Consolidated Tools SHALL support the same parallel execution patterns as current tools
4. WHEN benchmarked, THE Consolidated Tools SHALL meet or exceed current performance targets defined in PERFORMANCE.md
5. THE Consolidated Tools SHALL maintain the same memory footprint as current specific tools

### Requirement 7: Alternative Approach - Bulk Operations

**User Story:** As an LLM user, I want to perform multiple operations in a single call, so that complex workflows are more efficient.

#### Acceptance Criteria

1. WHERE bulk operations are implemented, THE MCP Server SHALL support batching multiple CRUD operations in a single tool call
2. THE Bulk Operation Tool SHALL validate all operations before executing any, ensuring atomic-like behavior
3. THE Bulk Operation Tool SHALL provide detailed results for each operation in the batch
4. THE Bulk Operation Tool SHALL maintain transaction safety where supported by the Actual Budget API
5. WHERE partial failures occur, THE Bulk Operation Tool SHALL report which operations succeeded and which failed with specific error messages
