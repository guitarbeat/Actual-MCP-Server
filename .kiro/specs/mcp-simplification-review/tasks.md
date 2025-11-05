# Implementation Plan

- [x] 1. Create name resolution utility
  - Implement NameResolver class with caching for accounts, categories, and payees
  - Add methods: resolveAccount(), resolveCategory(), resolvePayee()
  - Handle both UUID pass-through and name lookup
  - Provide helpful error messages with available options
  - _Requirements: 1.2, 3.7, 4.4_

- [x] 1.1 Write unit tests for name resolver
  - Test UUID pass-through
  - Test name-to-ID resolution
  - Test caching behavior
  - Test error handling for unknown names
  - _Requirements: 1.2, 3.7_

- [x] 2. Implement consolidated transaction tool
  - Create src/tools/manage-transaction/ directory structure
  - Implement manage-transaction tool with create/update operations
  - Integrate name resolution for account, payee, and category
  - Add validation for operation-specific requirements
  - _Requirements: 3.2, 4.1, 4.4_

- [x] 2.1 Write unit tests for manage-transaction
  - Test create operation with names
  - Test update operation
  - Test validation errors
  - Test name resolution integration
  - _Requirements: 3.2, 4.1_

- [x] 3. Implement consolidated budget tool
  - Create src/tools/set-budget/ directory structure
  - Implement set-budget tool combining amount and carryover operations
  - Support optional parameters (amount, carryover)
  - Integrate name resolution for category
  - _Requirements: 3.5, 4.1, 4.4_

- [x] 3.1 Write unit tests for set-budget
  - Test setting amount only
  - Test setting carryover only
  - Test setting both
  - Test category name resolution
  - _Requirements: 3.5, 4.1_

- [x] 4. Enhance get-accounts tool
  - Add balance to account response by default
  - Add optional accountId filter parameter
  - Add includeClosed parameter (default: false)
  - Update report generator to include balance
  - _Requirements: 3.3, 4.3_

- [x] 4.1 Write unit tests for enhanced get-accounts
  - Test balance inclusion
  - Test single account filter
  - Test closed account filtering
  - _Requirements: 3.3_

- [x] 5. Implement automatic budget loading
  - Add auto-load logic to initActualApi() function
  - Load budget using ACTUAL_BUDGET_SYNC_ID on startup
  - Add error handling for missing or invalid budget ID
  - Log successful budget load
  - _Requirements: 5.2, 5.4_

- [x] 5.1 Write tests for auto-load functionality
  - Test successful budget load
  - Test behavior without sync ID
  - Test error handling for invalid ID
  - _Requirements: 5.2_

- [x] 6. Add optional auto-sync functionality
  - Implement background sync using setInterval
  - Make interval configurable via AUTO_SYNC_INTERVAL_MINUTES
  - Support disabling with interval=0
  - Clean up interval on shutdown
  - _Requirements: 5.3_

- [x] 7. Create feature flags for optional tools
  - Add ENABLE_BUDGET_MANAGEMENT flag
  - Add ENABLE_ADVANCED_ACCOUNT_OPS flag
  - Add ENABLE_UTILITY_TOOLS flag
  - Update getAvailableTools() to filter based on flags
  - _Requirements: 5.1, 5.5_

- [x] 8. Update tool registry with new tools
  - Add manage-transaction to core tools
  - Add set-budget to core tools
  - Move budget file management tools to optional
  - Move rare account operations to optional
  - Move utility tools to optional
  - _Requirements: 2.1, 2.2, 5.1_

- [x] 9. Add deprecation warnings to old tools
  - Add deprecation warning to create-transaction
  - Add deprecation warning to update-transaction
  - Add deprecation warning to set-budget-amount
  - Add deprecation warning to set-budget-carryover
  - Add deprecation warning to get-account-balance
  - Forward deprecated tools to new implementations
  - _Requirements: 7.1, 7.2_

- [x] 10. Update environment configuration
  - Add ACTUAL_BUDGET_SYNC_ID to .env.example
  - Add AUTO_SYNC_INTERVAL_MINUTES to .env.example
  - Add feature flag variables to .env.example
  - Document default values
  - _Requirements: 5.4, 7.4_

- [x] 11. Update documentation
  - Update README with new tool list (20 core tools)
  - Document removed tools and alternatives
  - Add migration guide for deprecated tools
  - Document new environment variables
  - Document feature flags for optional tools
  - Add examples of name resolution usage
  - _Requirements: 2.5, 5.4, 7.3, 7.5_

- [x] 11.1 Update ARCHITECTURE.md
  - Document name resolution utility
  - Document consolidated tools pattern
  - Update tool count statistics
  - Document auto-load behavior
  - _Requirements: 2.5, 6.2_

- [x] 12. Integration testing
  - Test complete workflow with new tools
  - Test auto-load on server startup
  - Test name resolution in real scenarios
  - Test feature flags enable/disable
  - Verify deprecated tools still work
  - _Requirements: 1.1, 3.1, 5.2, 7.1_

- [x] 13. Performance validation
  - Measure context window token reduction
  - Verify name resolution caching effectiveness
  - Test auto-sync performance impact
  - Ensure no regression in tool execution time
  - _Requirements: 2.1, 2.4_
