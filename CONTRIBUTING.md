# Contributing to Actual Budget MCP Server

Thank you for your interest in contributing to the Actual Budget MCP Server! This document provides guidelines and standards for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Project Structure](#project-structure)
- [Adding a New Tool](#adding-a-new-tool)
- [Testing Guidelines](#testing-guidelines)
- [Code Quality](#code-quality)
- [Pull Request Process](#pull-request-process)
- [Common Patterns](#common-patterns)

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Git
- Actual Budget instance (local or remote)
- Basic understanding of TypeScript and MCP

### Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/actual-mcp.git
cd actual-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests to verify setup:
```bash
npm test
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Actual Budget configuration
```

6. Start development with watch mode:
```bash
npm run watch
```

## Coding Standards

### TypeScript Guidelines

#### 1. Use Explicit Types

Always provide explicit type annotations for function parameters and return types:

```typescript
// ✅ Good
export function formatAmount(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

// ❌ Bad
export function formatAmount(amount) {
  return `$${(amount / 100).toFixed(2)}`;
}
```

#### 2. Prefer Interfaces Over Types

Use interfaces for object shapes when possible:

```typescript
// ✅ Good
interface Account {
  id: string;
  name: string;
  balance: number;
}

// ❌ Bad (unless you need union/intersection types)
type Account = {
  id: string;
  name: string;
  balance: number;
};
```

#### 3. Use Strict Null Checks

Handle null and undefined explicitly:

```typescript
// ✅ Good
function getAccountName(account: Account | undefined): string {
  return account?.name ?? 'Unknown';
}

// ❌ Bad
function getAccountName(account) {
  return account.name;
}
```

#### 4. Avoid `any` Type

Use `unknown` instead of `any` when the type is truly unknown:

```typescript
// ✅ Good
function handleError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

// ❌ Bad
function handleError(err: any): string {
  return err.message;
}
```

### Code Style

#### 1. Use Consistent Naming

- **Files**: kebab-case (`fetch-accounts.ts`, `response-builder.ts`)
- **Classes**: PascalCase (`CategoryMapper`, `InputParser`)
- **Functions**: camelCase (`formatDate`, `validateUUID`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CACHE_TTL`, `MAX_RETRIES`)
- **Interfaces**: PascalCase (`Account`, `Transaction`)

#### 2. File Organization

Organize imports in this order:
1. External dependencies
2. Internal core modules
3. Internal tool modules
4. Types
5. Relative imports

```typescript
// External dependencies
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Internal core modules
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import { formatDate } from '../../core/formatting/index.js';

// Types
import type { ToolArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';

// Relative imports
import { InputParser } from './input-parser.js';
```

#### 3. Function Length

Keep functions focused and concise:
- **Maximum 50 lines** per function
- **Maximum 500 lines** per file
- If a function exceeds these limits, refactor into smaller functions

#### 4. Comments and Documentation

Use JSDoc for public functions:

```typescript
/**
 * Fetch all transactions for the specified account within a date range
 * 
 * @param accountId - The account ID to fetch transactions for
 * @param startDate - The start date (inclusive)
 * @param endDate - The end date (inclusive)
 * @returns Array of transactions with enriched data
 * @throws {Error} If the account doesn't exist or API call fails
 */
export async function fetchTransactions(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  // Implementation
}
```

Add inline comments for complex logic:

```typescript
// Calculate savings rate as (income - expenses) / income
// Handle edge case where income is 0 to avoid division by zero
const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
```

### Error Handling

#### 1. Use Core Response Builders

Always use the centralized response builders:

```typescript
import { success, errorFromCatch } from '../../core/response/index.js';
import { validationError, notFoundError } from '../../core/response/error-builder.js';

// Success
return success('Operation completed');

// Validation error
return validationError('Invalid input', { field: 'accountId' });

// Not found
return notFoundError('Account', accountId);

// Caught exception
try {
  // ... operation
} catch (err) {
  return errorFromCatch(err);
}
```

#### 2. Fail Fast

Validate inputs early:

```typescript
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  // Validate first
  if (!args.accountId) {
    return validationError('accountId is required');
  }
  
  if (!validateUUID(args.accountId)) {
    return validationError('accountId must be a valid UUID');
  }
  
  // Then proceed with logic
  // ...
}
```

#### 3. Provide Helpful Error Messages

Include context and suggestions:

```typescript
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts and retry with a valid ID'
});
```

## Project Structure

### Core Modules (`src/core/`)

Place shared functionality in appropriate core modules:

- **`response/`** - Response and error builders
- **`input/`** - Validation and parsing
- **`formatting/`** - Date and amount formatting
- **`data/`** - Data fetching with caching
- **`mapping/`** - Entity mapping and classification
- **`aggregation/`** - Data aggregation utilities
- **`performance/`** - Performance monitoring
- **`cache/`** - Caching service
- **`types/`** - Type definitions and schemas

### Tool Structure (`src/tools/`)

Each tool follows a consistent structure:

```
src/tools/[tool-name]/
├── index.ts              # Schema + handler (REQUIRED)
├── input-parser.ts       # Argument validation (if needed)
├── data-fetcher.ts       # Data retrieval (if needed)
├── report-generator.ts   # Response formatting (if needed)
├── types.ts              # Tool-specific types (if needed)
└── index.test.ts         # Tests (REQUIRED)
```

## Adding a New Tool

Follow these steps to add a new tool:

### 1. Create Tool Directory

```bash
mkdir -p src/tools/my-new-tool
```

### 2. Create Schema and Handler (`index.ts`)

```typescript
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import type { ToolInput } from '../../types.js';

// Define Zod schema
const MyToolArgsSchema = z.object({
  accountId: z.string().describe('The account ID'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
});

type MyToolArgs = z.infer<typeof MyToolArgsSchema>;

export const schema = {
  name: 'my-new-tool',
  description: 'Description of what this tool does',
  inputSchema: zodToJsonSchema(MyToolArgsSchema) as ToolInput,
};

export async function handler(args: MyToolArgs): Promise<CallToolResult> {
  try {
    // 1. Validate input
    const parsed = MyToolArgsSchema.parse(args);
    
    // 2. Fetch data
    // 3. Process data
    // 4. Generate response
    
    return successWithContent({ 
      type: 'text', 
      text: 'Result' 
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

### 3. Add Input Parser (if needed)

```typescript
// input-parser.ts
import { validationError } from '../../core/response/error-builder.js';
import { validateUUID } from '../../core/input/validators.js';
import type { MyToolArgs } from './types.js';

export class MyToolInputParser {
  parse(args: MyToolArgs): ParsedInput {
    if (!args.accountId) {
      throw new Error('accountId is required');
    }
    
    if (!validateUUID(args.accountId)) {
      throw new Error('accountId must be a valid UUID');
    }
    
    return {
      accountId: args.accountId,
      startDate: args.startDate ?? this.getDefaultStartDate(),
    };
  }
  
  private getDefaultStartDate(): string {
    // Implementation
  }
}
```

### 4. Add Data Fetcher (if needed)

```typescript
// data-fetcher.ts
import { fetchAccounts } from '../../core/data/fetch-accounts.js';
import { fetchTransactions } from '../../core/data/fetch-transactions.js';

export class MyToolDataFetcher {
  async fetchAll(accountId: string, startDate: string) {
    const [accounts, transactions] = await Promise.all([
      fetchAccounts(),
      fetchTransactions(accountId, startDate),
    ]);
    
    return { accounts, transactions };
  }
}
```

### 5. Add Report Generator (if needed)

```typescript
// report-generator.ts
import { formatDate } from '../../core/formatting/index.js';

export class MyToolReportGenerator {
  generate(data: ReportData): string {
    return `
# Report Title

Generated: ${formatDate(new Date())}

## Summary
...
    `.trim();
  }
}
```

### 6. Register Tool

Add to `src/tools/index.ts`:

```typescript
import * as myNewTool from './my-new-tool/index.js';

const toolRegistry: ToolDefinition[] = [
  // ... existing tools
  { 
    schema: myNewTool.schema, 
    handler: myNewTool.handler, 
    requiresWrite: false  // or true if it modifies data
  },
];
```

### 7. Add Tests

```typescript
// index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

describe('my-new-tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success for valid input', async () => {
    const result = await handler({ accountId: 'valid-uuid' });
    expect(result.isError).toBeUndefined();
  });

  it('should return error for invalid input', async () => {
    const result = await handler({ accountId: '' });
    expect(result.isError).toBe(true);
  });
});
```

### 8. Update Documentation

Add tool to README.md under the appropriate section.

## Testing Guidelines

### Test Requirements

- **Every new feature must have tests**
- **Minimum 3 test cases**: happy path, edge case, error case
- **Co-locate tests** with source files (`.test.ts`)
- **Use descriptive test names**

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('functionName', () => {
    it('should handle valid input correctly', () => {
      // Happy path test
    });

    it('should handle edge case', () => {
      // Edge case test
    });

    it('should throw error for invalid input', () => {
      // Error case test
    });
  });
});
```

### Mocking

Use Vitest mocking for external dependencies:

```typescript
import { vi } from 'vitest';
import * as actualApi from '../../actual-api.js';

vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
}));

// In test
vi.mocked(actualApi.getAccounts).mockResolvedValue([
  { id: '1', name: 'Checking' }
]);
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:unit:watch

# Coverage
npm run test:coverage

# Specific file
npm test src/core/response/response-builder.test.ts
```

## Code Quality

### Before Committing

Run all quality checks:

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check

# Tests
npm test

# Or run all at once
npm run quality
```

### ESLint

Fix linting issues:

```bash
npm run lint:fix
```

### Prettier

Format code:

```bash
npm run format
```

### TypeScript

Check types:

```bash
npm run type-check
```

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Follow coding standards
- Add tests
- Update documentation
- Run quality checks

### 3. Commit Changes

Use conventional commit messages:

```bash
git commit -m "feat: add new tool for budget analysis"
git commit -m "fix: correct date formatting in reports"
git commit -m "docs: update architecture documentation"
git commit -m "test: add tests for response builders"
git commit -m "refactor: simplify input validation logic"
```

### 4. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Create a pull request on GitHub with:
- Clear description of changes
- Reference to related issues
- Screenshots (if UI changes)
- Test results

### 5. Code Review

- Address reviewer feedback
- Keep PR focused and small
- Update tests if needed

### 6. Merge

Once approved, the PR will be merged by a maintainer.

## Common Patterns

### Pattern 1: Input Validation

```typescript
export class InputParser {
  parse(args: ToolArgs): ParsedInput {
    // Validate required fields
    if (!args.field) {
      throw new Error('field is required');
    }
    
    // Validate format
    if (!validateFormat(args.field)) {
      throw new Error('field has invalid format');
    }
    
    // Apply defaults
    return {
      field: args.field,
      optional: args.optional ?? defaultValue,
    };
  }
}
```

### Pattern 2: Data Fetching

```typescript
export class DataFetcher {
  async fetchAll(params: Params): Promise<Data> {
    // Fetch in parallel when possible
    const [accounts, categories, transactions] = await Promise.all([
      fetchAccounts(),
      fetchCategories(),
      fetchTransactions(params),
    ]);
    
    return { accounts, categories, transactions };
  }
}
```

### Pattern 3: Report Generation

```typescript
export class ReportGenerator {
  generate(data: ReportData): string {
    const sections = [
      this.generateHeader(data),
      this.generateSummary(data),
      this.generateDetails(data),
    ];
    
    return sections.join('\n\n');
  }
  
  private generateHeader(data: ReportData): string {
    // ...
  }
}
```

### Pattern 4: Error Handling

```typescript
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    // Validate
    const input = new InputParser().parse(args);
    
    // Fetch
    const data = await new DataFetcher().fetchAll(input);
    
    // Process
    const result = processData(data);
    
    // Respond
    return success(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

## Questions?

If you have questions or need help:

1. Check the [Architecture Documentation](./ARCHITECTURE.md)
2. Review existing tools for examples
3. Open an issue on GitHub
4. Ask in discussions

Thank you for contributing!
