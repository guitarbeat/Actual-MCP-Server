# Tool Discoverability Improvements Design

## Overview

This design addresses the poor discoverability of MCP tools by implementing comprehensive tool descriptions with examples, parameter documentation, use case guidance, and error prevention tips. The goal is to reduce AI agent confusion by 50-70% and improve first-try success rates for common tasks.

## Current State Analysis

### Existing Tool Structure

**Strengths:**
- ✅ Excellent tool consolidation (manage-transaction, manage-account, manage-entity)
- ✅ Consistent naming conventions
- ✅ Name resolution (accepts names or IDs)
- ✅ 22 focused tools with clear separation of concerns

**Weaknesses:**
- ❌ Minimal descriptions (most are 1-line)
- ❌ No usage examples in descriptions
- ❌ Missing parameter documentation in input schemas
- ❌ No workflow guidance or use case examples
- ❌ No error prevention tips

### Impact on Remote MCP Usage

Current issues cause:
- Agents struggle to choose the right tool
- More failed attempts and retries
- Longer conversation chains
- Users must manually guide agents

## Architecture Design

### Description Template Structure

All tool descriptions will follow this standardized template:

```typescript
export const schema = {
  name: 'tool-name',
  description:
    'Brief one-line summary.\n\n' +
    
    'OPERATIONS:\n' +  // For multi-operation tools
    '• OPERATION_NAME: Description\n' +
    '  Required: param1, param2\n' +
    '  Optional: param3\n' +
    '  Example: {JSON example}\n\n' +
    
    'REQUIRED PARAMETERS:\n' +  // For single-operation tools
    '- param1: Description with format\n' +
    '- param2: Description with constraints\n\n' +
    
    'OPTIONAL PARAMETERS:\n' +
    '- param3: Description with defaults\n\n' +
    
    'EXAMPLES:\n' +
    '- Use case 1: {JSON example}\n' +
    '- Use case 2: {JSON example}\n\n' +
    
    'COMMON USE CASES:\n' +
    '- Scenario 1: Brief description\n' +
    '- Scenario 2: Brief description\n\n' +
    
    'NOTES:\n' +  // Optional section
    '- Important detail 1\n' +
    '- Important detail 2',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Detailed description with format, constraints, examples'
      }
    },
    required: ['param1']
  }
};
```

### Tool Categorization

Tools are categorized by priority for implementation:

#### 🔴 Critical Priority (3 tools)
1. **manage-entity** - Most complex, no current guidance
2. **manage-transaction** - Most frequently used
3. **manage-account** - Core functionality

#### 🟡 High Priority (4 tools)
4. **get-transactions** - Frequently used query tool
5. **get-accounts** - Gateway tool for IDs
6. **set-budget** - Core budgeting functionality
7. Input schema descriptions for all tools

#### 🟢 Medium Priority (3 tools)
8. **monthly-summary** - Analysis tool
9. **spending-by-category** - Analysis tool
10. Workflow hints and cross-references

#### 🔵 Low Priority (13 tools)
11. Simple getter tools (get-payees, get-rules, etc.)
12. Utility tools (merge-payees, run-bank-sync, etc.)
13. Tool usage guide documentation

## Detailed Design

### 1. Critical Tool: manage-entity

**Current State:**
```typescript
description: 'Create, update, or delete entities (categories, category groups, payees, rules, schedules). This consolidated tool replaces individual CRUD tools for better efficiency.'
```

**New Design:**
```typescript
description:
  'Create, update, or delete budget entities: categories, category groups, payees, rules, and schedules.\n\n' +
  
  'ENTITY TYPES & DATA STRUCTURES:\n\n' +
  
  '• CATEGORY\n' +
  '  Create/Update data: {name: string, group_id: string, is_income?: boolean}\n' +
  '  Example: {"entityType": "category", "operation": "create", "data": {"name": "Groceries", "group_id": "food-group-id"}}\n\n' +
  
  '• CATEGORY GROUP\n' +
  '  Create/Update data: {name: string, is_income?: boolean}\n' +
  '  Example: {"entityType": "categoryGroup", "operation": "create", "data": {"name": "Food & Dining", "is_income": false}}\n\n' +
  
  '• PAYEE\n' +
  '  Create/Update data: {name: string, category?: string, transfer_acct?: string}\n' +
  '  Example: {"entityType": "payee", "operation": "create", "data": {"name": "Whole Foods", "category": "groceries-id"}}\n\n' +
  
  '• RULE\n' +
  '  Create/Update data: {conditions: array, actions: array, stage?: string}\n' +
  '  Example: {"entityType": "rule", "operation": "create", "data": {"conditions": [{"field": "payee", "op": "is", "value": "payee-id"}], "actions": [{"field": "category", "value": "category-id"}]}}\n\n' +
  
  '• SCHEDULE\n' +
  '  Create/Update data: {name: string, account: string, amount: number, date: string, frequency: string}\n' +
  '  Example: {"entityType": "schedule", "operation": "create", "data": {"name": "Rent", "account": "checking-id", "amount": -150000, "date": "2024-01-01", "frequency": "monthly"}}\n\n' +
  
  'OPERATIONS:\n' +
  '- CREATE: Requires entityType, operation="create", data\n' +
  '- UPDATE: Requires entityType, operation="update", id, data\n' +
  '- DELETE: Requires entityType, operation="delete", id (WARNING: Permanent!)\n\n' +
  
  'COMMON USE CASES:\n' +
  '- Creating a new category: entityType=category, operation=create\n' +
  '- Renaming a payee: entityType=payee, operation=update with id and new name\n' +
  '- Setting up auto-categorization: entityType=rule, operation=create with conditions and actions\n' +
  '- Scheduling recurring transaction: entityType=schedule, operation=create with frequency'
```

**Input Schema Enhancement:**
```typescript
inputSchema: {
  type: 'object',
  properties: {
    entityType: {
      type: 'string',
      enum: ['category', 'categoryGroup', 'payee', 'rule', 'schedule'],
      description: 'Type of entity to manage. Each type has different data structure requirements.'
    },
    operation: {
      type: 'string',
      enum: ['create', 'update', 'delete'],
      description: 'Operation to perform. Create and update require data object, delete requires id.'
    },
    id: {
      type: 'string',
      description: 'Entity ID (required for update and delete operations). Must be a valid UUID. Use get-* tools to find IDs.'
    },
    data: {
      type: 'object',
      description: 'Entity-specific data (required for create and update). Structure depends on entityType. See description for examples.'
    }
  },
  required: ['entityType', 'operation']
}
```

### 2. Critical Tool: manage-transaction

**Current State:**
```typescript
description:
  'Create, update, or delete transactions. Accepts account, payee, and category names or IDs. ' +
  'For create: account and date are required. ' +
  'For update: id is required. ' +
  'For delete: only id is required. ' +
  'WARNING: Delete is permanent and cannot be undone. ' +
  'Example delete: {"operation": "delete", "id": "abc123-def456-ghi789"}'
```

**New Design:**
```typescript
description:
  'Create, update, or delete transactions in Actual Budget. Supports name or ID resolution for accounts, payees, and categories.\n\n' +
  
  'OPERATIONS:\n\n' +
  
  '• CREATE: Add a new transaction\n' +
  '  Required: account, date, amount\n' +
  '  Optional: payee, category, notes, cleared\n' +
  '  Example: {"operation": "create", "transaction": {"account": "Checking", "date": "2024-01-15", "amount": -5000, "payee": "Grocery Store", "category": "Groceries", "notes": "Weekly shopping"}}\n\n' +
  
  '• UPDATE: Modify an existing transaction\n' +
  '  Required: id\n' +
  '  Optional: any transaction fields\n' +
  '  Example: {"operation": "update", "id": "abc123", "transaction": {"amount": -5500, "notes": "Updated amount"}}\n\n' +
  
  '• DELETE: Permanently remove a transaction\n' +
  '  Required: id\n' +
  '  WARNING: Cannot be undone!\n' +
  '  Example: {"operation": "delete", "id": "abc123"}\n\n' +
  
  'NOTES:\n' +
  '- Amounts are in cents (e.g., -5000 = -$50.00). Negative for expenses, positive for income.\n' +
  '- Accepts names or IDs for account, payee, and category fields.\n' +
  '- Date format: YYYY-MM-DD\n\n' +
  
  'COMMON USE CASES:\n' +
  '- Recording a purchase: operation=create with account, date, amount, payee, category\n' +
  '- Fixing a typo: operation=update with id and corrected fields\n' +
  '- Removing duplicate: operation=delete with id'
```

### 3. Critical Tool: manage-account

**Current State:** Wall of text with all operations concatenated

**New Design:**
```typescript
description:
  'Manage accounts in Actual Budget. Create, update, delete, close, reopen accounts, or query balances.\n\n' +
  
  'OPERATIONS:\n\n' +
  
  '• CREATE: Add a new account\n' +
  '  Required: account.name, account.type\n' +
  '  Optional: initialBalance (cents), account.offbudget\n' +
  '  Example: {"operation": "create", "account": {"name": "Chase Checking", "type": "checking"}, "initialBalance": 100000}\n\n' +
  
  '• UPDATE: Modify account properties\n' +
  '  Required: id\n' +
  '  Optional: account.name, account.type, account.offbudget\n' +
  '  Example: {"operation": "update", "id": "abc123", "account": {"name": "Chase Freedom"}}\n\n' +
  
  '• DELETE: Permanently remove an account (WARNING: Cannot be undone!)\n' +
  '  Required: id\n' +
  '  Example: {"operation": "delete", "id": "abc123"}\n\n' +
  
  '• CLOSE: Close an account (keeps history)\n' +
  '  Required: id\n' +
  '  Optional: transferAccountId (required if balance ≠ 0), transferCategoryId\n' +
  '  Example: {"operation": "close", "id": "abc123", "transferAccountId": "def456", "transferCategoryId": "ghi789"}\n\n' +
  
  '• REOPEN: Reactivate a closed account\n' +
  '  Required: id\n' +
  '  Example: {"operation": "reopen", "id": "abc123"}\n\n' +
  
  '• BALANCE: Query account balance\n' +
  '  Required: id\n' +
  '  Optional: date (YYYY-MM-DD, defaults to today)\n' +
  '  Example: {"operation": "balance", "id": "abc123", "date": "2024-01-01"}\n\n' +
  
  'ACCOUNT TYPES:\n' +
  '- checking: Standard checking account\n' +
  '- savings: Savings account\n' +
  '- credit: Credit card (balance typically negative)\n' +
  '- investment: Investment/brokerage account\n' +
  '- mortgage: Mortgage loan\n' +
  '- debt: Other debt/loan\n' +
  '- other: Other account types\n\n' +
  
  'COMMON USE CASES:\n' +
  '- Adding a new bank account: operation=create with name and type\n' +
  '- Renaming an account: operation=update with id and new name\n' +
  '- Closing a paid-off credit card: operation=close with id\n' +
  '- Checking current balance: operation=balance with id'
```

### 4. High Priority: Query Tools

**get-transactions Design:**
```typescript
description:
  'Retrieve transactions from Actual Budget with flexible filtering options.\n\n' +
  
  'REQUIRED:\n' +
  '- account: Account name or ID\n\n' +
  
  'OPTIONAL FILTERS:\n' +
  '- startDate: Start date (YYYY-MM-DD, defaults to 30 days ago)\n' +
  '- endDate: End date (YYYY-MM-DD, defaults to today)\n' +
  '- minAmount: Minimum amount in dollars (e.g., 50.00)\n' +
  '- maxAmount: Maximum amount in dollars (e.g., 100.00)\n' +
  '- categoryName: Filter by category name (partial match)\n' +
  '- payeeName: Filter by payee name (partial match)\n' +
  '- limit: Maximum number of transactions to return\n\n' +
  
  'EXAMPLES:\n' +
  '- Recent transactions: {"account": "Checking", "startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
  '- Large expenses: {"account": "Credit Card", "minAmount": 100}\n' +
  '- Specific payee: {"account": "Checking", "payeeName": "Amazon"}\n' +
  '- Combined filters: {"account": "Checking", "categoryName": "Groceries", "minAmount": 50, "limit": 10}\n\n' +
  
  'COMMON USE CASES:\n' +
  '- Reviewing recent spending: Specify account and date range\n' +
  '- Finding large transactions: Use minAmount filter\n' +
  '- Tracking specific merchant: Use payeeName filter\n' +
  '- Category analysis: Use categoryName filter'
```

**get-accounts Design:**
```typescript
description:
  'Retrieve all accounts with current balances and metadata. Useful for getting account IDs before other operations.\n\n' +
  
  'OPTIONAL PARAMETERS:\n' +
  '- account: Filter by specific account name or ID\n' +
  '- includeClosed: Include closed accounts (default: false)\n\n' +
  
  'RETURNS:\n' +
  '- Account ID (use this for other tools)\n' +
  '- Account name\n' +
  '- Current balance (in cents)\n' +
  '- Account type (checking, savings, credit, etc.)\n' +
  '- Status (open/closed)\n' +
  '- On-budget vs off-budget\n\n' +
  
  'EXAMPLES:\n' +
  '- List all accounts: {} or no arguments\n' +
  '- Find specific account: {"account": "Checking"}\n' +
  '- Include closed accounts: {"includeClosed": true}\n\n' +
  
  'COMMON USE CASES:\n' +
  '- Getting account IDs for manage-transaction or get-transactions\n' +
  '- Checking current balances across all accounts\n' +
  '- Finding closed accounts to reopen\n' +
  '- Verifying account names before operations'
```

### 5. Input Schema Enhancement Pattern

For all tools, enhance input schemas with descriptions:

```typescript
// Before
properties: {
  month: { type: 'string' },
  category: { type: 'string' },
  amount: { type: 'number' }
}

// After
properties: {
  month: { 
    type: 'string',
    description: 'Month in YYYY-MM format (e.g., "2024-01")'
  },
  category: { 
    type: 'string',
    description: 'Category name or ID. Use get-grouped-categories to find IDs.'
  },
  amount: { 
    type: 'number',
    description: 'Budget amount in cents (e.g., 50000 = $500.00)'
  }
}
```

## Implementation Strategy

### Phase 1: Critical Tools (Week 1)
1. Update manage-entity description and input schema
2. Update manage-transaction description and input schema
3. Update manage-account description and input schema
4. Test with Claude Desktop or similar MCP client
5. Iterate based on observed agent behavior

### Phase 2: High Priority Tools (Week 2)
1. Update get-transactions description and input schema
2. Update get-accounts description and input schema
3. Update set-budget description and input schema
4. Add input schema descriptions to all remaining tools
5. Test workflow scenarios with MCP client

### Phase 3: Medium Priority Tools (Week 3)
1. Update monthly-summary description
2. Update spending-by-category description
3. Add workflow hints and cross-references
4. Add error prevention guidance
5. Test complex workflows

### Phase 4: Low Priority & Polish (Week 4)
1. Update simple getter tool descriptions
2. Create tool usage guide documentation
3. Add tool discovery hints
4. Final testing and validation
5. Document lessons learned

## Testing Strategy

### Unit Testing
- Verify all tool schemas are valid JSON
- Verify all descriptions follow the template
- Verify all input schemas have property descriptions
- Verify all examples are valid JSON

### Integration Testing
- Test with Claude Desktop MCP client
- Test with Cline or other MCP clients
- Verify agents choose correct tools for common tasks
- Verify agents provide correct parameters
- Measure success rate improvement

### Test Scenarios
1. **Transaction Management**
   - Agent creates a transaction with correct amount format
   - Agent updates a transaction by ID
   - Agent deletes a transaction with confirmation

2. **Account Management**
   - Agent creates an account with correct type
   - Agent closes an account with balance transfer
   - Agent queries account balance

3. **Entity Management**
   - Agent creates a category with correct group_id
   - Agent creates a rule with conditions and actions
   - Agent creates a schedule with frequency

4. **Query Operations**
   - Agent retrieves transactions with filters
   - Agent finds account IDs before operations
   - Agent analyzes spending by category

## Success Metrics

### Quantitative Metrics
- **50-70% reduction** in agent confusion (measured by retry attempts)
- **30-50% fewer** failed tool calls
- **Better first-try success rate** for common tasks (target: 80%+)
- **Reduced conversation length** for typical workflows

### Qualitative Metrics
- Agents choose correct tool without user guidance
- Agents provide correct parameter formats
- Agents understand workflow dependencies
- Users report improved experience

## Rollout Plan

### Stage 1: Internal Testing
- Update critical tools
- Test with development team
- Gather feedback and iterate

### Stage 2: Beta Testing
- Deploy to staging environment
- Test with real MCP clients
- Monitor agent behavior
- Collect metrics

### Stage 3: Production Rollout
- Deploy to production
- Monitor success metrics
- Gather user feedback
- Plan future improvements

### Stage 4: Continuous Improvement
- Review metrics monthly
- Update descriptions based on feedback
- Add new examples as use cases emerge
- Maintain consistency across tools

## Risk Mitigation

### Risk: Description Length
**Issue:** Very long descriptions may overwhelm agents  
**Mitigation:** Use clear section headers and formatting; test with real clients

### Risk: Breaking Changes
**Issue:** Changing descriptions might confuse existing users  
**Mitigation:** Descriptions are additive, not breaking; maintain backward compatibility

### Risk: Maintenance Burden
**Issue:** Keeping descriptions updated as tools evolve  
**Mitigation:** Create template and guidelines; include in code review process

### Risk: Inconsistency
**Issue:** New tools may not follow standards  
**Mitigation:** Document template; create linting rules; include in PR checklist

## Future Enhancements

### Short Term (3-6 months)
- Add more workflow examples
- Create interactive tool documentation
- Add tool usage analytics
- Implement description linting

### Long Term (6-12 months)
- AI-powered description generation
- Dynamic examples based on user data
- Tool recommendation system
- Usage pattern analysis

## Conclusion

This design provides a comprehensive approach to improving MCP tool discoverability through enhanced descriptions, parameter documentation, use case guidance, and error prevention tips. The phased implementation allows for iterative improvement based on real-world testing with MCP clients.

**Expected Impact:**
- 50-70% reduction in agent confusion
- 30-50% fewer failed tool calls
- Better first-try success rate
- Improved user experience with remote MCP clients

**Implementation Timeline:** 4 weeks  
**Estimated Effort:** 8-12 hours total  
**Priority:** High (impacts all remote MCP usage)
