# Architecture Documentation

This document describes the architecture of the Actual Budget MCP Server after the comprehensive refactoring completed in Phase 1-3 of the code-refactoring spec.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Core Modules](#core-modules)
- [Tool Architecture](#tool-architecture)
- [Type System](#type-system)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Testing Strategy](#testing-strategy)

## Overview

The Actual Budget MCP Server is built on the Model Context Protocol (MCP) and provides LLM assistants with access to Actual Budget financial data. The architecture emphasizes:

- **Modularity**: Clear separation of concerns with reusable components
- **Type Safety**: Comprehensive TypeScript typing throughout
- **Consistency**: Standardized patterns across all tools
- **Performance**: Built-in caching and optimization
- **Maintainability**: Well-documented, testable code

## Design Principles

### 1. Single Responsibility Principle

Each module has a single, well-defined purpose:
- **Data Fetchers**: Retrieve data from Actual Budget API
- **Input Parsers**: Validate and parse tool arguments
- **Report Generators**: Format responses for LLM consumption
- **Response Builders**: Create consistent MCP responses

### 2. Don't Repeat Yourself (DRY)

Common functionality is centralized in the `core/` directory:
- Shared validators in `core/input/`
- Shared formatters in `core/formatting/`
- Shared mappers in `core/mapping/`
- Shared response builders in `core/response/`

### 3. Dependency Inversion

Tools depend on abstractions (interfaces) rather than concrete implementations, making them easier to test and modify.

### 4. Fail Fast

Input validation happens early in the request lifecycle, providing clear error messages before expensive operations.

## Core Modules

### Response Module (`src/core/response/`)

Centralizes all response building logic for consistent MCP responses.

**Key Files:**
- `response-builder.ts` - Success and error response builders
- `error-builder.ts` - Specialized error builders (validation, not found, API, permission)
- `types.ts` - Response type definitions

**Usage Example:**
```typescript
import { success, errorFromCatch } from '../../core/response/index.js';
import { validationError, notFoundError } from '../../core/response/error-builder.js';

// Success response
return success('Operation completed successfully');

// Validation error
return validationError('Invalid account ID', {
  field: 'accountId',
  value: accountId,
  expected: 'UUID format'
});

// Not found error
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts'
});

// Error from exception
try {
  // ... operation
} catch (err) {
  return errorFromCatch(err);
}
```

### Input Module (`src/core/input/`)

Provides validation and parsing utilities for tool arguments.

**Key Files:**
- `validators.ts` - Common validation functions (UUID, date, amount, month)
- `argument-parser.ts` - Generic argument parsing utilities

**Usage Example:**
```typescript
import { validateUUID, validateMonth } from '../../core/input/validators.js';

if (!validateUUID(accountId)) {
  return validationError('Invalid account ID format');
}

if (!validateMonth(month)) {
  return validationError('Month must be in YYYY-MM format');
}
```

### Formatting Module (`src/core/formatting/`)

Handles date and amount formatting consistently across the application.

**Key Files:**
- `date-formatter.ts` - Date formatting utilities
- `amount-formatter.ts` - Amount formatting utilities

**Usage Example:**
```typescript
import { formatDate, formatDateRange } from '../../core/formatting/index.js';
import { formatAmount } from '../../core/formatting/amount-formatter.js';

const formattedDate = formatDate(new Date());
const formattedAmount = formatAmount(125000); // "$1,250.00"
```

### Data Module (`src/core/data/`)

Centralized data fetching with caching and parallel execution support.

**Key Files:**
- `fetch-accounts.ts` - Account data fetching
- `fetch-categories.ts` - Category data fetching
- `fetch-payees.ts` - Payee data fetching
- `fetch-transactions.ts` - Transaction data fetching (with parallel support)
- `fetch-rules.ts` - Rule data fetching

**Features:**
- Automatic caching of frequently accessed data
- Parallel fetching for multi-account queries
- Consistent error handling
- Performance metrics tracking

### Cache Module (`src/core/cache/`)

LRU cache with TTL support for performance optimization.

**Key Features:**
- Configurable TTL (default: 5 minutes)
- Automatic cache invalidation on write operations
- Pattern-based invalidation for related data
- Cache statistics tracking (hit rate, miss rate)

**Configuration:**
```bash
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
CACHE_MAX_ENTRIES=1000
```

### Performance Module (`src/core/performance/`)

Performance monitoring and logging infrastructure.

**Key Files:**
- `metrics-tracker.ts` - Performance metrics collection
- `performance-logger.ts` - Centralized performance logging

**Features:**
- Operation timing
- Cache statistics
- Slow operation detection
- Periodic performance reports

### Mapping Module (`src/core/mapping/`)

Entity mapping and classification utilities.

**Key Files:**
- `category-mapper.ts` - Category mapping utilities
- `category-classifier.ts` - Income/expense/savings classification
- `transaction-mapper.ts` - Transaction enrichment

### Aggregation Module (`src/core/aggregation/`)

Data aggregation utilities for reporting.

**Key Files:**
- `group-by.ts` - Generic grouping utility
- `sort-by.ts` - Sorting utilities
- `sum-by.ts` - Summation utilities
- `transaction-grouper.ts` - Transaction grouping logic

### Types Module (`src/core/types/`)

Centralized type definitions and schemas.

**Key Files:**
- `domain.ts` - Core domain entities (Account, Transaction, Category, etc.)
- `schemas.ts` - Zod schemas for validation
- `tool-args.ts` - Tool argument types
- `responses.ts` - Response types

## Tool Architecture

### Standard Tool Structure

Every tool follows a consistent modular pattern:

```
src/tools/[tool-name]/
├── index.ts              # Schema + handler export (REQUIRED)
├── input-parser.ts       # Argument validation (if needed)
├── data-fetcher.ts       # Data retrieval (if needed)
├── report-generator.ts   # Response formatting (if needed)
└── types.ts              # Tool-specific types (if needed)
```

### Tool Index Pattern

Every tool's `index.ts` exports a schema and handler:

```typescript
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithContent, errorFromCatch } from '../../core/response/index.js';
import { ToolArgsSchema, type ToolArgs } from '../../core/types/index.js';
import type { ToolInput } from '../../types.js';

export const schema = {
  name: 'tool-name',
  description: 'Tool description',
  inputSchema: zodToJsonSchema(ToolArgsSchema) as ToolInput,
};

export async function handler(args: ToolArgs): Promise<CallToolResult> {
  try {
    // 1. Parse and validate input
    const input = new InputParser().parse(args);
    
    // 2. Fetch required data
    const data = await new DataFetcher().fetchAll(input);
    
    // 3. Process/transform data
    const processed = processData(data);
    
    // 4. Generate response
    const markdown = new ReportGenerator().generate(processed);
    
    return successWithContent({ type: 'text', text: markdown });
  } catch (err) {
    return errorFromCatch(err);
  }
}
```

### Tool Registration

Tools are registered in `src/tools/index.ts` using a registry pattern:

```typescript
interface ToolDefinition {
  schema: ToolSchema;
  handler: (args: unknown) => Promise<CallToolResult>;
  requiresWrite: boolean;
}

const toolRegistry: ToolDefinition[] = [
  { 
    schema: getTransactions.schema, 
    handler: getTransactions.handler, 
    requiresWrite: false 
  },
  // ... all other tools
];
```

This eliminates manual switch statements and provides:
- Automatic write permission checking
- Easy tool discovery
- Consistent error handling
- Simple tool addition process

## Type System

### Type Organization

Types are organized by purpose:

1. **Domain Types** (`core/types/domain.ts`)
   - Core entities: Account, Transaction, Category, Payee, etc.
   - Shared across multiple tools

2. **Schema Types** (`core/types/schemas.ts`)
   - Zod schemas for runtime validation
   - Generate TypeScript types automatically

3. **Tool Argument Types** (`core/types/tool-args.ts`)
   - Input types for each tool
   - Derived from Zod schemas

4. **Response Types** (`core/types/responses.ts`)
   - MCP response structures
   - Error payload formats

### Type Safety Benefits

- **Compile-time checking**: Catch errors before runtime
- **IDE support**: Better autocomplete and refactoring
- **Runtime validation**: Zod schemas validate at runtime
- **Self-documenting**: Types serve as documentation

## Error Handling

### Error Response Structure

All errors follow a consistent structure:

```typescript
interface ErrorPayload {
  error: true;
  message: string;
  suggestion: string;
}
```

### Error Types

1. **Validation Errors**: Invalid input format or missing required fields
2. **Not Found Errors**: Entity doesn't exist
3. **API Errors**: Actual Budget API failures
4. **Permission Errors**: Write access required but not enabled

### Error Suggestions

The response builder automatically infers helpful suggestions based on error messages:

```typescript
// Automatically suggests using get-accounts
return notFoundError('Account', accountId);

// Automatically suggests YYYY-MM format
return validationError('Invalid month format', { field: 'month' });
```

### Error Logging

All errors are logged with context:
- Tool name
- Input arguments
- Error message and stack trace
- Timestamp

## Performance Optimization

### Caching Strategy

**What's Cached:**
- Accounts (5 minute TTL)
- Categories (5 minute TTL)
- Category Groups (5 minute TTL)
- Payees (5 minute TTL)

**What's Not Cached:**
- Transactions (change frequently)
- Budget data (change frequently)

### Cache Invalidation

Write operations automatically invalidate related cache entries:

```typescript
// Creating a category invalidates category cache
await api.createCategory(data);
cacheService.invalidate('categories');
```

### Parallel Fetching

Multi-account transaction queries execute in parallel:

```typescript
const results = await Promise.all(
  accountIds.map(id => fetchTransactionsForAccount(id))
);
```

### Performance Targets

- **Multi-Account Queries**: 50% faster with caching
- **Cache Hit Rate**: >80% for accounts, categories, payees
- **Transaction Enrichment**: <100ms for 1000+ transactions
- **Cache Overhead**: <5ms per operation

## Testing Strategy

### Test Organization

Tests are co-located with source files using `.test.ts` naming:

```
src/core/response/
├── response-builder.ts
├── response-builder.test.ts
├── error-builder.ts
└── error-builder.test.ts
```

### Test Coverage Requirements

- **Core modules**: 90%+ coverage
- **Utility functions**: 100% coverage
- **Response builders**: 100% coverage
- **Validators**: 100% coverage

### Test Patterns

Each test suite includes:
1. **Happy path**: Expected use case
2. **Edge cases**: Boundary conditions
3. **Error cases**: Error handling

### Mocking Strategy

- External dependencies (Actual Budget API) are mocked
- Core utilities are tested with real implementations
- Integration tests verify end-to-end behavior

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:unit:watch

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

## Migration from Legacy Code

The refactoring maintained 100% backward compatibility:

1. **Gradual Migration**: Changes were made in phases
2. **Re-exports**: Old import paths still work via re-exports
3. **Regression Testing**: All existing tests pass
4. **Performance Benchmarks**: No performance degradation

### Backward Compatibility

Old code continues to work:

```typescript
// Old import (still works)
import { formatDate } from './utils.js';

// New import (preferred)
import { formatDate } from './core/formatting/index.js';
```

## Future Enhancements

Potential improvements for future consideration:

1. **Plugin System**: Allow external tools to be registered
2. **Tool Composition**: Combine multiple tools into workflows
3. **Response Streaming**: Stream large responses incrementally
4. **GraphQL API**: Add GraphQL layer on top of tools
5. **Tool Versioning**: Support multiple versions of tools

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Actual Budget API Documentation](https://actualbudget.org/docs/api/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Zod Documentation](https://zod.dev/)
