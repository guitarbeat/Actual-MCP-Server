This document tracks the tasks required to implement the `manage-entity` tool, which consolidates multiple CRUD tools into a single generic interface.

**Project Status:** Completed

- [x] 1. Set up `manage-entity` tool structure
  - [x] 1.1 Create initial file structure
  - [x] 1.2 Define `EntityHandler` interface
  - [x] 1.3 Set up testing framework
  - _Requirements: 1.1, 4.3_

- [x] 2. Implement `category` entity handler
  - [x] 2.1 Create `CategoryHandler` class
  - [x] 2.2 Write unit tests for `CategoryHandler`
  - _Requirements: 2.2, 2.4, 4.3_

- [x] 3. Implement `category group` entity handler
  - [x] 3.1 Create `CategoryGroupHandler` class
  - [x] 3.2 Write unit tests for `CategoryGroupHandler`
  - _Requirements: 2.2, 2.4, 4.3_

- [x] 4. Implement `payee` entity handler
  - [x] 4.1 Create `PayeeHandler` class
  - [x] 4.2 Write unit tests for `PayeeHandler`
  - _Requirements: 2.2, 2.4, 4.3_

- [x] 5. Implement `rule` entity handler
  - [x] 5.1 Create `RuleHandler` class
  - [x] 5.2 Write unit tests for `RuleHandler`
  - _Requirements: 2.2, 2.4, 4.3_

- [x] 6. Implement `schedule` entity handler
  - [x] 6.1 Create `ScheduleHandler` class
  - [x] 6.2 Write unit tests for `ScheduleHandler`
  - _Requirements: 2.2, 2.4, 4.3_

- [x] 7. Implement main `manage-entity` tool
  - [x] 7.1 Create main tool file and schema
  - [x] 7.2 Implement argument parsing and validation
  - [x] 7.3 Implement entity handler mapping
  - [x] 7.4 Implement main `handler` function
  - [x] 7.5 Implement error handling
  - [x] 7.6 Implement cache invalidation
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 3.2, 4.1, 4.2_

- [x] 8. Implement feature flag support
  - [x] 8.1 Add `manage-entity` feature flag
  - [x] 8.2 Check feature flag in tool entry point
  - _Requirements: 3.3_

- [x] 9. Register new tool and deprecate old tools
  - [x] 9.1 Add `manage-entity` to tool registry
  - [x] 9.2 Add deprecation warnings to old tools
  - _Requirements: 3.1, 3.4_

- [x] 10. Update documentation
  - [x] 10.1 Write `manage-entity` tool documentation in README.md
  - [x] 10.2 Update ARCHITECTURE.md with tool consolidation pattern
  - [x] 10.3 Create comprehensive migration guide (docs/MIGRATION-GUIDE.md)
  - _Requirements: 5.1, 5.2_
  - _Files: README.md, ARCHITECTURE.md, docs/MIGRATION-GUIDE.md_

- [x] 11. Performance validation
  - [x] 11.1 Create benchmark script (scripts/benchmark-manage-entity.ts)
  - [x] 11.2 Run benchmarks and validate <5ms overhead target
  - [x] 11.3 Document performance characteristics
  - _Requirements: 4.4_
  - _Result: Average overhead 0.000ms (well within <5ms target) ✅_
