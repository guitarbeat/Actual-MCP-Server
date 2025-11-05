# Implementation Plan

- [ ] 1. Create response formatter infrastructure
  - Create `src/core/response/formatters/` directory
  - Implement TableFormatter for consistent markdown tables
  - Implement EntityFormatter for write operation responses
  - Implement SummaryFormatter for aggregation displays
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 1.1 Write unit tests for response formatters
  - Test TableFormatter with various data types and edge cases
  - Test EntityFormatter for create/update/delete operations
  - Test SummaryFormatter with different section configurations
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement enhanced validation infrastructure
  - Create `src/core/validation/` directory
  - Implement BatchValidator for collecting multiple validation errors
  - Implement FuzzyMatcher for entity name suggestions using Levenshtein distance
  - Create validation rules for common field types (dates, amounts, IDs)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.1 Write unit tests for validation infrastructure
  - Test BatchValidator with multiple errors
  - Test FuzzyMatcher with various similarity scenarios
  - Test validation rules for all field types
  - _Requirements: 2.1, 2.2, 7.1_

- [ ] 3. Implement response metadata system
  - Create `src/core/response/metadata/` directory
  - Implement MetadataBuilder for adding context to responses
  - Add metadata formatting utilities
  - Integrate with cache service to track data source and age
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.1 Write unit tests for metadata system
  - Test MetadataBuilder with various metadata types
  - Test metadata formatting as markdown
  - Test integration with cache service
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4. Implement performance baseline system
  - Create `src/core/performance/baselines.ts`
  - Define performance budgets for each tool category
  - Implement PerformanceBaselines class for budget checking
  - Create configuration file for per-tool budgets
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.1 Implement performance trend analysis
  - Create `src/core/performance/trend-analyzer.ts`
  - Implement TrendAnalyzer for detecting performance regressions
  - Add rolling average calculations (7-day, 30-day)
  - Implement anomaly detection for performance issues
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 Write unit tests for performance monitoring
  - Test PerformanceBaselines budget checking
  - Test TrendAnalyzer regression detection
  - Test rolling average calculations
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Implement cache warming infrastructure
  - Create `src/core/cache/cache-warmer.ts`
  - Implement CacheWarmer with priority-based warming strategies
  - Add startup warming for commonly accessed data (accounts, categories, payees)
  - Implement post-write warming for affected data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.1 Implement granular cache keys
  - Create `src/core/cache/granular-keys.ts`
  - Implement GranularCacheKeys for building specific cache keys
  - Add pattern-based cache invalidation
  - Update cache service to support granular keys
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5.2 Integrate cache warming with server startup
  - Update `src/actual-api.ts` to call cache warmer on initialization
  - Configure warming strategies for high-priority data
  - Add logging for cache warming progress
  - _Requirements: 5.1, 5.2_

- [ ] 5.3 Write unit tests for cache improvements
  - Test CacheWarmer strategy execution
  - Test GranularCacheKeys key generation
  - Test pattern-based invalidation
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Implement usage analytics system
  - Create `src/core/analytics/` directory
  - Implement UsageTracker for recording tool invocations
  - Add pattern detection for common tool sequences
  - Implement analytics reporter for generating usage reports
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 6.1 Write unit tests for usage analytics
  - Test UsageTracker recording and statistics
  - Test pattern detection algorithms
  - Test analytics report generation
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 7. Update get-transactions tool with new formatters
  - Update report-generator.ts to use TableFormatter
  - Add response metadata (data source, cache age, filter counts)
  - Enhance input validation with BatchValidator
  - Add fuzzy matching for category and payee name lookups
  - Update tool schema with examples and use cases
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 6.1, 6.2, 8.1, 8.2_

- [ ] 8. Update spending-by-category tool with new formatters
  - Update report-generator.ts to use TableFormatter and SummaryFormatter
  - Add response metadata for calculation method
  - Enhance error messages with suggestions
  - Update tool schema with examples and related tools
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 6.1, 6.5, 8.1, 8.3_

- [ ] 9. Update monthly-summary tool with new formatters
  - Update report-generator.ts to use TableFormatter and SummaryFormatter
  - Add response metadata for aggregation details
  - Enhance date validation with examples
  - Update tool schema with use cases
  - _Requirements: 1.1, 1.2, 1.4, 2.5, 6.1, 6.5, 8.1_

- [ ] 10. Update manage-transaction tool with new formatters
  - Update report-generator.ts to use EntityFormatter
  - Implement BatchValidator for all input fields
  - Add fuzzy matching for account, payee, and category lookups
  - Show before/after values for update operations
  - Update tool schema with comprehensive examples
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.4, 8.1, 8.2, 8.4_

- [ ] 11. Update balance-history tool with new formatters
  - Update report-generator.ts to use TableFormatter
  - Add response metadata for calculation method
  - Enhance date validation
  - Update tool schema with examples
  - _Requirements: 1.1, 1.4, 2.5, 6.5, 8.1_

- [ ] 12. Update get-accounts tool with new formatters
  - Update report-generator.ts to use TableFormatter
  - Add response metadata for filter information
  - Update tool schema with use cases and related tools
  - _Requirements: 1.1, 1.4, 3.2, 8.1, 8.3_

- [ ] 13. Update manage-entity tool with new formatters
  - Update handler to use EntityFormatter for all operations
  - Implement BatchValidator for entity-specific validation
  - Add fuzzy matching for entity lookups
  - Enhance error messages with entity-specific suggestions
  - Update tool schema with examples for each entity type
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 7.1, 7.2, 8.1, 8.4_

- [ ] 14. Update remaining read tools (get-grouped-categories, get-payees, get-rules, get-schedules)
  - Standardize response format (JSON to markdown where appropriate)
  - Add response metadata
  - Update tool schemas with examples
  - Enhance error handling
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 6.1, 8.1_

- [ ] 15. Update remaining write tools (update-account, set-budget, merge-payees, hold-budget, reset-budget)
  - Update to use EntityFormatter for consistent responses
  - Implement BatchValidator for input validation
  - Add fuzzy matching where applicable
  - Update tool schemas with examples
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 7.1, 8.1_

- [ ] 16. Update budget operation tools (get-budget-months, get-budget-month, run-bank-sync, run-import)
  - Standardize response formats
  - Add response metadata
  - Enhance error messages
  - Update tool schemas with examples and use cases
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 6.1, 8.1_

- [ ] 17. Enhance tool schemas with discoverability improvements
  - Add use cases section to all tool schemas
  - Add comprehensive examples for all parameters
  - Add related tools references
  - Add tool categories (data-retrieval, analysis, mutation, etc.)
  - Document common error scenarios in schema descriptions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 18. Implement response validation system
  - Create `src/core/response/validators/` directory
  - Implement ResponseValidator for validating tool outputs
  - Add markdown table structure validation
  - Add JSON schema validation for JSON responses
  - Integrate with tool handlers to validate before returning
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 18.1 Write unit tests for response validation
  - Test markdown table validation
  - Test JSON schema validation
  - Test response size limits and truncation
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 19. Integrate performance monitoring with tool execution
  - Update `src/tools/index.ts` to use PerformanceBaselines
  - Add trend analysis to performance logging
  - Implement performance budget warnings
  - Add performance summary to shutdown logs
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 20. Integrate usage analytics with tool execution
  - Update `src/tools/index.ts` to record usage metrics
  - Track tool sequences and patterns
  - Implement usage report generation
  - Add analytics to performance summary
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 21. Update error builders with enhanced functionality
  - Extend notFoundError to support suggestions array
  - Extend validationError to support examples and accepted formats
  - Extend apiError to support retryable flag
  - Update all error builders to use consistent formatting
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 22. Create configuration files for new systems
  - Create performance budget configuration
  - Create cache warming strategy configuration
  - Create tool category definitions
  - Add environment variables for feature flags
  - _Requirements: 4.1, 5.1, 3.1_

- [ ] 23. Update documentation
  - Update README.md with response format standards
  - Update ARCHITECTURE.md with new core modules
  - Document error message structure and examples
  - Document performance budgets and monitoring
  - Document cache warming strategies
  - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [ ] 24. Create integration tests for enhanced tools
  - Test end-to-end tool execution with new formatters
  - Test error scenarios with suggestions
  - Test cache warming effectiveness
  - Test performance monitoring and alerting
  - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [ ] 25. Run performance benchmarks
  - Establish baseline metrics for all tools
  - Verify no performance regression from enhancements
  - Measure cache hit rate improvements
  - Measure first request latency improvements
  - _Requirements: 4.1, 5.1, 5.2_

- [ ] 26. Create migration guide
  - Document changes for existing users
  - Provide examples of old vs new response formats
  - Document new error message structure
  - Explain performance monitoring features
  - Document cache configuration options
  - _Requirements: 1.1, 2.1, 4.1, 5.1_
