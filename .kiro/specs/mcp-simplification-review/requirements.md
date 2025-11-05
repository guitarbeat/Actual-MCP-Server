# Requirements Document

## Introduction

This document outlines requirements for reviewing and potentially simplifying the Actual Budget MCP server to optimize for conversational AI usage while reducing context window consumption. The goal is to identify which tools are essential for typical budget management conversations and which could be consolidated, removed, or made optional.

## Glossary

- **MCP Server**: The Model Context Protocol server that exposes Actual Budget functionality to LLMs
- **Tool**: An MCP tool that performs a specific operation (read or write) on budget data
- **Context Window**: The amount of token space consumed by tool definitions when an LLM loads the MCP server
- **Conversational Agent**: An AI assistant that helps users manage their budget through natural language
- **CRUD Operations**: Create, Read, Update, Delete operations on entities
- **Entity**: A budget data object (category, payee, rule, schedule, account, transaction)

## Requirements

### Requirement 1: Tool Usage Analysis

**User Story:** As a developer, I want to understand which tools are most valuable for conversational budget management, so that I can prioritize essential functionality.

#### Acceptance Criteria

1. WHEN analyzing tool usage patterns, THE MCP Server SHALL categorize tools into usage frequency tiers (high, medium, low, rare)
2. WHEN evaluating tool necessity, THE MCP Server SHALL identify tools that are essential for core budget workflows
3. WHEN reviewing tool overlap, THE MCP Server SHALL identify tools with redundant or overlapping functionality
4. WHERE tools serve administrative purposes, THE MCP Server SHALL distinguish between conversational tools and setup/maintenance tools
5. WHEN assessing reporting tools, THE MCP Server SHALL evaluate whether custom reporting tools add value beyond basic data retrieval

### Requirement 2: Context Window Optimization

**User Story:** As an MCP user, I want the server to consume minimal context window space, so that the AI has more room for conversation and reasoning.

#### Acceptance Criteria

1. WHEN the MCP Server registers tools, THE MCP Server SHALL minimize the number of exposed tools to reduce context consumption
2. WHERE tools can be consolidated, THE MCP Server SHALL use consolidated patterns similar to manage-entity
3. WHEN tools are rarely used, THE MCP Server SHALL provide configuration options to disable them
4. WHILE maintaining functionality, THE MCP Server SHALL reduce tool schema complexity where possible
5. WHEN describing tools, THE MCP Server SHALL use concise descriptions that convey essential information

### Requirement 3: Essential Tool Identification

**User Story:** As a budget user, I want access to tools that support common budget conversations, so that I can accomplish typical tasks efficiently.

#### Acceptance Criteria

1. THE MCP Server SHALL provide tools for viewing transactions with filtering capabilities
2. THE MCP Server SHALL provide tools for creating and updating transactions
3. THE MCP Server SHALL provide tools for viewing account balances and information
4. THE MCP Server SHALL provide tools for viewing and managing categories
5. THE MCP Server SHALL provide tools for viewing budget allocations and spending
6. WHERE users need to modify budget data, THE MCP Server SHALL provide consolidated entity management tools
7. WHEN users need financial insights, THE MCP Server SHALL provide essential reporting capabilities

### Requirement 4: Tool Consolidation Opportunities

**User Story:** As a developer, I want to identify additional consolidation opportunities, so that I can reduce tool count without losing functionality.

#### Acceptance Criteria

1. WHEN multiple tools perform similar operations on different entity types, THE MCP Server SHALL evaluate consolidation feasibility
2. WHERE reporting tools share common patterns, THE MCP Server SHALL assess whether they can be unified
3. WHEN tools have overlapping functionality, THE MCP Server SHALL determine if one tool can subsume another
4. WHILE consolidating tools, THE MCP Server SHALL maintain type safety and clear parameter structures
5. IF consolidation reduces clarity, THE MCP Server SHALL keep tools separate

### Requirement 5: Single Budget Optimization

**User Story:** As a typical MCP user with one budget, I want the server optimized for single-budget workflows, so that I don't see tools for multi-budget management.

#### Acceptance Criteria

1. WHERE users have a single budget, THE MCP Server SHALL remove or disable budget file switching tools
2. WHEN the server starts, THE MCP Server SHALL automatically load the configured budget without requiring tool calls
3. WHERE budget sync is needed, THE MCP Server SHALL handle it automatically rather than exposing sync tools
4. WHILE optimizing for single-budget use, THE MCP Server SHALL document how to re-enable multi-budget tools if needed
5. WHEN administrative operations are needed, THE MCP Server SHALL remove tools for rare account operations like close, reopen, and delete

### Requirement 6: Comparison with Actual Budget API

**User Story:** As a developer, I want to understand how the MCP implementation compares to the Actual Budget API, so that I can identify gaps or over-implementations.

#### Acceptance Criteria

1. WHEN comparing with the API, THE MCP Server SHALL document which API methods are exposed as tools
2. WHERE the MCP adds custom functionality, THE MCP Server SHALL justify the additional complexity
3. WHEN API methods are not exposed, THE MCP Server SHALL document the rationale for exclusion
4. WHILE maintaining API coverage, THE MCP Server SHALL prioritize conversational use cases over API completeness
5. IF API methods are rarely useful in conversation, THE MCP Server SHALL make them optional or exclude them

### Requirement 7: Backward Compatibility

**User Story:** As an existing MCP user, I want any simplifications to maintain backward compatibility, so that my existing workflows continue to function.

#### Acceptance Criteria

1. WHEN tools are consolidated, THE MCP Server SHALL maintain old tool names as deprecated aliases
2. WHERE tools are made optional, THE MCP Server SHALL enable them by default initially
3. WHILE simplifying the codebase, THE MCP Server SHALL provide migration paths for existing users
4. WHEN removing functionality, THE MCP Server SHALL provide advance notice through deprecation warnings
5. IF breaking changes are necessary, THE MCP Server SHALL document them clearly in release notes
