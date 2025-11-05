# New Tool PR Checklist

Use this checklist when creating or updating MCP tools to ensure high quality and discoverability.

## Code Implementation

### Tool Structure
- [ ] Tool follows modular pattern (index.ts, input-parser.ts, data-fetcher.ts, report-generator.ts, types.ts)
- [ ] Tool is registered in `src/tools/index.ts`
- [ ] Tool exports a valid MCP schema with name, description, and inputSchema
- [ ] Tool handler function is properly typed
- [ ] Error handling is implemented for all failure cases

### Type Safety
- [ ] All function parameters have explicit type annotations
- [ ] All function return types are explicitly declared
- [ ] TypeScript strict mode passes without errors
- [ ] No use of `any` type (use `unknown` if needed)
- [ ] Input validation uses proper type guards

## Description Quality

### One-Line Summary
- [ ] Starts with clear, concise summary (1-2 sentences)
- [ ] States what the tool does and its primary purpose
- [ ] Ends with `\n\n` for proper spacing

### Operations/Parameters Section
- [ ] Multi-operation tools document each operation separately
- [ ] Each operation lists required and optional parameters
- [ ] Each operation includes a complete example
- [ ] Single-operation tools clearly separate required vs optional parameters
- [ ] Parameter descriptions include format requirements

### Examples Section
- [ ] Includes 2-4 realistic examples
- [ ] All examples are valid JSON
- [ ] Examples are on single lines (no multi-line formatting)
- [ ] Examples cover different parameter combinations
- [ ] Examples demonstrate common scenarios

### Common Use Cases Section
- [ ] Lists 3-5 typical scenarios
- [ ] Uses concrete, specific examples (not abstract)
- [ ] Helps agents understand when to use the tool
- [ ] Covers the most frequent use patterns

### Notes Section (if applicable)
- [ ] Includes warnings for destructive operations
- [ ] Clarifies format requirements (dates, amounts, etc.)
- [ ] Notes workflow dependencies
- [ ] Includes tips and caveats
- [ ] References related tools when appropriate

### Formatting
- [ ] Uses consistent section headers (OPERATIONS, EXAMPLES, COMMON USE CASES, NOTES)
- [ ] Uses `\n\n` to separate sections
- [ ] Uses bullet points (`•` or `-`) for lists
- [ ] All JSON examples are properly formatted
- [ ] No trailing spaces or inconsistent indentation

## Input Schema Quality

### Property Descriptions
- [ ] Every property has a description
- [ ] Descriptions explain what the parameter is
- [ ] Descriptions include format requirements (YYYY-MM-DD, cents, etc.)
- [ ] Descriptions include constraints (min/max, allowed values, patterns)
- [ ] Descriptions include examples of valid values
- [ ] Descriptions reference related tools when IDs are needed

### Schema Structure
- [ ] Required parameters are in the `required` array
- [ ] Optional parameters are clearly documented as optional
- [ ] Default values are documented in descriptions
- [ ] Enum values are used for fixed choices
- [ ] Type definitions match actual usage

### Cross-References
- [ ] References prerequisite tools (e.g., "Use get-accounts to find account IDs")
- [ ] Notes relationships to other tools
- [ ] Explains workflow dependencies
- [ ] Clarifies when to use this tool vs alternatives

## Testing

### Unit Tests
- [ ] Tool has comprehensive unit tests
- [ ] Tests cover happy path (expected use)
- [ ] Tests cover edge cases (boundary conditions)
- [ ] Tests cover error cases (invalid input, API failures)
- [ ] Tests mock external dependencies (actual-api, etc.)
- [ ] All tests pass (`npm run test`)

### Integration Tests
- [ ] Tool works with real Actual Budget API (if applicable)
- [ ] Tool handles name resolution correctly
- [ ] Tool returns expected data structure
- [ ] Tool handles errors gracefully

### Manual Testing
- [ ] Tested with MCP client (Claude Desktop, Cline, etc.)
- [ ] Agent can understand tool purpose from description
- [ ] Agent chooses correct tool for common tasks
- [ ] Agent provides correct parameter formats
- [ ] Agent understands when to use this tool vs others

## Code Quality

### Linting & Formatting
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] Code is formatted with Prettier (`npm run format`)
- [ ] TypeScript type checking passes (`npm run type-check`)
- [ ] All quality checks pass (`npm run quality`)

### Code Style
- [ ] Follows existing code patterns in the project
- [ ] Uses clear, descriptive variable names
- [ ] Functions are focused and single-purpose
- [ ] No files exceed 500 lines
- [ ] Complex logic has explanatory comments

### Performance
- [ ] No unnecessary API calls
- [ ] Efficient data processing
- [ ] Proper error handling doesn't impact performance
- [ ] No memory leaks or resource issues

## Documentation

### Code Documentation
- [ ] Complex functions have JSDoc comments
- [ ] Type definitions are documented
- [ ] Non-obvious logic has inline comments
- [ ] Public APIs are well-documented

### User Documentation
- [ ] Tool is listed in TOOL-USAGE-GUIDE.md (if significant)
- [ ] README.md is updated if needed
- [ ] CHANGELOG.md includes entry for new tool
- [ ] Migration guide updated if tool replaces existing functionality

## Consistency

### Template Compliance
- [ ] Follows TOOL-DESCRIPTION-TEMPLATE.md structure
- [ ] Uses same section headers as other tools
- [ ] Matches formatting style of existing tools
- [ ] Consistent terminology across description and schema

### Naming Conventions
- [ ] Tool name follows kebab-case convention
- [ ] Tool name is descriptive and clear
- [ ] Parameter names are consistent with other tools
- [ ] Type names follow project conventions

## Accessibility

### Name Resolution
- [ ] Accepts both names and IDs where applicable
- [ ] Name matching is case-insensitive
- [ ] Partial name matching works where appropriate
- [ ] Clear error messages when names/IDs not found

### Error Messages
- [ ] Error messages are clear and actionable
- [ ] Error messages suggest solutions
- [ ] Error messages reference related tools when helpful
- [ ] Error messages include relevant context

## Final Checks

### Before Submitting PR
- [ ] All checklist items above are completed
- [ ] Code has been peer-reviewed
- [ ] All tests pass locally
- [ ] No console.log or debug code left in
- [ ] Git commit messages are clear and descriptive

### PR Description
- [ ] Explains what the tool does
- [ ] Lists key features and capabilities
- [ ] Notes any breaking changes
- [ ] Includes testing notes
- [ ] References related issues/PRs

### Post-Merge
- [ ] Monitor for issues in production
- [ ] Gather user feedback
- [ ] Update documentation based on feedback
- [ ] Plan improvements for future iterations

## Tool-Specific Considerations

### Management Tools (CRUD operations)
- [ ] All operations (create, update, delete) are documented
- [ ] Destructive operations have clear warnings
- [ ] Data structure requirements are explicit
- [ ] Examples show all operation types

### Query Tools (data retrieval)
- [ ] All filter parameters are documented
- [ ] Default behaviors are clear
- [ ] Return data structure is described
- [ ] Examples show different filter combinations

### Analysis Tools (aggregation/reporting)
- [ ] Date range parameters are clear
- [ ] Optional filters are documented
- [ ] Return data structure is described
- [ ] Examples show typical analysis scenarios

### Configuration Tools (settings)
- [ ] All configuration options are documented
- [ ] Default values are clear
- [ ] Impact of changes is explained
- [ ] Examples show different configurations

## Resources

- **Template Guide**: `docs/TOOL-DESCRIPTION-TEMPLATE.md`
- **Tool Usage Guide**: `docs/TOOL-USAGE-GUIDE.md`
- **Design Document**: `.kiro/specs/tool-discoverability-improvements/design.md`
- **Requirements**: `.kiro/specs/tool-discoverability-improvements/requirements.md`

## Questions?

If you're unsure about any checklist item:
1. Review existing tools for examples
2. Check the template documentation
3. Ask for peer review
4. Test with an MCP client

Remember: Quality tool descriptions improve the experience for all users. Take the time to get it right!
