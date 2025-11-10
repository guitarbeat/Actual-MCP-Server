# Implementation Plan

## Overview

This implementation plan breaks down the tool discoverability improvements into discrete, actionable tasks. Each task focuses on updating specific tool descriptions and input schemas to improve AI agent discoverability.

---

## Phase 1: Critical Tools (Priority 🔴)

- [x] 1. Update manage-entity tool
  - Update tool description with entity-specific data structures and examples
  - Add comprehensive input schema descriptions
  - Include all 5 entity types (category, categoryGroup, payee, rule, schedule)
  - Add common use cases section
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.1 Add category entity documentation
  - Document data structure: {name, group_id, is_income}
  - Add create example with all required fields
  - Add update example
  - _Requirements: 2.1, 2.4_

- [x] 1.2 Add categoryGroup entity documentation
  - Document data structure: {name, is_income}
  - Add create example
  - Add update example
  - _Requirements: 2.1, 2.4_

- [x] 1.3 Add payee entity documentation
  - Document data structure: {name, category, transfer_acct}
  - Add create example
  - Add update example
  - _Requirements: 2.1, 2.4_

- [x] 1.4 Add rule entity documentation
  - Document data structure: {conditions, actions, stage}
  - Add create example with conditions and actions arrays
  - Explain rule structure
  - _Requirements: 2.1, 2.4_

- [x] 1.5 Add schedule entity documentation
  - Document data structure: {name, account, amount, date, frequency}
  - Add create example with frequency
  - Explain recurring transaction setup
  - _Requirements: 2.1, 2.4_

- [x] 2. Update manage-transaction tool
  - Update tool description with all three operations
  - Add create operation example with all fields
  - Add update operation example
  - Keep existing delete example
  - Add amount format clarification (cents)
  - Add common use cases section
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Update manage-account tool
  - Reformat description with clear section breaks
  - Document all 6 operations separately (create, update, delete, close, reopen, balance)
  - Add account type descriptions
  - Add common use cases section
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Test critical tools with MCP client
  - Test manage-entity with all entity types
  - Test manage-transaction create/update/delete
  - Test manage-account all operations
  - Document any agent confusion
  - Iterate on descriptions if needed
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Phase 2: High Priority Query & Budget Tools (Priority 🟡)

- [x] 5. Update get-transactions tool
  - Add comprehensive description with all filter parameters
  - Add examples for single filters
  - Add examples for combined filters
  - Add common use cases section
  - Update input schema descriptions for all parameters
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3, 5.4, 5.5_

- [x] 6. Update get-accounts tool
  - Add description of returned data structure
  - Add examples for all parameter combinations
  - Add common use cases section
  - Explain relationship to other tools (workflow guidance)
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.4, 5.5_

- [x] 7. Update set-budget tool
  - Add examples for amount only, carryover only, and both
  - Add amount format clarification (cents)
  - Add month format clarification (YYYY-MM)
  - Add common use cases section
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Add input schema descriptions to all tools
  - Review all 22 tools for missing input schema descriptions
  - Add descriptions to all properties
  - Include format requirements, constraints, and examples
  - Document default values where applicable
  - Clarify required vs optional parameters
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.1 Update budget operation tools schemas
  - hold-budget-for-next-month
  - reset-budget-hold
  - get-budget-months
  - get-budget-month
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.2 Update category and payee tools schemas
  - get-grouped-categories
  - get-payees
  - get-payee-rules
  - merge-payees
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.3 Update rule and schedule tools schemas
  - get-rules
  - get-schedules
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.4 Update utility tools schemas
  - run-bank-sync
  - run-import
  - run-query
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Test high priority tools with MCP client
  - Test get-transactions with various filters
  - Test get-accounts workflow (get ID, then use in other tools)
  - Test set-budget with different parameter combinations
  - Verify input schema descriptions are helpful
  - Document any remaining confusion
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Phase 3: Medium Priority Analysis Tools (Priority 🟢)

- [x] 10. Update monthly-summary tool
  - Add description of optional parameters
  - Add description of returned data structure
  - Add examples for different month ranges
  - Add common use cases section
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.3, 7.4, 7.5_

- [x] 11. Update spending-by-category tool
  - Add description of filter options
  - Add description of returned breakdown structure
  - Add examples for different scenarios
  - Add common use cases section
  - Update input schema descriptions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Add workflow hints and cross-references
  - Add "See also" references between related tools
  - Document typical workflow order
  - Add prerequisite tool references
  - Add workflow examples in tool descriptions
  - _Requirements: 4.2, 4.3, 4.4, 8.3_

- [x] 13. Add error prevention guidance
  - Add warnings for destructive operations
  - Add format requirement warnings
  - Add workflow dependency notes
  - Add "NOTES" sections with tips and caveats
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Test analysis tools and workflows
  - Test monthly-summary with different parameters
  - Test spending-by-category with filters
  - Test complete workflows (e.g., get accounts → get transactions → analyze)
  - Verify workflow hints are helpful
  - Document any issues
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Phase 4: Low Priority Simple Tools & Documentation (Priority 🔵)

- [x] 15. Update simple getter tool descriptions
  - Add basic examples to all getter tools
  - Document returned data structures
  - Add workflow role notes
  - Maintain consistency with complex tools
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15.1 Update get-grouped-categories
  - Add example
  - Document returned structure
  - _Requirements: 10.1, 10.2_

- [x] 15.2 Update get-payees
  - Add example
  - Document returned structure
  - _Requirements: 10.1, 10.2_

- [x] 15.3 Update get-rules
  - Add example
  - Document returned structure
  - Note about amount format (cents)
  - _Requirements: 10.1, 10.2_

- [x] 15.4 Update get-schedules
  - Add example
  - Document returned structure
  - _Requirements: 10.1, 10.2_

- [x] 15.5 Update budget getter tools
  - get-budget-months
  - get-budget-month
  - _Requirements: 10.1, 10.2_

- [x] 15.6 Update utility tools
  - merge-payees
  - get-payee-rules
  - run-bank-sync
  - run-import
  - run-query
  - _Requirements: 10.1, 10.2_

- [x] 16. Create tool usage guide documentation
  - Create comprehensive workflow examples
  - Document common patterns
  - Add troubleshooting guide
  - Create quick reference guide
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 17. Create description template documentation
  - Document the standard template
  - Create examples for each tool type
  - Add to developer documentation
  - Create PR checklist for new tools
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 18. Final testing and validation
  - Test all updated tools with MCP client
  - Measure success metrics (retry rate, success rate)
  - Gather user feedback
  - Document lessons learned
  - Create improvement backlog
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Quality Assurance Tasks

- [x] 19. Verify description formatting
  - All descriptions follow template structure
  - All sections use consistent formatting
  - All examples are valid JSON
  - All newlines are properly escaped
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 20. Verify input schema completeness
  - All properties have descriptions
  - All descriptions include format/constraints
  - All required fields are documented
  - All default values are documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 21. Verify example accuracy
  - All examples are syntactically valid JSON
  - All examples match the input schema
  - All examples demonstrate realistic use cases
  - All examples include required fields
  - _Requirements: 1.5, 2.1, 2.2, 2.3_

- [x] 22. Run automated tests
  - Verify all tool schemas are valid
  - Verify all descriptions are non-empty
  - Verify all input schemas have property descriptions
  - Run existing unit tests
  - Run integration tests
  - _Requirements: 11.1, 11.2, 11.3_

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All 3 critical tools have comprehensive descriptions
- ✅ All 3 critical tools have input schema descriptions
- ✅ Testing shows agents can use tools without guidance
- ✅ No critical issues found in testing

### Phase 2 Complete When:
- ✅ All high priority tools have comprehensive descriptions
- ✅ All 22 tools have input schema descriptions
- ✅ Testing shows improved success rates
- ✅ Workflow scenarios work smoothly

### Phase 3 Complete When:
- ✅ Analysis tools have comprehensive descriptions
- ✅ Workflow hints are in place
- ✅ Error prevention guidance is added
- ✅ Complex workflows test successfully

### Phase 4 Complete When:
- ✅ All simple tools have basic documentation
- ✅ Tool usage guide is created
- ✅ Template documentation is complete
- ✅ Final testing shows 50-70% improvement

### Overall Success Metrics:
- 📊 50-70% reduction in agent confusion
- 📊 30-50% fewer failed tool calls
- 📊 80%+ first-try success rate for common tasks
- 📊 Positive user feedback on agent behavior

---

## Estimated Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | Tasks 1-4 | 2-3 hours | 🔴 Critical |
| Phase 2 | Tasks 5-9 | 2-3 hours | 🟡 High |
| Phase 3 | Tasks 10-14 | 2-3 hours | 🟢 Medium |
| Phase 4 | Tasks 15-18 | 2-3 hours | 🔵 Low |
| QA | Tasks 19-22 | 1 hour | 🟡 High |
| **Total** | **22 tasks** | **9-13 hours** | - |

---

## Notes

- Focus on one phase at a time
- Test after each phase before moving to next
- Iterate on descriptions based on testing feedback
- Maintain consistency across all tools
- Document any issues or improvements for future work
