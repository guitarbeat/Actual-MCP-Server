# Implementation Plan: Code Quality Refactoring

## Phase 1: Type Safety Improvements (Priority: High)

### Task 1.1: Create Type Definitions Module
- [ ] Create `src/core/types/api-responses.ts` with API response type definitions
- [ ] Create `src/core/types/mocks.ts` with mock type definitions
- [ ] Create `src/core/utils/type-guards.ts` with type guard functions
- [ ] Export types from `src/core/types/index.ts`
- [ ] _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

### Task 1.2: Fix `any` Types in Production Code - Core Files
- [ ] Fix `src/actual-api.ts` (3 instances)
  - [ ] Line 636: Replace `any` with proper type
  - [ ] Line 952: Replace `any` with proper type
  - [ ] Line 978: Replace `any` with proper type
- [ ] Fix `src/index.ts` (1 instance)
  - [ ] Line 340: Replace `any` with proper type
- [ ] Fix `src/tools/index.ts` (if any)
- [ ] Fix `src/tools/manage-entity/entity-handlers/rule-handler.test.ts` (if production code)
- [ ] Run tests after each file
- [ ] _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 1.3: Fix `any` Types in Tools
- [ ] Fix `src/tools/crud-factory.ts` (6 instances)
  - [ ] Replace `any` with proper generic types
- [ ] Fix `src/tools/get-transactions/index.ts` (1 instance)
  - [ ] Line 52: Replace `any` with proper type
- [ ] Run tests after each file
- [ ] _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

### Task 1.4: Fix `any` Types in Test Files
- [ ] Fix `src/actual-api.test.ts` (38 instances)
  - [ ] Replace mock `any` types with `unknown` or proper mock types
- [ ] Fix `src/core/api/cache-invalidation.test.ts` (3 instances)
- [ ] Fix `src/tools/budget/hold-budget/index.test.ts` (1 instance)
- [ ] Fix `src/tools/categories/get-grouped-categories/index.test.ts` (2 instances)
- [ ] Fix `src/integration.test.ts` (1 instance)
- [ ] Run tests after each file
- [ ] _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 2: Function Length Reduction (Priority: High)

### Task 2.1: Extract Functions from `src/index.ts`
- [ ] Analyze `main()` function (276 lines, complexity 22)
- [ ] Extract startup logic into `setupServer()` function
- [ ] Extract transport initialization into `initializeTransport()` function
- [ ] Extract tool registration into `registerTools()` function
- [ ] Extract error handling into `handleServerError()` function
- [ ] Add JSDoc comments to extracted functions
- [ ] Run tests to verify functionality
- [ ] _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

### Task 2.2: Extract Functions from `src/resources.ts`
- [ ] Analyze long functions (195 lines, 162 lines)
- [ ] Extract resource fetching logic
- [ ] Extract response formatting logic
- [ ] Extract error handling logic
- [ ] Add JSDoc comments
- [ ] Run tests
- [ ] _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 2.3: Extract Functions from `src/tools/get-transactions/index.ts`
- [ ] Analyze `handler()` function (complexity 17)
- [ ] Extract transaction filtering logic
- [ ] Extract date range logic
- [ ] Extract account filtering logic
- [ ] Extract response formatting logic
- [ ] Add JSDoc comments
- [ ] Run tests
- [ ] _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 2.4: Extract Functions from Tool Handlers
- [ ] Review other tool handler files for long functions
- [ ] Extract validation logic where applicable
- [ ] Extract data processing logic where applicable
- [ ] Extract response formatting where applicable
- [ ] Run tests after each extraction
- [ ] _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

## Phase 3: Callback Nesting Reduction (Priority: Medium)

### Task 3.1: Convert Promise Chains to Async/Await in Production Code
- [ ] Identify Promise chains in production code (not test files)
- [ ] Convert to async/await syntax
- [ ] Preserve error handling
- [ ] Update function return types
- [ ] Run tests after each conversion
- [ ] _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 3.2: Create Test Helper Functions
- [ ] Create `src/test-utils/helpers.ts` for common test setup
- [ ] Create `src/test-utils/mocks.ts` for mock data creation
- [ ] Extract test setup logic into helper functions
- [ ] Extract test cleanup logic into helper functions
- [ ] Document helper functions with JSDoc
- [ ] _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

### Task 3.3: Refactor Test Files with Deep Nesting
- [ ] Refactor `src/core/transport/protocol-detector.test.ts` (15 instances)
  - [ ] Extract test setup helpers
  - [ ] Use async/await instead of nested callbacks
- [ ] Refactor `src/core/transport/streamable-http-handler.test.ts` (6 instances)
- [ ] Refactor `src/core/transport/transport-manager.test.ts` (7 instances)
- [ ] Refactor `src/integration.test.ts` (20 instances)
- [ ] Refactor `src/performance-validation.test.ts` (9 instances)
- [ ] Refactor `src/persistent-connection.benchmark.test.ts` (4 instances)
- [ ] Refactor `src/tools/index.test.ts` (12 instances)
- [ ] Refactor `src/tools/balance-history/index.test.ts` (3 instances)
- [ ] Run tests after each file
- [ ] _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 4: Complexity Reduction (Priority: Medium)

### Task 4.1: Reduce Complexity in `src/index.ts`
- [ ] Analyze `main()` function complexity (22)
- [ ] Extract conditional logic into separate functions
- [ ] Use early returns for validation
- [ ] Use guard clauses where applicable
- [ ] Run tests
- [ ] _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 4.2: Reduce Complexity in `src/tools/get-transactions/index.ts`
- [ ] Analyze `handler()` function complexity (17)
- [ ] Extract filtering logic into separate functions
- [ ] Extract conditional logic
- [ ] Use early returns
- [ ] Run tests
- [ ] _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 4.3: Reduce Complexity in `src/resources.ts`
- [ ] Analyze async arrow function complexity (20)
- [ ] Extract conditional logic
- [ ] Use strategy pattern if applicable
- [ ] Use early returns
- [ ] Run tests
- [ ] _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 4.4: Reduce Complexity in `src/tools/manage-entity/entity-handlers/schedule-handler.ts`
- [ ] Analyze `create()` method complexity (16)
- [ ] Analyze `update()` method complexity (16)
- [ ] Extract conditional logic from both methods
- [ ] Use early returns
- [ ] Run tests
- [ ] _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 5: Test Code Cleanup (Priority: Low)

### Task 5.1: Extract Long Test Functions
- [ ] Refactor `src/actual-api.test.ts` (434 lines)
- [ ] Refactor `src/core/aggregation/group-by.test.ts` (138 lines)
- [ ] Refactor `src/core/aggregation/transaction-grouper.test.ts` (235 lines)
- [ ] Refactor `src/core/api/cache-invalidation.test.ts` (132 lines)
- [ ] Refactor `src/core/cache/cache-service.test.ts` (149 lines)
- [ ] Refactor `src/core/data/fetch-transactions.test.ts` (185 lines)
- [ ] Refactor `src/core/formatting/date-formatter.test.ts` (185 lines)
- [ ] Refactor `src/core/mapping/category-mapper.test.ts` (158 lines)
- [ ] Refactor `src/core/response/error-builder.test.ts` (167 lines)
- [ ] Refactor `src/core/response/response-builder.test.ts` (150 lines)
- [ ] Refactor `src/core/transport/protocol-detector.test.ts` (256, 253 lines)
- [ ] Refactor `src/core/transport/streamable-http-handler.test.ts` (136, 132 lines)
- [ ] Refactor `src/core/transport/transport-manager.test.ts` (171, 169 lines)
- [ ] Refactor `src/core/utils/name-resolver.test.ts` (210 lines)
- [ ] Refactor `src/integration.test.ts` (182 lines)
- [ ] Refactor `src/performance-validation.test.ts` (336, 164 lines)
- [ ] Refactor `src/persistent-connection.benchmark.test.ts` (145 lines)
- [ ] Refactor `src/persistent-connection.integration.test.ts` (170 lines)
- [ ] Refactor `src/resources.test.ts` (165, 123 lines)
- [ ] Refactor `src/tools/balance-history/index.test.ts` (171 lines)
- [ ] Refactor `src/tools/get-accounts/data-fetcher.test.ts` (231 lines)
- [ ] Refactor `src/tools/spending-by-category/index.test.ts` (if applicable)
- [ ] Use test helper functions where applicable
- [ ] Run tests after each refactoring
- [ ] _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 5.2: Reduce Remaining Callback Nesting in Tests
- [ ] Identify remaining deeply nested callbacks in test files
- [ ] Convert to async/await or extract helpers
- [ ] Run tests
- [ ] _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 6: Verification and Documentation

### Task 6.1: Run Full Test Suite
- [ ] Run `npm test` to verify all tests pass
- [ ] Run `npm run test:coverage` to verify coverage maintained
- [ ] Fix any test failures
- [ ] _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 6.2: Verify ESLint Warnings Reduced
- [ ] Run `npm run lint` to count remaining warnings
- [ ] Verify warning count < 50
- [ ] Document remaining warnings if any
- [ ] _Requirements: Success Metrics_

### Task 6.3: Update Documentation
- [ ] Update `docs/AUTO_FIX_TOOLS.md` with refactoring notes
- [ ] Add JSDoc comments to all extracted functions
- [ ] Document refactoring patterns used
- [ ] Update README if needed
- [ ] _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

### Task 6.4: Code Review and Final Verification
- [ ] Review all changes for consistency
- [ ] Verify no functionality regressions
- [ ] Verify type safety improvements
- [ ] Verify test coverage maintained
- [ ] Run final lint check
- [ ] _Requirements: All requirements_

## Implementation Notes

### Priority Order
1. **Phase 1** (Type Safety) - Highest priority, affects code correctness
2. **Phase 2** (Function Length) - High priority, affects maintainability
3. **Phase 3** (Callbacks) - Medium priority, mostly test files
4. **Phase 4** (Complexity) - Medium priority, affects readability
5. **Phase 5** (Test Cleanup) - Low priority, doesn't affect production code
6. **Phase 6** (Verification) - Final step

### Incremental Approach
- Complete one task at a time
- Run tests after each task
- Commit changes incrementally
- Measure progress with ESLint warning count

### Testing Strategy
- Run `npm test` after each file refactoring
- Run `npm run test:coverage` after each phase
- Run integration tests after production code changes
- Verify no test failures introduced

### Success Criteria
- ESLint warnings reduced from 257 to < 50
- All tests pass
- Test coverage maintained at 100%
- No functionality regressions
- Type safety improved (zero `any` in production code)
