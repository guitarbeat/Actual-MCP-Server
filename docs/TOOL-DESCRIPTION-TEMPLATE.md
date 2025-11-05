# MCP Tool Description Template

## Overview

This document provides the standard template for creating MCP tool descriptions that maximize AI agent discoverability. Following this template ensures consistency across all tools and helps agents understand when and how to use each tool effectively.

## Why Good Descriptions Matter

AI agents using MCP tools remotely (via Claude Desktop, Cline, etc.) rely entirely on tool descriptions and input schemas to understand:
- What the tool does
- When to use it
- What parameters are required
- What format parameters should be in
- What the tool returns

Poor descriptions lead to:
- ❌ Agents choosing wrong tools
- ❌ Failed tool calls due to incorrect parameters
- ❌ Multiple retry attempts
- ❌ Users having to manually guide agents

Good descriptions result in:
- ✅ Agents choosing correct tools on first try
- ✅ Correct parameter formats
- ✅ Fewer failed attempts
- ✅ Better user experience

## Standard Template Structure

All tool descriptions should follow this structure:

```typescript
export const schema = {
  name: 'tool-name',
  description:
    'Brief one-line summary of what the tool does.\n\n' +
    
    '[SECTION 1: Operations/Parameters]\n' +
    '[Content]\n\n' +
    
    '[SECTION 2: Examples]\n' +
    '[Content]\n\n' +
    
    '[SECTION 3: Common Use Cases]\n' +
    '[Content]\n\n' +
    
    '[SECTION 4: Notes (Optional)]\n' +
    '[Content]',
    
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Detailed description with format, constraints, and examples'
      }
    },
    required: ['param1']
  }
};
```

### Section Guidelines

#### 1. One-Line Summary
- Start with a clear, concise summary (1-2 sentences)
- State what the tool does and its primary purpose
- End with `\n\n` to create spacing

#### 2. Operations/Parameters Section
Choose based on tool complexity:

**For Multi-Operation Tools:**
```
'OPERATIONS:\n\n' +
'• OPERATION_NAME: Description\n' +
'  Required: param1, param2\n' +
'  Optional: param3\n' +
'  Example: {JSON example}\n\n'
```

**For Single-Operation Tools:**
```
'REQUIRED PARAMETERS:\n' +
'- param1: Description with format\n' +
'- param2: Description with constraints\n\n' +
'OPTIONAL PARAMETERS:\n' +
'- param3: Description with defaults\n\n'
```

#### 3. Examples Section
```
'EXAMPLES:\n' +
'- Use case 1: {JSON example}\n' +
'- Use case 2: {JSON example}\n\n'
```

- Provide 2-4 realistic examples
- Use valid JSON on a single line
- Cover common scenarios
- Show different parameter combinations

#### 4. Common Use Cases Section
```
'COMMON USE CASES:\n' +
'- Scenario 1: Brief description\n' +
'- Scenario 2: Brief description\n\n'
```

- List 3-5 typical scenarios
- Use concrete, specific examples
- Help agents understand when to use the tool

#### 5. Notes Section (Optional)
```
'NOTES:\n' +
'- Important detail 1\n' +
'- Important detail 2'
```

- Add warnings for destructive operations
- Clarify format requirements
- Note workflow dependencies
- Include tips and caveats

## Input Schema Guidelines

Every property in the input schema MUST have a description that includes:

1. **What the parameter is**: Clear explanation of its purpose
2. **Format requirements**: Date formats, units (cents vs dollars), etc.
3. **Constraints**: Min/max values, allowed values, patterns
4. **Examples**: Show valid values
5. **Relationships**: Reference other tools if IDs are needed

### Good Input Schema Example

```typescript
inputSchema: {
  type: 'object',
  properties: {
    month: {
      type: 'string',
      description: 'Month in YYYY-MM format (e.g., "2024-01"). Defaults to current month if not specified.'
    },
    category: {
      type: 'string',
      description: 'Category name or ID. Accepts partial name matches. Use get-grouped-categories to find category IDs.'
    },
    amount: {
      type: 'number',
      description: 'Budget amount in cents (e.g., 50000 = $500.00). Must be a positive integer.'
    },
    carryover: {
      type: 'boolean',
      description: 'Whether to carry over unused budget to next month. Defaults to false.'
    }
  },
  required: ['category']
}
```

### Bad Input Schema Example (Don't Do This)

```typescript
inputSchema: {
  type: 'object',
  properties: {
    month: { type: 'string' },  // ❌ No description
    category: { type: 'string', description: 'Category' },  // ❌ Too vague
    amount: { type: 'number' },  // ❌ No format clarification
    carryover: { type: 'boolean', description: 'Carryover setting' }  // ❌ Unclear
  },
  required: ['category']
}
```

## Tool Type Examples

### Example 1: Multi-Operation Management Tool

**Tool Type:** CRUD operations on entities (create, update, delete)

```typescript
export const schema = {
  name: 'manage-transaction',
  description:
    'Create, update, or delete transactions in Actual Budget. Supports name or ID resolution for accounts, payees, and categories.\n\n' +
    
    'OPERATIONS:\n\n' +
    
    '• CREATE: Add a new transaction\n' +
    '  Required: account, date, amount\n' +
    '  Optional: payee, category, notes, cleared\n' +
    '  Example: {"operation": "create", "transaction": {"account": "Checking", "date": "2024-01-15", "amount": -5000, "payee": "Store", "category": "Groceries"}}\n\n' +
    
    '• UPDATE: Modify an existing transaction\n' +
    '  Required: id\n' +
    '  Optional: any transaction fields\n' +
    '  Example: {"operation": "update", "id": "abc123", "transaction": {"amount": -5500}}\n\n' +
    
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
    '- Removing duplicate: operation=delete with id',
    
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['create', 'update', 'delete'],
        description: 'Operation to perform. Create requires transaction object, update requires id and transaction, delete requires only id.'
      },
      id: {
        type: 'string',
        description: 'Transaction ID (required for update and delete). Must be a valid UUID. Use get-transactions to find transaction IDs.'
      },
      transaction: {
        type: 'object',
        description: 'Transaction data (required for create, optional for update). Include account, date, amount for create. Any fields can be updated.'
      }
    },
    required: ['operation']
  }
};
```

### Example 2: Query/Retrieval Tool

**Tool Type:** Fetching data with filters

```typescript
export const schema = {
  name: 'get-transactions',
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
    '- Category analysis: Use categoryName filter',
    
  inputSchema: {
    type: 'object',
    properties: {
      account: {
        type: 'string',
        description: 'Account name or ID to query transactions from. Use get-accounts to find account IDs.'
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (e.g., "2024-01-01"). Defaults to 30 days ago if not specified.'
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (e.g., "2024-01-31"). Defaults to today if not specified.'
      },
      minAmount: {
        type: 'number',
        description: 'Minimum transaction amount in dollars (e.g., 50.00). Filters transactions >= this amount.'
      },
      maxAmount: {
        type: 'number',
        description: 'Maximum transaction amount in dollars (e.g., 100.00). Filters transactions <= this amount.'
      },
      categoryName: {
        type: 'string',
        description: 'Filter by category name. Supports partial matches (e.g., "Groc" matches "Groceries").'
      },
      payeeName: {
        type: 'string',
        description: 'Filter by payee name. Supports partial matches (e.g., "Amaz" matches "Amazon").'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of transactions to return. Useful for limiting large result sets.'
      }
    },
    required: ['account']
  }
};
```

### Example 3: Simple Getter Tool

**Tool Type:** Basic data retrieval without filters

```typescript
export const schema = {
  name: 'get-payees',
  description:
    'Retrieve all payees from Actual Budget.\n\n' +
    
    'RETURNS:\n' +
    '- Payee ID (use for manage-transaction or manage-entity)\n' +
    '- Payee name\n' +
    '- Associated category (if set)\n' +
    '- Transfer account (if payee represents a transfer)\n\n' +
    
    'EXAMPLES:\n' +
    '- Get all payees: {} or no arguments\n\n' +
    
    'COMMON USE CASES:\n' +
    '- Finding payee IDs for transaction creation\n' +
    '- Listing all merchants/vendors\n' +
    '- Identifying transfer payees\n' +
    '- Checking payee-category associations',
    
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};
```

### Example 4: Analysis/Report Tool

**Tool Type:** Aggregating and analyzing data

```typescript
export const schema = {
  name: 'spending-by-category',
  description:
    'Analyze spending broken down by category for a specified time period.\n\n' +
    
    'REQUIRED:\n' +
    '- startDate: Start of analysis period (YYYY-MM-DD)\n' +
    '- endDate: End of analysis period (YYYY-MM-DD)\n\n' +
    
    'OPTIONAL FILTERS:\n' +
    '- account: Limit analysis to specific account\n' +
    '- categoryGroup: Limit to categories in a specific group\n\n' +
    
    'RETURNS:\n' +
    '- Category name and group\n' +
    '- Total spending amount\n' +
    '- Transaction count\n' +
    '- Percentage of total spending\n' +
    '- Sorted by amount (highest to lowest)\n\n' +
    
    'EXAMPLES:\n' +
    '- Monthly analysis: {"startDate": "2024-01-01", "endDate": "2024-01-31"}\n' +
    '- Specific account: {"startDate": "2024-01-01", "endDate": "2024-01-31", "account": "Credit Card"}\n' +
    '- Category group: {"startDate": "2024-01-01", "endDate": "2024-01-31", "categoryGroup": "Food & Dining"}\n\n' +
    
    'COMMON USE CASES:\n' +
    '- Monthly spending review: Analyze where money went\n' +
    '- Budget planning: Identify high-spending categories\n' +
    '- Account-specific analysis: See spending patterns per account\n' +
    '- Category group trends: Focus on specific spending areas',
    
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date for analysis in YYYY-MM-DD format (e.g., "2024-01-01").'
      },
      endDate: {
        type: 'string',
        description: 'End date for analysis in YYYY-MM-DD format (e.g., "2024-01-31").'
      },
      account: {
        type: 'string',
        description: 'Optional account name or ID to limit analysis. Use get-accounts to find account IDs.'
      },
      categoryGroup: {
        type: 'string',
        description: 'Optional category group name to limit analysis to specific group (e.g., "Food & Dining").'
      }
    },
    required: ['startDate', 'endDate']
  }
};
```

### Example 5: Configuration/Settings Tool

**Tool Type:** Modifying settings or configurations

```typescript
export const schema = {
  name: 'set-budget',
  description:
    'Set budget amount and carryover settings for a category in a specific month.\n\n' +
    
    'REQUIRED:\n' +
    '- category: Category name or ID\n\n' +
    
    'OPTIONAL:\n' +
    '- month: Month in YYYY-MM format (defaults to current month)\n' +
    '- amount: Budget amount in cents\n' +
    '- carryover: Whether to carry over unused budget\n\n' +
    
    'EXAMPLES:\n' +
    '- Set amount only: {"category": "Groceries", "month": "2024-01", "amount": 50000}\n' +
    '- Set carryover only: {"category": "Groceries", "month": "2024-01", "carryover": true}\n' +
    '- Set both: {"category": "Groceries", "month": "2024-01", "amount": 50000, "carryover": true}\n' +
    '- Current month: {"category": "Groceries", "amount": 50000}\n\n' +
    
    'NOTES:\n' +
    '- Amount is in cents (e.g., 50000 = $500.00)\n' +
    '- Month format is YYYY-MM (e.g., "2024-01" for January 2024)\n' +
    '- At least one of amount or carryover must be provided\n' +
    '- Use get-grouped-categories to find category names and IDs\n\n' +
    
    'COMMON USE CASES:\n' +
    '- Setting monthly budget: Specify category, month, and amount\n' +
    '- Enabling carryover: Set carryover=true for savings categories\n' +
    '- Adjusting current month: Omit month parameter\n' +
    '- Bulk budget setup: Call multiple times for different categories',
    
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format (e.g., "2024-01"). Defaults to current month if not specified.'
      },
      category: {
        type: 'string',
        description: 'Category name or ID. Accepts partial name matches. Use get-grouped-categories to find category IDs.'
      },
      amount: {
        type: 'number',
        description: 'Budget amount in cents (e.g., 50000 = $500.00). Must be a positive integer. Optional if carryover is provided.'
      },
      carryover: {
        type: 'boolean',
        description: 'Whether to carry over unused budget to next month. Useful for savings categories. Optional if amount is provided.'
      }
    },
    required: ['category']
  }
};
```

## Formatting Best Practices

### 1. Use Newlines for Readability
```typescript
// ✅ Good - Clear sections
'Brief summary.\n\n' +
'SECTION 1:\n' +
'Content\n\n' +
'SECTION 2:\n' +
'Content'

// ❌ Bad - Wall of text
'Brief summary. SECTION 1: Content SECTION 2: Content'
```

### 2. Use Consistent Section Headers
```typescript
// ✅ Good - Standard headers
'OPERATIONS:\n'
'REQUIRED PARAMETERS:\n'
'EXAMPLES:\n'
'COMMON USE CASES:\n'
'NOTES:\n'

// ❌ Bad - Inconsistent
'Operations:\n'
'Required Params:\n'
'Example Usage:\n'
'Use Cases:\n'
'Important:\n'
```

### 3. Format JSON Examples Properly
```typescript
// ✅ Good - Valid JSON on one line
'Example: {"operation": "create", "data": {"name": "Test"}}\n'

// ❌ Bad - Invalid JSON or multi-line
'Example: {operation: create, data: {name: Test}}\n'
'Example: {\n  "operation": "create"\n}\n'
```

### 4. Be Specific with Formats
```typescript
// ✅ Good - Explicit format
'Date format: YYYY-MM-DD (e.g., "2024-01-15")'
'Amount in cents (e.g., 5000 = $50.00)'
'Month format: YYYY-MM (e.g., "2024-01")'

// ❌ Bad - Vague
'Date as string'
'Amount as number'
'Month parameter'
```

### 5. Include Warnings for Destructive Operations
```typescript
// ✅ Good - Clear warning
'• DELETE: Permanently remove a transaction\n' +
'  Required: id\n' +
'  WARNING: Cannot be undone!\n'

// ❌ Bad - No warning
'• DELETE: Remove a transaction\n' +
'  Required: id\n'
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Minimal Descriptions
```typescript
// Bad
description: 'Manage transactions'
```

### ❌ Mistake 2: Missing Input Schema Descriptions
```typescript
// Bad
properties: {
  amount: { type: 'number' }
}
```

### ❌ Mistake 3: No Examples
```typescript
// Bad - No examples provided
description: 'Create, update, or delete transactions. Requires operation and data.'
```

### ❌ Mistake 4: Unclear Parameter Requirements
```typescript
// Bad
description: 'Needs some parameters depending on operation'
```

### ❌ Mistake 5: No Use Case Guidance
```typescript
// Bad - Agents don't know when to use this
description: 'Gets transactions from the database'
```

## Quality Checklist

Before submitting a new tool or updating an existing one, verify:

### Description Quality
- [ ] Starts with clear one-line summary
- [ ] Has appropriate sections (Operations/Parameters, Examples, Use Cases)
- [ ] Includes 2-4 realistic examples
- [ ] Lists 3-5 common use cases
- [ ] Uses consistent formatting and section headers
- [ ] Includes NOTES section if needed (warnings, tips, caveats)
- [ ] Uses `\n\n` for section spacing
- [ ] All JSON examples are valid and on single lines

### Input Schema Quality
- [ ] Every property has a description
- [ ] Descriptions include format requirements
- [ ] Descriptions include constraints (min/max, allowed values)
- [ ] Descriptions include examples
- [ ] Descriptions reference related tools when needed
- [ ] Required vs optional parameters are clear
- [ ] Default values are documented

### Content Quality
- [ ] No vague terms ("some", "various", "etc.")
- [ ] Specific format examples (YYYY-MM-DD, not "date string")
- [ ] Unit clarifications (cents vs dollars, etc.)
- [ ] Warnings for destructive operations
- [ ] Cross-references to related tools
- [ ] Realistic, concrete examples

### Consistency
- [ ] Follows standard template structure
- [ ] Uses same section headers as other tools
- [ ] Matches formatting style of existing tools
- [ ] Consistent terminology across description and schema

## Testing Your Description

After writing a tool description, test it by asking:

1. **Can an agent understand what this tool does?**
   - Read only the one-line summary
   - Is it immediately clear?

2. **Can an agent know when to use this tool?**
   - Read the common use cases
   - Are they specific and realistic?

3. **Can an agent construct a valid call?**
   - Read the examples
   - Are all required parameters shown?
   - Are formats clear?

4. **Can an agent avoid common mistakes?**
   - Read the notes section
   - Are warnings and tips included?

5. **Can an agent understand all parameters?**
   - Read each input schema description
   - Is format, constraints, and purpose clear?

If you answer "no" to any question, improve that section.

## Maintenance Guidelines

### When Adding New Tools
1. Use this template from the start
2. Include all required sections
3. Get peer review on description quality
4. Test with an MCP client if possible

### When Updating Existing Tools
1. Maintain consistency with template
2. Update examples if functionality changes
3. Add new use cases as they emerge
4. Keep descriptions in sync with code

### When Deprecating Tools
1. Add deprecation notice to description
2. Reference replacement tool
3. Update related tool descriptions
4. Remove from documentation after sunset period

## Resources

- **Design Document**: `.kiro/specs/tool-discoverability-improvements/design.md`
- **Requirements**: `.kiro/specs/tool-discoverability-improvements/requirements.md`
- **Tool Usage Guide**: `docs/TOOL-USAGE-GUIDE.md`
- **Existing Examples**: Check `src/tools/*/index.ts` for real implementations

## Questions?

If you're unsure about how to describe a tool:
1. Look at similar tools in the codebase
2. Review the examples in this document
3. Ask for peer review
4. Test with an MCP client to see agent behavior

Remember: Good descriptions are an investment in user experience. They reduce confusion, improve success rates, and make the tools more valuable to AI agents and their users.
