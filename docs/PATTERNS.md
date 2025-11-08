# Common Patterns

This document describes common patterns used throughout the Actual Budget MCP Server codebase. Following these patterns ensures consistency and maintainability.

## Table of Contents

- [Tool Implementation Patterns](#tool-implementation-patterns)
- [Response Building Patterns](#response-building-patterns)
- [Input Validation Patterns](#input-validation-patterns)
- [Data Fetching Patterns](#data-fetching-patterns)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Patterns](#testing-patterns)
- [Performance Patterns](#performance-patterns)

## Tool Implementation Patterns

### Basic Tool Structure

Every tool follows this standard structure:

```typescript
// index.ts
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import type { ToolInput } from '../../types.js';

// 1. Define Zod schema for validation
const ToolArgsSchema = z.object({
  requiredField: z.string().describe('Description'),
  optionalField: z.string().optional().describe('Optional description'),
});

type ToolArgs = z.infer<typeof ToolArgsSchema>;

// 2. Export schema for MCP registration
export const schema = {
  name: 'tool-name',
  description: 'What this tool does',
  inputSchema: zodToJsonSchema(ToolArgsSchema) as ToolInput,
};

// 3. Export handler function
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    // Parse and validate
    const parsed = ToolArgsSchema.parse(args);
    
    // Fetch data
    const data = await fetchData(parsed);
    
    // Process data
    const result = processData(data);
    
    // Generate response
    return successWithContent({ type: 'text', text: result });
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

### Modular Tool Structure

For complex tools, split into modules:

```typescript
// index.ts
import { InputParser } from './input-parser.js';
import { DataFetcher } from './data-fetcher.js';
import { ReportGenerator } from './report-generator.js';

export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    const input = new InputParser().parse(args);
    const data = await new DataFetcher().fetchAll(input);
    const report = new ReportGenerator().generate(data);
    
    return successWithContent({ type: 'text', text: report });
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

```typescript
// input-parser.ts
export class InputParser {
  parse(args: ToolArgs): ParsedInput {
    // Validation logic
    return parsedInput;
  }
}
```

```typescript
// data-fetcher.ts
export class DataFetcher {
  async fetchAll(input: ParsedInput): Promise<Data> {
    // Data fetching logic
    return data;
  }
}
```

```typescript
// report-generator.ts
export class ReportGenerator {
  generate(data: Data): string {
    // Report generation logic
    return markdown;
  }
}
```

## Response Building Patterns

### Success Responses

```typescript
import { success, successWithContent, successWithJson } from '../../core/response/index.js';

// Simple text response
return success('Operation completed successfully');

// Structured content
return successWithContent({
  type: 'text',
  text: markdownReport,
});

// JSON data
return successWithJson({
  accounts: [...],
  total: 100,
});
```

### Error Responses

```typescript
import { error, errorFromCatch } from '../../core/response/index.js';
import { 
  validationError, 
  notFoundError, 
  apiError, 
  permissionError 
} from '../../core/response/error-builder.js';

// Generic error
return error('Something went wrong', 'Try again later');

// Validation error
return validationError('Invalid account ID', {
  field: 'accountId',
  value: accountId,
  expected: 'UUID format',
});

// Not found error
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts',
});

// API error
return apiError('Failed to fetch transactions', err, {
  operation: 'getTransactions',
  accountId,
});

// Permission error
return permissionError('create-transaction', {
  reason: 'Write access not enabled',
  suggestion: 'Start server with --enable-write flag',
});

// Error from exception
try {
  // ... operation
} catch (err) {
  return errorFromCatch(err, {
    fallbackMessage: 'Operation failed',
    suggestion: 'Check server logs',
  });
}
```

## Input Validation Patterns

### Using Zod Schemas

```typescript
import { z } from 'zod';

// Basic schema
const ArgsSchema = z.object({
  accountId: z.string(),
  amount: z.number(),
  date: z.string().optional(),
});

// Schema with validation
const ArgsSchema = z.object({
  accountId: z.string().uuid('Must be a valid UUID'),
  amount: z.number().positive('Must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format'),
});

// Schema with transforms
const ArgsSchema = z.object({
  accountId: z.string().trim(),
  amount: z.number().transform(val => Math.round(val * 100)), // Convert to cents
});

// Parse and validate
try {
  const parsed = ArgsSchema.parse(args);
  // Use parsed data
} catch (err) {
  if (err instanceof z.ZodError) {
    return validationError(err.errors[0].message);
  }
  throw err;
}
```

### Manual Validation

```typescript
import { validateUUID, validateMonth } from '../../core/input/validators.js';

export class InputParser {
  parse(args: ToolArgs): ParsedInput {
    // Check required fields
    if (!args.accountId) {
      throw new Error('accountId is required');
    }
    
    // Validate format
    if (!validateUUID(args.accountId)) {
      throw new Error('accountId must be a valid UUID');
    }
    
    // Validate month format
    if (args.month && !validateMonth(args.month)) {
      throw new Error('month must be in YYYY-MM format');
    }
    
    // Apply defaults
    return {
      accountId: args.accountId,
      month: args.month ?? this.getCurrentMonth(),
      includeSubAccounts: args.includeSubAccounts ?? false,
    };
  }
  
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

## Data Fetching Patterns

### Using Core Data Fetchers

```typescript
import { fetchAccounts } from '../../core/data/fetch-accounts.js';
import { fetchCategories } from '../../core/data/fetch-categories.js';
import { fetchTransactions } from '../../core/data/fetch-transactions.js';

export class DataFetcher {
  async fetchAll(accountId: string, startDate: string, endDate: string) {
    // Fetch in parallel for better performance
    const [accounts, categories, transactions] = await Promise.all([
      fetchAccounts(),
      fetchCategories(),
      fetchTransactions([accountId], startDate, endDate),
    ]);
    
    return { accounts, categories, transactions };
  }
}
```

### Multi-Account Fetching

```typescript
import { fetchTransactions } from '../../core/data/fetch-transactions.js';

export class DataFetcher {
  async fetchTransactionsForMultipleAccounts(
    accountIds: string[],
    startDate: string,
    endDate: string
  ) {
    // Core fetcher handles parallel execution automatically
    return await fetchTransactions(accountIds, startDate, endDate);
  }
}
```

### With Caching

```typescript
import { cacheService } from '../../core/cache/cache-service.js';

export async function fetchAccountsWithCache(): Promise<Account[]> {
  const cacheKey = 'accounts';
  
  // Try cache first
  const cached = cacheService.get<Account[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  const accounts = await api.getAccounts();
  
  // Store in cache
  cacheService.set(cacheKey, accounts);
  
  return accounts;
}
```

### Cache Invalidation

```typescript
import { cacheService } from '../../core/cache/cache-service.js';

export async function createAccount(data: AccountData): Promise<Account> {
  // Create account
  const account = await api.createAccount(data);
  
  // Invalidate related cache entries
  cacheService.invalidate('accounts');
  cacheService.invalidatePattern('account:*');
  
  return account;
}
```

## Error Handling Patterns

### Try-Catch with Specific Errors

```typescript
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    // Validate input
    const input = new InputParser().parse(args);
    
    // Fetch data
    const data = await fetchData(input);
    
    // Check if data exists
    if (!data) {
      return notFoundError('Account', input.accountId);
    }
    
    // Process and return
    const result = processData(data);
    return success(result);
    
  } catch (err) {
    // Handle specific error types
    if (err instanceof ValidationError) {
      return validationError(err.message);
    }
    
    if (err instanceof ApiError) {
      return apiError('API call failed', err);
    }
    
    // Generic error handling
    return errorFromCatch(err);
  }
}
```

### Early Returns for Validation

```typescript
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  // Validate and return early on errors
  if (!args.accountId) {
    return validationError('accountId is required');
  }
  
  if (!validateUUID(args.accountId)) {
    return validationError('accountId must be a valid UUID');
  }
  
  // Continue with main logic
  try {
    const data = await fetchData(args.accountId);
    return success(data);
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

## Testing Patterns

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

describe('tool-name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('should return success for valid input', async () => {
      const result = await handler({
        accountId: 'valid-uuid',
      });
      
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should return error for missing accountId', async () => {
      const result = await handler({} as any);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('accountId');
    });

    it('should return error for invalid UUID', async () => {
      const result = await handler({
        accountId: 'not-a-uuid',
      });
      
      expect(result.isError).toBe(true);
    });
  });
});
```

### Mocking External Dependencies

```typescript
import { vi } from 'vitest';
import * as actualApi from '../../actual-api.js';

// Mock the module
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
}));

describe('DataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch accounts', async () => {
    // Setup mock
    const mockAccounts = [
      { id: '1', name: 'Checking', balance: 1000 },
    ];
    vi.mocked(actualApi.getAccounts).mockResolvedValue(mockAccounts);
    
    // Test
    const fetcher = new DataFetcher();
    const result = await fetcher.fetchAccounts();
    
    // Verify
    expect(result).toEqual(mockAccounts);
    expect(actualApi.getAccounts).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    // Setup mock to throw error
    vi.mocked(actualApi.getAccounts).mockRejectedValue(
      new Error('API error')
    );
    
    // Test
    const fetcher = new DataFetcher();
    
    // Verify
    await expect(fetcher.fetchAccounts()).rejects.toThrow('API error');
  });
});
```

### Testing with Fixtures

```typescript
// test-fixtures.ts
export const mockAccount = {
  id: 'acc-123',
  name: 'Checking',
  balance: 100000,
  closed: false,
};

export const mockTransaction = {
  id: 'txn-123',
  account: 'acc-123',
  amount: -5000,
  date: '2024-01-15',
  payee: 'pay-123',
  category: 'cat-123',
};

// test file
import { mockAccount, mockTransaction } from './test-fixtures.js';

it('should process transaction', () => {
  const result = processTransaction(mockTransaction, mockAccount);
  expect(result).toBeDefined();
});
```

## Performance Patterns

### Parallel Execution

```typescript
// ✅ Good - Parallel execution
const [accounts, categories, payees] = await Promise.all([
  fetchAccounts(),
  fetchCategories(),
  fetchPayees(),
]);

// ❌ Bad - Sequential execution
const accounts = await fetchAccounts();
const categories = await fetchCategories();
const payees = await fetchPayees();
```

### Lazy Loading

```typescript
export class ReportGenerator {
  private categoryMap?: Map<string, Category>;
  
  private getCategoryMap(categories: Category[]): Map<string, Category> {
    // Lazy load and cache
    if (!this.categoryMap) {
      this.categoryMap = new Map(
        categories.map(cat => [cat.id, cat])
      );
    }
    return this.categoryMap;
  }
  
  generate(data: ReportData): string {
    const categoryMap = this.getCategoryMap(data.categories);
    // Use categoryMap for lookups
  }
}
```

### Batch Processing

```typescript
export function enrichTransactions(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): EnrichedTransaction[] {
  // Create lookup maps once
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  
  // Process all transactions using the maps
  return transactions.map(txn => ({
    ...txn,
    accountName: accountMap.get(txn.account)?.name,
    categoryName: categoryMap.get(txn.category)?.name,
  }));
}
```

### Memoization

```typescript
import { memoize } from '../../core/utils/memoize.js';

export class Calculator {
  // Memoize expensive calculations
  private calculateTotal = memoize((transactions: Transaction[]) => {
    return transactions.reduce((sum, txn) => sum + txn.amount, 0);
  });
  
  getTotal(transactions: Transaction[]): number {
    return this.calculateTotal(transactions);
  }
}
```

## Anti-Patterns to Avoid

### ❌ Don't Use `any` Type

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data format');
}
```

### ❌ Don't Ignore Errors

```typescript
// ❌ Bad
try {
  await riskyOperation();
} catch (err) {
  // Silent failure
}

// ✅ Good
try {
  await riskyOperation();
} catch (err) {
  console.error('Operation failed:', err);
  return errorFromCatch(err);
}
```

### ❌ Don't Create Duplicate Code

```typescript
// ❌ Bad - Duplicate validation in each tool
export function handler1(args: Args) {
  if (!args.accountId || !validateUUID(args.accountId)) {
    return error('Invalid accountId');
  }
  // ...
}

export function handler2(args: Args) {
  if (!args.accountId || !validateUUID(args.accountId)) {
    return error('Invalid accountId');
  }
  // ...
}

// ✅ Good - Shared validation
export class AccountValidator {
  static validate(accountId: string): void {
    if (!accountId || !validateUUID(accountId)) {
      throw new Error('Invalid accountId');
    }
  }
}

export function handler1(args: Args) {
  AccountValidator.validate(args.accountId);
  // ...
}
```

### ❌ Don't Mix Concerns

```typescript
// ❌ Bad - Mixing data fetching, processing, and formatting
export async function handler(args: Args) {
  const accounts = await api.getAccounts();
  let total = 0;
  let markdown = '# Report\n\n';
  for (const account of accounts) {
    total += account.balance;
    markdown += `- ${account.name}: $${account.balance}\n`;
  }
  return success(markdown);
}

// ✅ Good - Separated concerns
export async function handler(args: Args) {
  const accounts = await new DataFetcher().fetchAccounts();
  const total = new Calculator().calculateTotal(accounts);
  const markdown = new ReportGenerator().generate(accounts, total);
  return success(markdown);
}
```

## Summary

Following these patterns ensures:
- **Consistency** across the codebase
- **Maintainability** for future developers
- **Testability** of all components
- **Performance** optimization
- **Error handling** that helps users

For more details, see:
- [Architecture Documentation](../ARCHITECTURE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Development Guide](./DEVELOPMENT.md)
