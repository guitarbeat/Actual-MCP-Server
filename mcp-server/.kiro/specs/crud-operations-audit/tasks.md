# Implementation Plan

- [x] 1. Add updateTransaction API wrapper for consistency
  - Add `updateTransaction` function to `src/actual-api.ts` that wraps `api.updateTransaction`
  - Include API initialization call
  - Add cache invalidation for transactions
  - Follow same pattern as other API wrappers
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1_

- [x] 1.1 Update manage-transaction to use new wrapper
  - Modify `src/tools/manage-transaction/data-fetcher.ts` to import and use `updateTransaction` from actual-api
  - Remove direct api import for update operation
  - Verify cache invalidation still works
  - _Requirements: 1.2, 2.1, 3.1_

- [x] 1.2 Add tests for updateTransaction wrapper
  - Create tests in `src/actual-api.test.ts` for updateTransaction
  - Test API initialization before update
  - Test cache invalidation after update
  - Test error handling
  - _Requirements: 15.1, 15.2, 15.4_

- [x] 2. Create manage-account tool structure
  - Create directory `src/tools/manage-account/`
  - Create `index.ts` with tool schema and handler
  - Create `types.ts` with TypeScript interfaces
  - Create `input-parser.ts` for validation and parsing
  - Create `data-fetcher.ts` for API operations
  - Create `report-generator.ts` for response formatting
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.2_

- [x] 2.1 Define manage-account types
  - Define `ManageAccountArgs` interface with operation, id, account, initialBalance, transferAccountId, transferCategoryId, date fields
  - Define `AccountType` enum with all valid account types
  - Define `ParsedAccountInput` interface for validated input
  - Define `AccountOperationResult` interface for operation results
  - _Requirements: 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.2 Implement manage-account tool schema
  - Define Zod schema for manage-account arguments
  - Include operation enum: create, update, delete, close, reopen, balance
  - Make id required for update, delete, close, reopen, balance operations
  - Make account object optional (required for create/update)
  - Add description with examples for each operation
  - Convert Zod schema to JSON schema for MCP
  - _Requirements: 4.1, 6.1, 6.2, 6.3, 6.4, 6.5, 14.2_

- [x] 2.3 Implement input parser for manage-account
  - Create `ManageAccountInputParser` class
  - Implement `parse` method that validates operation and required fields
  - Validate account type against enum for create/update
  - Validate id is provided for update, delete, close, reopen, balance
  - Validate transferAccountId for close with non-zero balance
  - Return `ParsedAccountInput` with validated data
  - _Requirements: 3.1, 4.1, 4.2, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.4 Implement data fetcher for manage-account
  - Create `ManageAccountDataFetcher` class
  - Implement `execute` method that routes to operation-specific methods
  - Implement `createAccount` method using `createAccount` API wrapper
  - Implement `updateAccount` method using `updateAccount` API wrapper
  - Implement `deleteAccount` method using `deleteAccount` API wrapper
  - Implement `closeAccount` method using `closeAccount` API wrapper
  - Implement `reopenAccount` method using `reopenAccount` API wrapper
  - Implement `getBalance` method using `getAccountBalance` API wrapper
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.2_

- [x] 2.5 Implement report generator for manage-account
  - Create `ManageAccountReportGenerator` class
  - Implement `generate` method that routes to operation-specific formatters
  - Implement `formatCreateMessage` with account ID and details
  - Implement `formatUpdateMessage` with updated fields
  - Implement `formatDeleteMessage` with warning
  - Implement `formatCloseMessage` with transfer details if applicable
  - Implement `formatReopenMessage` with account ID
  - Implement `formatBalanceMessage` with balance amount
  - _Requirements: 3.1, 6.1, 6.2, 6.3, 6.4, 6.5, 14.2_

- [x] 2.6 Implement manage-account handler
  - Create main handler function in `index.ts`
  - Instantiate parser, fetcher, and generator
  - Parse input with error handling
  - Execute operation with error handling
  - Generate formatted response
  - Return success or error response
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.2_

- [x] 3. Register manage-account tool
  - Import manage-account tool in `src/tools/index.ts`
  - Add to toolRegistry with requiresWrite: true for create/update/delete/close/reopen
  - Add to toolRegistry with requiresWrite: false for balance operation
  - Verify tool appears in list-tools response
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Write unit tests for manage-account input parser
  - Test validation for each operation type
  - Test required field validation (id for update/delete/close/reopen/balance)
  - Test account type validation
  - Test transferAccountId validation for close
  - Test error messages are clear
  - _Requirements: 15.1, 15.4_

- [x] 3.2 Write unit tests for manage-account data fetcher
  - Test create operation with and without initial balance
  - Test update operation with partial fields
  - Test delete operation
  - Test close operation with and without transfer
  - Test reopen operation
  - Test balance query operation
  - Test error handling for each operation
  - _Requirements: 15.1, 15.2, 15.4_

- [x] 3.3 Write unit tests for manage-account report generator
  - Test create message formatting
  - Test update message formatting
  - Test delete message formatting with warning
  - Test close message formatting with transfer details
  - Test reopen message formatting
  - Test balance message formatting
  - _Requirements: 15.1_

- [x] 3.4 Write integration tests for manage-account
  - Test end-to-end create operation
  - Test end-to-end update operation
  - Test end-to-end delete operation
  - Test end-to-end close operation with transfer
  - Test end-to-end reopen operation
  - Test end-to-end balance query
  - Test error scenarios (invalid type, missing id, etc.)
  - _Requirements: 15.2, 15.4_

- [x] 4. Update documentation
  - Add manage-account tool examples to README.md
  - Document all operation types with JSON examples
  - Document account types enum
  - Document special operations (close with transfer, balance query)
  - Add troubleshooting section for common errors
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 4.1 Update CHANGELOG
  - Add entry for manage-account tool
  - Add entry for updateTransaction API wrapper
  - Note completion of account CRUD operations
  - _Requirements: 14.1_

- [x] 4.2 Create usage examples
  - Create example for creating checking account
  - Create example for creating account with initial balance
  - Create example for updating account name
  - Create example for closing account with transfer
  - Create example for querying account balance
  - Create example for deleting account
  - _Requirements: 14.2_

- [x] 5. Verify CRUD coverage completeness
  - Run audit to verify all entities have complete CRUD coverage
  - Verify all API wrappers follow consistent patterns
  - Verify all tools have proper error handling
  - Verify all tools have cache invalidation
  - Document any remaining gaps or future enhancements
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.1 Create CRUD coverage report
  - Generate matrix showing CRUD coverage for all entities
  - Identify any remaining gaps
  - Document intentional exclusions
  - Provide recommendations for future work
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.1, 14.4_
