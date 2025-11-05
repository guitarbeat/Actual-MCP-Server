# Requirements Document

## Introduction

This specification addresses the poor discoverability of MCP tools in the Actual Budget MCP Server. While the tools have excellent structure and consolidation, AI agents struggle to use them effectively due to minimal descriptions, missing examples, and unclear parameter requirements. This impacts remote MCP usage where agents need clear guidance to select and use the right tools.

## Glossary

- **MCP (Model Context Protocol)**: Protocol for exposing tools to AI agents
- **Tool Schema**: JSON schema defining a tool's name, description, and input parameters
- **Tool Discoverability**: How easily an AI agent can understand when and how to use a tool
- **Remote MCP Client**: Applications like Claude Desktop, Cline, or other AI assistants that consume MCP tools
- **Name Resolution**: The ability to accept entity names or IDs interchangeably
- **Input Schema**: JSON schema defining the structure and validation rules for tool parameters

## Requirements

### Requirement 1: Tool Description Quality

**User Story:** As an AI agent using MCP tools, I want comprehensive tool descriptions with examples, so that I can understand how to use each tool correctly without trial and error.

#### Acceptance Criteria

1. WHEN an AI agent reads a tool description, THE MCP Server SHALL provide a multi-section description including operations, parameters, examples, and common use cases
2. WHEN a tool supports multiple operations, THE MCP Server SHALL document each operation separately with its own requirements and examples
3. WHEN a tool accepts specific data formats, THE MCP Server SHALL include format specifications and examples in the description
4. WHERE a tool has complex parameters, THE MCP Server SHALL provide data structure examples for each parameter type
5. WHILE describing tool operations, THE MCP Server SHALL include at least one complete example per operation

### Requirement 2: Critical Tool Descriptions

**User Story:** As an AI agent, I want detailed descriptions for the most complex tools (manage-entity, manage-transaction, manage-account), so that I can use these consolidated tools effectively.

#### Acceptance Criteria

1. WHEN an AI agent accesses manage-entity tool, THE MCP Server SHALL provide entity-specific data structures and examples for all five entity types (category, categoryGroup, payee, rule, schedule)
2. WHEN an AI agent accesses manage-transaction tool, THE MCP Server SHALL provide complete examples for create, update, and delete operations with amount format clarification
3. WHEN an AI agent accesses manage-account tool, THE MCP Server SHALL provide formatted descriptions for all six operations (create, update, delete, close, reopen, balance) with account type descriptions
4. WHERE tools accept amounts in cents, THE MCP Server SHALL explicitly state the format with conversion examples
5. WHILE documenting operations, THE MCP Server SHALL include warnings for destructive operations (delete, close)

### Requirement 3: Parameter Documentation

**User Story:** As an AI agent, I want clear parameter descriptions in input schemas, so that I understand what values to provide for each field.

#### Acceptance Criteria

1. WHEN an AI agent inspects a tool's input schema, THE MCP Server SHALL provide descriptions for all properties including format, constraints, and examples
2. WHEN a parameter has a specific format requirement, THE MCP Server SHALL document the format in the property description
3. WHEN a parameter accepts multiple value types, THE MCP Server SHALL document all acceptable types and when to use each
4. WHERE parameters have default values, THE MCP Server SHALL document the defaults in the property description
5. WHILE defining required parameters, THE MCP Server SHALL clearly indicate which parameters are required versus optional

### Requirement 4: Use Case Guidance

**User Story:** As an AI agent, I want common use case examples for each tool, so that I can understand when to use each tool in typical workflows.

#### Acceptance Criteria

1. WHEN an AI agent reads a tool description, THE MCP Server SHALL provide a "COMMON USE CASES" section with 3-5 typical scenarios
2. WHEN multiple tools can accomplish similar tasks, THE MCP Server SHALL provide guidance on which tool to use for specific scenarios
3. WHEN tools have workflow dependencies, THE MCP Server SHALL document the typical workflow order
4. WHERE tools require IDs from other tools, THE MCP Server SHALL reference the prerequisite tool in the description
5. WHILE documenting use cases, THE MCP Server SHALL use concrete examples rather than abstract descriptions

### Requirement 5: Query Tool Descriptions

**User Story:** As an AI agent, I want detailed descriptions for query tools (get-transactions, get-accounts), so that I can effectively filter and retrieve data.

#### Acceptance Criteria

1. WHEN an AI agent accesses get-transactions tool, THE MCP Server SHALL document all filter parameters with examples of single and combined filters
2. WHEN an AI agent accesses get-accounts tool, THE MCP Server SHALL document the returned data structure and explain when to use this tool
3. WHEN query tools support filtering, THE MCP Server SHALL provide examples of common filter combinations
4. WHERE query tools have optional parameters, THE MCP Server SHALL document default behaviors when parameters are omitted
5. WHILE documenting query tools, THE MCP Server SHALL explain the relationship between query tools and management tools

### Requirement 6: Budget Operation Tool Descriptions

**User Story:** As an AI agent, I want clear descriptions for budget operation tools (set-budget, hold-budget-for-next-month, reset-budget-hold), so that I can manage budgets correctly.

#### Acceptance Criteria

1. WHEN an AI agent accesses set-budget tool, THE MCP Server SHALL provide examples for setting amount, carryover, and both together
2. WHEN budget tools accept amounts, THE MCP Server SHALL clarify the unit (cents) with conversion examples
3. WHEN budget tools accept month parameters, THE MCP Server SHALL document the required format (YYYY-MM) with examples
4. WHERE budget tools accept category parameters, THE MCP Server SHALL document that both names and IDs are accepted
5. WHILE documenting budget operations, THE MCP Server SHALL explain the purpose and effect of each operation

### Requirement 7: Analysis Tool Descriptions

**User Story:** As an AI agent, I want enhanced descriptions for analysis tools (monthly-summary, spending-by-category), so that I can generate useful financial insights.

#### Acceptance Criteria

1. WHEN an AI agent accesses monthly-summary tool, THE MCP Server SHALL document optional parameters, return data structure, and common use cases
2. WHEN an AI agent accesses spending-by-category tool, THE MCP Server SHALL document filter options and explain the returned breakdown structure
3. WHEN analysis tools support date ranges, THE MCP Server SHALL document date format requirements and default behaviors
4. WHERE analysis tools support account filtering, THE MCP Server SHALL explain the difference between filtered and unfiltered results
5. WHILE documenting analysis tools, THE MCP Server SHALL provide examples of typical analysis scenarios

### Requirement 8: Error Prevention Guidance

**User Story:** As an AI agent, I want warnings about common mistakes in tool descriptions, so that I can avoid errors and failed operations.

#### Acceptance Criteria

1. WHEN a tool performs destructive operations, THE MCP Server SHALL include prominent warnings in the description
2. WHEN a tool requires specific data formats, THE MCP Server SHALL warn about common format mistakes
3. WHEN a tool has workflow dependencies, THE MCP Server SHALL note prerequisite steps in the description
4. WHERE tools accept both names and IDs, THE MCP Server SHALL clarify when to use each approach
5. WHILE documenting tools, THE MCP Server SHALL include "NOTES" sections with important caveats and tips

### Requirement 9: Description Formatting Standards

**User Story:** As an AI agent, I want consistently formatted tool descriptions, so that I can quickly scan and understand any tool.

#### Acceptance Criteria

1. WHEN an AI agent reads any tool description, THE MCP Server SHALL follow a consistent structure with clearly labeled sections
2. WHEN tool descriptions include multiple sections, THE MCP Server SHALL use clear section headers (OPERATIONS, PARAMETERS, EXAMPLES, etc.)
3. WHEN listing items in descriptions, THE MCP Server SHALL use bullet points or numbered lists for readability
4. WHERE examples are provided, THE MCP Server SHALL format them as valid JSON on a single line
5. WHILE writing descriptions, THE MCP Server SHALL use newline characters (\n) to separate sections for improved readability

### Requirement 10: Simple Tool Documentation

**User Story:** As an AI agent, I want basic documentation for simple getter tools, so that I understand their purpose even if they're self-explanatory.

#### Acceptance Criteria

1. WHEN an AI agent accesses simple getter tools, THE MCP Server SHALL provide at least a one-line description of the tool's purpose
2. WHEN simple tools return specific data structures, THE MCP Server SHALL document what data is returned
3. WHEN simple tools have optional parameters, THE MCP Server SHALL document those parameters even if the tool is otherwise simple
4. WHERE simple tools are commonly used as prerequisites, THE MCP Server SHALL note their role in workflows
5. WHILE documenting simple tools, THE MCP Server SHALL maintain consistency with complex tool documentation patterns

### Requirement 11: Testing and Validation

**User Story:** As a developer, I want to validate tool description improvements with real MCP clients, so that I can ensure AI agents can actually use the tools better.

#### Acceptance Criteria

1. WHEN tool descriptions are updated, THE Development Team SHALL test with at least one real MCP client (Claude Desktop, Cline, etc.)
2. WHEN testing with MCP clients, THE Development Team SHALL verify that agents choose the correct tool for common tasks
3. WHEN agents fail to use tools correctly, THE Development Team SHALL iterate on descriptions based on observed confusion
4. WHERE multiple tools can accomplish similar tasks, THE Development Team SHALL verify agents choose the most appropriate tool
5. WHILE testing, THE Development Team SHALL document any remaining confusion or issues for future improvements

### Requirement 12: Documentation Maintenance

**User Story:** As a developer, I want a clear template for tool descriptions, so that future tools maintain the same high discoverability standards.

#### Acceptance Criteria

1. WHEN adding new tools, THE Development Team SHALL follow the established description template with all required sections
2. WHEN updating existing tools, THE Development Team SHALL ensure descriptions remain consistent with the template
3. WHEN tool functionality changes, THE Development Team SHALL update descriptions to reflect the changes
4. WHERE tools are deprecated or removed, THE Development Team SHALL update related tool descriptions that reference them
5. WHILE maintaining tools, THE Development Team SHALL periodically review and improve descriptions based on user feedback

---

## Requirements Coverage Summary

| Category | Requirements | Priority |
|----------|--------------|----------|
| Tool Description Quality | 1 | 🔴 Critical |
| Critical Tool Descriptions | 2 | 🔴 Critical |
| Parameter Documentation | 3 | 🟡 High |
| Use Case Guidance | 4 | 🟡 High |
| Query Tool Descriptions | 5 | 🟡 High |
| Budget Operation Tool Descriptions | 6 | 🟡 High |
| Analysis Tool Descriptions | 7 | 🟢 Medium |
| Error Prevention Guidance | 8 | 🟢 Medium |
| Description Formatting Standards | 9 | 🟢 Medium |
| Simple Tool Documentation | 10 | 🔵 Low |
| Testing and Validation | 11 | 🟡 High |
| Documentation Maintenance | 12 | 🔵 Low |

**Total Requirements:** 12  
**Total Acceptance Criteria:** 60
