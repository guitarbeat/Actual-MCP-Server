# Implementation Plan

- [x] 1. Add deleteTransaction API wrapper
  - Add `deleteTransaction` function to `src/actual-api.ts`
  - Ensure API initialization before calling underlying API method
  - Call `api.deleteTransaction({ id })` with transaction ID
  - Invalidate transaction cache after successful deletion
  - Follow same error handling pattern as other API wrappers
  - _Requirements: 1.1, 2.1, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.1 Write unit tests for deleteTransaction API wrapper
  - Test that API initialization is called before deletion
  - Test that `api.deleteTransaction` is called with correct parameters
  - Test that transaction cache is invalidated after deletion
  - Test error handling when deletion fails
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Update manage-transaction types
  - Add 'delete' to operation type union in `src/tools/manage-transaction/types.ts`
  - Make `transaction` object optional in `ManageTransactionArgs` interface
  - Add optional `details` field to `TransactionOperationResult` interface
  - Update all type exports
  - _Requirements: 2.1, 2.2, 8.1, 8.2_

- [x] 3. Update manage-transaction tool schema
  - Add 'delete' to operation enum in Zod schema in `src/tools/manage-transaction/index.ts`
  - Make `transaction` object optional in schema (use `.optional()`)
  - Update tool description to include delete operation
  - Add warning about permanent deletion to description
  - Add example of delete operation in description
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Extend input parser for delete operation
  - Add delete operation handling to `ManageTransactionInputParser.parse()` in `src/tools/manage-transaction/input-parser.ts`
  - Validate that ID is provided for delete operation
  - Return early with just operation and ID for delete (no name resolution needed)
  - Use `validationError` builder for missing ID
  - Keep existing create/update validation logic unchanged
  - _Requirements: 1.2, 2.1, 2.2, 3.1, 7.1, 7.2, 7.3_

- [x] 4.1 Write unit tests for delete input parsing
  - Test successful parsing of delete operation with valid ID
  - Test validation error when ID is missing for delete
  - Test that transaction object is not required for delete
  - Test that existing create/update parsing still works
  - _Requirements: 1.2, 2.1, 3.1_

- [x] 5. Add delete method to data fetcher
  - Add `deleteTransaction` private method to `ManageTransactionDataFetcher` in `src/tools/manage-transaction/data-fetcher.ts`
  - Update `execute` method to route delete operations to new method
  - Validate ID is present before deletion
  - Call the new `deleteTransaction` API wrapper
  - Return result with transaction ID and operation type
  - Handle errors and provide clear error messages
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 6.1, 6.2, 6.5_

- [x] 5.1 Write unit tests for delete data fetching
  - Test that deleteTransaction API wrapper is called with correct ID
  - Test that result includes transaction ID and operation type
  - Test error handling when ID is missing
  - Test error handling when API deletion fails
  - Test that existing create/update methods still work
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3_

- [x] 6. Add delete formatting to report generator
  - Add `formatDeleteMessage` private method to `ManageTransactionReportGenerator` in `src/tools/manage-transaction/report-generator.ts`
  - Update `generate` method to route delete operations to new method
  - Format confirmation message with transaction ID
  - Add warning about permanent deletion
  - Use consistent formatting with other operations
  - Handle case where details are not available
  - _Requirements: 1.4, 3.2, 8.1, 8.2, 8.3, 8.5_

- [x] 6.1 Write unit tests for delete report generation
  - Test delete message formatting with transaction ID
  - Test that warning about permanence is included
  - Test formatting when details are not available
  - Test that existing create/update formatting still works
  - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.5_

- [x] 7. Add integration tests for delete operation
  - Create integration test file or extend existing `src/tools/manage-transaction/index.test.ts`
  - Test end-to-end delete operation with valid transaction ID
  - Test delete operation with non-existent transaction ID
  - Test that cache is invalidated after deletion
  - Test that write permissions are required for delete
  - Test that delete operation doesn't break create/update operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Update tool registry and permissions
  - Verify that manage-transaction tool is marked as `requiresWrite: true` in `src/tools/index.ts`
  - Verify that delete operation is blocked when write permissions are disabled
  - Test that tool schema includes delete operation in list-tools response
  - _Requirements: 1.5, 7.5_

- [x] 9. Add logging for delete operations
  - Verify that existing performance logging captures delete operations
  - Verify that transaction ID is included in logs
  - Verify that errors are logged with full context
  - Add any additional logging needed for audit trail
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10. Update documentation
  - Update README.md with delete operation example
  - Add warning about permanent deletion to README
  - Update tool description in documentation
  - Add delete operation to any API documentation
  - Update CHANGELOG.md with new feature
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Manual testing and validation
  - Test delete operation with various transaction types
  - Test deletion of transfer transactions (verify both sides deleted)
  - Test deletion of transactions with subtransactions
  - Test deletion of reconciled transactions
  - Test error handling with invalid transaction IDs
  - Verify cache invalidation works correctly
  - Verify confirmation messages are clear and helpful
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5_
