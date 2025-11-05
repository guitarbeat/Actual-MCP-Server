# High Priority Tools Testing Guide

## Overview

This document provides a comprehensive testing guide for the high priority MCP tools: `get-transactions`, `get-accounts`, and `set-budget`. These tests validate that tool descriptions are clear, input schemas are helpful, and workflows function as documented.

## Testing Environment Setup

### Prerequisites

1. **Actual Budget Server**: Running instance with test data
2. **MCP Client**: Claude Desktop, Cline, or similar MCP-compatible client
3. **Test Data**: Budget with accounts, transactions, and categories

### Configuration

Ensure your `.env` file is configured:
```
ACTUAL_SERVER_URL=http://localhost:5006
ACTUAL_PASSWORD=your-password
ACTUAL_SYNC_ID=your-sync-id
ACTUAL_FILE_PASSWORD=your-file-password (optional)
```

## Test Scenarios

### 1. get-accounts Tool Tests

#### Test 1.1: List All Accounts (No Parameters)
**Purpose**: Verify default behavior returns all open accounts

**Test Input**:
```json
{}
```

**Expected Behavior**:
- Returns all open accounts
- Includes account IDs, names, balances, types
- Excludes closed accounts by default
- Balance shown in cents

**Validation Points**:
- ✅ Description clearly states this is the default behavior
- ✅ Returned data structure matches documentation
- ✅ Account IDs are valid UUIDs
- ✅ All documented fields are present

#### Test 1.2: Filter by Account Name
**Purpose**: Verify partial name matching works

**Test Input**:
```json
{"accountId": "Checking"}
```

**Expected Behavior**:
- Returns accounts matching "Checking"
- Supports partial matching (e.g., "Check" finds "Checking Account")
- Case-sensitive matching

**Validation Points**:
- ✅ Description explains partial matching
- ✅ Examples show this use case
- ✅ Input schema describes the accountId parameter clearly

#### Test 1.3: Include Closed Accounts
**Purpose**: Verify closed accounts can be included

**Test Input**:
```json
{"includeClosed": true}
```

**Expected Behavior**:
- Returns both open and closed accounts
- Closed accounts are flagged in response

**Validation Points**:
- ✅ Description explains default excludes closed accounts
- ✅ Parameter description is clear
- ✅ Use case for finding closed accounts is documented

#### Test 1.4: Combined Filters
**Purpose**: Verify multiple parameters work together

**Test Input**:
```json
{"accountId": "Savings", "includeClosed": true}
```

**Expected Behavior**:
- Returns savings accounts including closed ones
- Filters applied cumulatively

**Validation Points**:
- ✅ Description shows example of combined usage
- ✅ Behavior is intuitive based on documentation

---

### 2. get-transactions Tool Tests

#### Test 2.1: Basic Query (Account Only)
**Purpose**: Verify default date range behavior

**Test Input**:
```json
{"accountId": "Checking"}
```

**Expected Behavior**:
- Returns last 30 days of transactions
- Uses default date range when not specified

**Validation Points**:
- ✅ Description clearly states 30-day default
- ✅ Notes section explains default behavior
- ✅ Common use case documented

#### Test 2.2: Date Range Filter
**Purpose**: Verify custom date ranges work

**Test Input**:
```json
{
  "accountId": "Checking",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Expected Behavior**:
- Returns transactions in January 2024
- Date format YYYY-MM-DD accepted

**Validation Points**:
- ✅ Date format documented in description
- ✅ Input schema describes format requirement
- ✅ Example shows this use case

#### Test 2.3: Minimum Amount Filter
**Purpose**: Verify amount filtering works

**Test Input**:
```json
{
  "accountId": "Checking",
  "minAmount": 100
}
```

**Expected Behavior**:
- Returns transactions >= $100.00
- Amount in dollars (not cents) for filter

**Validation Points**:
- ✅ Description clarifies amount unit (dollars for filter, cents in response)
- ✅ Example shows this use case
- ✅ Notes section explains the difference

#### Test 2.4: Amount Range Filter
**Purpose**: Verify min and max amount work together

**Test Input**:
```json
{
  "accountId": "Checking",
  "minAmount": 20,
  "maxAmount": 100
}
```

**Expected Behavior**:
- Returns transactions between $20 and $100
- Both filters applied (AND logic)

**Validation Points**:
- ✅ Description shows combined filter example
- ✅ Notes explain cumulative filtering

#### Test 2.5: Payee Name Filter
**Purpose**: Verify text-based payee filtering

**Test Input**:
```json
{
  "accountId": "Checking",
  "payeeName": "Amazon"
}
```

**Expected Behavior**:
- Returns transactions with "Amazon" in payee name
- Partial matching, case-insensitive

**Validation Points**:
- ✅ Description explains partial matching
- ✅ Example shows merchant tracking use case
- ✅ Input schema describes matching behavior

#### Test 2.6: Category Name Filter
**Purpose**: Verify category filtering works

**Test Input**:
```json
{
  "accountId": "Checking",
  "categoryName": "Groceries"
}
```

**Expected Behavior**:
- Returns transactions in Groceries category
- Partial matching, case-insensitive

**Validation Points**:
- ✅ Description shows category analysis use case
- ✅ Example demonstrates this filter

#### Test 2.7: Combined Filters (Multiple)
**Purpose**: Verify complex filter combinations

**Test Input**:
```json
{
  "accountId": "Checking",
  "categoryName": "Dining",
  "minAmount": 20,
  "maxAmount": 100,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Expected Behavior**:
- All filters applied cumulatively
- Returns dining transactions $20-$100 in 2024

**Validation Points**:
- ✅ Description shows combined filter example
- ✅ Notes explain AND logic for filters
- ✅ Common use case for expense auditing documented

#### Test 2.8: Limit Parameter
**Purpose**: Verify result limiting works

**Test Input**:
```json
{
  "accountId": "Checking",
  "limit": 10
}
```

**Expected Behavior**:
- Returns maximum 10 transactions
- Most recent transactions first

**Validation Points**:
- ✅ Input schema describes limit parameter
- ✅ Behavior is intuitive

#### Test 2.9: All Filters Combined
**Purpose**: Verify all parameters work together

**Test Input**:
```json
{
  "accountId": "Checking",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "minAmount": 10,
  "maxAmount": 200,
  "categoryName": "Food",
  "payeeName": "Store",
  "limit": 5
}
```

**Expected Behavior**:
- All filters applied successfully
- Returns up to 5 matching transactions

**Validation Points**:
- ✅ Description supports complex queries
- ✅ All parameters documented

---

### 3. set-budget Tool Tests

#### Test 3.1: Set Amount Only
**Purpose**: Verify setting budget amount works

**Test Input**:
```json
{
  "month": "2024-01",
  "category": "Groceries",
  "amount": 50000
}
```

**Expected Behavior**:
- Sets budget to $500.00 for January 2024
- Amount in cents (50000 = $500.00)

**Validation Points**:
- ✅ Description shows amount-only example
- ✅ Input schema explains cents format
- ✅ Common use case documented

#### Test 3.2: Set Carryover Only
**Purpose**: Verify setting carryover works independently

**Test Input**:
```json
{
  "month": "2024-01",
  "category": "Groceries",
  "carryover": true
}
```

**Expected Behavior**:
- Enables budget carryover
- Amount unchanged

**Validation Points**:
- ✅ Description shows carryover-only example
- ✅ Input schema explains carryover behavior
- ✅ Use case for enabling rollover documented

#### Test 3.3: Set Both Amount and Carryover
**Purpose**: Verify both parameters work together

**Test Input**:
```json
{
  "month": "2024-01",
  "category": "Groceries",
  "amount": 30000,
  "carryover": false
}
```

**Expected Behavior**:
- Sets amount to $300.00
- Disables carryover

**Validation Points**:
- ✅ Description shows combined example
- ✅ Notes explain both can be set together

#### Test 3.4: Different Month Format
**Purpose**: Verify month format validation

**Test Input**:
```json
{
  "month": "2024-12",
  "category": "Groceries",
  "amount": 75000
}
```

**Expected Behavior**:
- Sets budget for December 2024
- YYYY-MM format accepted

**Validation Points**:
- ✅ Input schema specifies format requirement
- ✅ Examples show correct format

#### Test 3.5: Error - Missing Both Parameters
**Purpose**: Verify validation catches missing required data

**Test Input**:
```json
{
  "month": "2024-01",
  "category": "Groceries"
}
```

**Expected Behavior**:
- Returns validation error
- Error message explains at least one of amount/carryover required

**Validation Points**:
- ✅ Description states "at least one" requirement
- ✅ Error handling provides clear feedback

#### Test 3.6: Error - Invalid Month Format
**Purpose**: Verify format validation works

**Test Input**:
```json
{
  "month": "01/2024",
  "category": "Groceries",
  "amount": 50000
}
```

**Expected Behavior**:
- Returns validation error
- Error message explains correct format

**Validation Points**:
- ✅ Input schema specifies YYYY-MM format
- ✅ Notes section clarifies format requirement

---

### 4. Workflow Tests

#### Workflow 4.1: Get Account ID → Use in get-transactions
**Purpose**: Verify the documented workflow works smoothly

**Steps**:
1. Call `get-accounts` with no parameters
2. Extract an account ID from response
3. Use that ID in `get-transactions`

**Expected Behavior**:
- Account ID from step 1 works in step 3
- Workflow is intuitive based on descriptions

**Validation Points**:
- ✅ get-accounts description mentions this workflow
- ✅ get-transactions description references get-accounts
- ✅ Workflow guidance section is helpful

#### Workflow 4.2: Find Account by Name → Query with Filters
**Purpose**: Verify name resolution works in workflows

**Steps**:
1. Call `get-accounts` with `{"accountId": "Checking"}`
2. Verify account found
3. Call `get-transactions` with `{"accountId": "Checking", "minAmount": 50}`

**Expected Behavior**:
- Account name works in both tools
- No need to extract ID for simple cases

**Validation Points**:
- ✅ Both tools document name/ID acceptance
- ✅ Workflow is seamless

#### Workflow 4.3: Complex Transaction Analysis
**Purpose**: Verify complex queries work as documented

**Steps**:
1. Get account ID
2. Query transactions with multiple filters
3. Analyze results

**Expected Behavior**:
- All filters work together
- Results match expectations

**Validation Points**:
- ✅ Common use cases cover this scenario
- ✅ Examples show complex queries

---

## Evaluation Criteria

### Description Quality
- [ ] All operations clearly explained
- [ ] Examples are accurate and helpful
- [ ] Common use cases are relevant
- [ ] Notes section addresses important details
- [ ] Format requirements are explicit

### Input Schema Quality
- [ ] All parameters have descriptions
- [ ] Format requirements documented
- [ ] Constraints explained
- [ ] Default values stated
- [ ] Required vs optional is clear

### Workflow Guidance
- [ ] Tool relationships documented
- [ ] Prerequisite tools referenced
- [ ] Typical workflows explained
- [ ] Cross-references are helpful

### Error Handling
- [ ] Validation errors are clear
- [ ] Error messages are helpful
- [ ] Common mistakes addressed
- [ ] Recovery guidance provided

### Agent Discoverability
- [ ] Agent can choose correct tool without guidance
- [ ] Agent provides correct parameter formats
- [ ] Agent understands filter combinations
- [ ] Agent follows documented workflows

---

## Success Metrics

### Quantitative Metrics
- **First-try success rate**: Target 80%+ for common tasks
- **Retry attempts**: Reduced by 50-70%
- **Failed tool calls**: Reduced by 30-50%
- **Conversation length**: Shorter for typical workflows

### Qualitative Metrics
- Agent chooses correct tool without user guidance
- Agent provides correct parameter formats on first try
- Agent understands workflow dependencies
- Users report improved experience

---

## Testing Observations Template

Use this template to document testing observations:

```markdown
## Testing Session: [Date]

### Tool: [Tool Name]

#### Test Case: [Test Name]
- **Input**: [JSON input]
- **Expected**: [Expected behavior]
- **Actual**: [What happened]
- **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes**: [Observations about description clarity, agent behavior, etc.]

#### Agent Behavior Observations
- Did the agent choose the correct tool? Yes/No
- Did the agent provide correct parameters? Yes/No
- Did the agent understand the workflow? Yes/No
- Any confusion or retry attempts? Describe

#### Description Quality Assessment
- Were examples helpful? Yes/No
- Were parameter descriptions clear? Yes/No
- Were common use cases relevant? Yes/No
- Any missing information? Describe

#### Recommendations
- [Any improvements to descriptions]
- [Any missing examples]
- [Any workflow guidance needed]
```

---

## Automated Testing Script

A TypeScript testing script is available at `scripts/test-high-priority-tools.ts` that can be run against a live Actual Budget instance:

```bash
# Ensure Actual Budget server is running
# Configure .env file with connection details

# Run the test script
npx tsx scripts/test-high-priority-tools.ts
```

The script tests:
- All parameter combinations for each tool
- Workflow scenarios
- Error handling
- Input validation

---

## Next Steps

After completing these tests:

1. **Document Results**: Record observations in `testing-results.md`
2. **Identify Issues**: Note any confusion or unclear descriptions
3. **Iterate**: Update tool descriptions based on findings
4. **Retest**: Verify improvements with another testing round
5. **Move to Phase 3**: Proceed to medium priority tools once satisfied

---

## References

- Requirements: `.kiro/specs/tool-discoverability-improvements/requirements.md`
- Design: `.kiro/specs/tool-discoverability-improvements/design.md`
- Tasks: `.kiro/specs/tool-discoverability-improvements/tasks.md`
- Tool Implementations:
  - `src/tools/get-accounts/index.ts`
  - `src/tools/get-transactions/index.ts`
  - `src/tools/set-budget/index.ts`
