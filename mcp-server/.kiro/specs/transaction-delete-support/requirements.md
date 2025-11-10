# Requirements Document

## Introduction

The Actual Budget MCP Server currently supports creating and updating transactions through the `manage-transaction` tool, but does not expose the ability to delete transactions. The underlying `@actual-app/api` package provides a `deleteTransaction` method that is not currently wrapped or exposed. This spec addresses the gap by adding transaction deletion capability while maintaining safety and consistency with the existing architecture.

## Glossary

- **MCP Server**: The Model Context Protocol server that exposes Actual Budget functionality to LLMs
- **Transaction**: A financial transaction record in Actual Budget (income, expense, or transfer)
- **CRUD Operations**: Create, Read, Update, Delete operations on entities
- **manage-transaction Tool**: The existing MCP tool that handles transaction create and update operations
- **Destructive Operation**: An operation that permanently removes data and cannot be easily undone
- **Write Permission**: Server configuration flag that enables mutation operations
- **Soft Delete**: Marking a record as deleted without removing it from the database
- **Hard Delete**: Permanently removing a record from the database

## Requirements

### Requirement 1: Add Delete Operation to manage-transaction Tool

**User Story:** As a user, I want to delete transactions through the MCP, so that I can correct mistakes or remove unwanted transactions without using the Actual Budget UI.

#### Acceptance Criteria

1. WHEN THE manage-transaction tool is called with operation 'delete', THE MCP Server SHALL delete the specified transaction
2. WHEN deleting a transaction, THE MCP Server SHALL require only the transaction ID
3. WHEN a transaction is successfully deleted, THE MCP Server SHALL return a confirmation message with the deleted transaction ID
4. WHERE the transaction ID does not exist, THE MCP Server SHALL return a clear error message
5. WHEN delete operation is requested, THE MCP Server SHALL require write permissions to be enabled

### Requirement 2: Maintain API Consistency

**User Story:** As a developer, I want transaction deletion to follow the same patterns as other entity deletions, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE delete operation SHALL use the same input validation patterns as create and update operations
2. THE delete operation SHALL use the existing ManageTransactionInputParser for validation
3. THE delete operation SHALL use the existing ManageTransactionDataFetcher for execution
4. THE delete operation SHALL use the existing ManageTransactionReportGenerator for response formatting
5. THE delete operation SHALL invalidate transaction cache after successful deletion

### Requirement 3: Provide Safety Guardrails

**User Story:** As a user, I want safeguards when deleting transactions, so that I don't accidentally delete the wrong transaction or lose important data.

#### Acceptance Criteria

1. WHEN deleting a transaction, THE MCP Server SHALL validate that the transaction ID exists before deletion
2. WHERE possible, THE MCP Server SHALL include transaction details (date, amount, payee) in the confirmation message
3. WHEN a transaction is part of a transfer, THE MCP Server SHALL warn about the impact on the linked transaction
4. WHERE a transaction has subtransactions, THE MCP Server SHALL indicate that subtransactions will also be deleted
5. WHEN deletion fails, THE MCP Server SHALL provide a clear error message with the reason

### Requirement 4: Update Tool Schema

**User Story:** As an LLM, I want clear documentation about the delete operation, so that I can use it correctly and inform users about its effects.

#### Acceptance Criteria

1. THE manage-transaction tool schema SHALL include 'delete' in the operation enum
2. THE tool description SHALL clearly indicate that delete is a destructive operation
3. THE tool schema SHALL specify that only 'id' is required for delete operations
4. THE tool schema SHALL include an example of a delete operation
5. THE tool description SHALL warn about the permanent nature of deletion

### Requirement 5: Wrap deleteTransaction API Method

**User Story:** As a developer, I want a wrapped deleteTransaction method in actual-api.ts, so that it follows the same patterns as other API methods with initialization and cache invalidation.

#### Acceptance Criteria

1. THE actual-api.ts module SHALL export a deleteTransaction function
2. THE deleteTransaction function SHALL ensure API initialization before calling the underlying API
3. THE deleteTransaction function SHALL accept a transaction ID as a parameter
4. THE deleteTransaction function SHALL invalidate the transactions cache after successful deletion
5. THE deleteTransaction function SHALL follow the same error handling patterns as other API wrapper functions

### Requirement 6: Handle Edge Cases

**User Story:** As a user, I want transaction deletion to handle edge cases gracefully, so that I understand what happens in complex scenarios.

#### Acceptance Criteria

1. WHEN deleting a transfer transaction, THE MCP Server SHALL handle both sides of the transfer appropriately
2. WHERE a transaction has reconciliation status, THE MCP Server SHALL delete it regardless of reconciliation state
3. WHEN deleting a scheduled transaction instance, THE MCP Server SHALL not affect the schedule itself
4. WHERE a transaction is linked to rules or automation, THE MCP Server SHALL delete it without affecting the rules
5. WHEN multiple delete requests occur simultaneously for the same transaction, THE MCP Server SHALL handle the race condition gracefully

### Requirement 7: Maintain Backward Compatibility

**User Story:** As an existing user, I want the addition of delete functionality to not break my existing workflows, so that my current integrations continue to work.

#### Acceptance Criteria

1. THE manage-transaction tool SHALL continue to support 'create' and 'update' operations without changes
2. THE tool schema changes SHALL be additive only (adding 'delete' to enum)
3. THE existing input validation SHALL remain unchanged for create and update operations
4. THE existing response formats SHALL remain unchanged for create and update operations
5. WHERE write permissions are disabled, THE delete operation SHALL be blocked like other write operations

### Requirement 8: Provide Clear User Feedback

**User Story:** As a user, I want clear feedback when I delete a transaction, so that I know exactly what was deleted and can verify it was the correct transaction.

#### Acceptance Criteria

1. WHEN a transaction is deleted, THE MCP Server SHALL return the transaction ID in the response
2. WHERE transaction details are available, THE MCP Server SHALL include date, amount, and payee in the confirmation
3. WHEN deletion succeeds, THE MCP Server SHALL use a clear success message format
4. WHERE deletion affects related data, THE MCP Server SHALL mention the impact in the response
5. WHEN showing deleted transaction details, THE MCP Server SHALL format amounts and dates consistently with other tools

### Requirement 9: Support Batch Operations (Future Consideration)

**User Story:** As a user, I want to understand if batch deletion is supported, so that I know whether I can delete multiple transactions at once.

#### Acceptance Criteria

1. THE initial implementation SHALL support single transaction deletion only
2. THE design SHALL not preclude future batch deletion support
3. THE documentation SHALL clarify that only single transaction deletion is currently supported
4. WHERE users need to delete multiple transactions, THE MCP Server SHALL suggest calling the tool multiple times
5. THE architecture SHALL allow for future enhancement to support batch deletion without breaking changes

### Requirement 10: Logging and Observability

**User Story:** As a system administrator, I want transaction deletions to be logged, so that I can audit destructive operations and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a transaction is deleted, THE MCP Server SHALL log the operation with transaction ID
2. WHERE deletion fails, THE MCP Server SHALL log the error with full context
3. WHEN performance logging is enabled, THE MCP Server SHALL track deletion operation duration
4. WHERE available, THE MCP Server SHALL log the user/client that initiated the deletion
5. THE logs SHALL include sufficient information to audit deletion operations without exposing sensitive data

