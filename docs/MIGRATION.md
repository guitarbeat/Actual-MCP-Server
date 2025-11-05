# Migration Guide

This guide helps developers migrate from the pre-refactoring codebase to the new refactored architecture. The refactoring was completed in phases to maintain backward compatibility while improving code organization, reducing duplication, and establishing consistent patterns.

## Table of Contents

- [Overview](#overview)
- [What Changed](#what-changed)
- [Breaking Changes](#breaking-changes)
- [Old vs New Patterns](#old-vs-new-patterns)
- [Deprecated Functions](#deprecated-functions)
- [Migration Steps](#migration-steps)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Overview

The refactoring focused on:
- **Eliminating code duplication** by centralizing common functionality
- **Standardizing tool structure** for consistency
- **Improving type safety** with centralized type definitions
- **Enhancing error handling** with specialized error builders
- **Maintaining backward compatibility** through re-exports

**Good News:** Most existing code continues to work without changes due to backward-compatible re-exports. However, we recommend migrating to the new patterns for better maintainability.

## What Changed

### Phase 1: Core Infrastructure Setup

**New Modules Created:**
- `src/core/response/` - Centralized response and error builders
- `src/core/formatting/` - Date and amount formatting utilities
- Enhanced `src/core/input/` - Common validators and parsers

**Impact:** Low - Old imports still work via re-exports

### Phase 2: Tool Standardization

**Changes:**
- Tool registration moved to registry pattern in `src/tools/index.ts`
- All tools updated to use core response builders
- Standardized tool structure (input-parser, data-fetcher, report-generator)
- Removed duplicate code from individual tools

**Impact:** Medium - Internal tool structure changed, but external API unchanged

### Phase 3: Type Consolidation

**Changes:**
- Types reorganized in `src/core/types/`
- Zod schemas centralized in `src/core/types/schemas.ts`
- Tool argument types moved to `src/core/types/tool-args.ts`
- Response types moved to `src/core/types/responses.ts`

**Impact:** Low - Old type imports still work via re-exports

## Breaking Changes

### None! 🎉

The refactoring was designed to maintain 100% backward compatibility. All existing code should continue to work without modifications.

However, some patterns are now **deprecated** and should be migrated to the new patterns for future maintainability.

## Old vs New Patterns

### Pattern 1: Response Building

#### Old Pattern (Still Works)

```typescript
// Using local response builders
import { success, error } from '../../utils/response.js';

export async function handler(args: ToolArgs) {
  try {
    const result = await doSomething(args);
    return success(result);
  } catch (err) {
    return error('Operation failed');
  }
}
```

#### New Pattern (Recommended)

```typescript
// Using core response builders with better error handling
import { success, errorFromCatch } from '../../core/response/index.js';
import { validationError, notFoundError } from '../../core/response/error-builder.js';

export async function handler(args: ToolArgs) {
  // Validate early with specific errors
  if (!args.accountId) {
    return validationError('accountId is required');
  }
  
  try {
    const result = await doSomething(args);
    return success(result);
  } catch (err) {
    // Better error handling with context
    return errorFromCatch(err, {
      fallbackMessage: 'Operation failed',
      suggestion: 'Check your input and try again',
    });
  }
}
```

**Benefits:**
- Consistent error messages across all tools
- Automatic error suggestions
- Better error context for debugging
- Type-safe response building

### Pattern 2: Input Validation

#### Old Pattern (Still Works)

```typescript
// Manual validation in each tool
export async function handler(args: ToolArgs) {
  if (!args.accountId) {
    return error('accountId is required');
  }
  
  if (!/^[0-9a-f-]{36}$/.test(args.accountId)) {
    return error('accountId must be a valid UUID');
  }
  
  // Continue with logic...
}
```

#### New Pattern (Recommended)

```typescript
// Using core validators
import { validateUUID, validateMonth } from '../../core/input/validators.js';
import { validationError } from '../../core/response/error-builder.js';

export async function handler(args: ToolArgs) {
  if (!args.accountId) {
    return validationError('accountId is required');
  }
  
  if (!validateUUID(args.accountId)) {
    return validationError('accountId must be a valid UUID', {
      field: 'accountId',
      value: args.accountId,
    });
  }
  
  // Continue with logic...
}
```

**Benefits:**
- Consistent validation logic
- Reusable validators
- Better error messages with field context
- Easier to test

### Pattern 3: Date Formatting

#### Old Pattern (Still Works)

```typescript
// Importing from utils.ts
import { formatDate, formatDateRange } from '../../utils.js';

const formatted = formatDate(new Date());
```

#### New Pattern (Recommended)

```typescript
// Importing from core/formatting
import { formatDate, formatDateRange } from '../../core/formatting/index.js';

const formatted = formatDate(new Date());
```

**Benefits:**
- Clearer module organization
- Easier to find formatting utilities
- Better separation of concerns

### Pattern 4: Amount Formatting

#### Old Pattern (Still Works)

```typescript
// Importing from utils.ts
import { formatAmount } from '../../utils.js';

const formatted = formatAmount(125000); // "$1,250.00"
```

#### New Pattern (Recommended)

```typescript
// Importing from core/formatting
import { formatAmount } from '../../core/formatting/amount-formatter.js';

const formatted = formatAmount(125000); // "$1,250.00"
```

**Benefits:**
- Dedicated module for amount formatting
- Easier to extend with currency support
- Better organization

### Pattern 5: Data Fetching

#### Old Pattern (Mixed Approaches)

```typescript
// Some tools fetched data directly
import * as api from '../../actual-api.js';

export async function handler(args: ToolArgs) {
  const accounts = await api.getAccounts();
  const transactions = await api.getTransactions({
    accountId: args.accountId,
    startDate: args.startDate,
    endDate: args.endDate,
  });
  
  // Process data...
}
```

#### New Pattern (Recommended)

```typescript
// Using core data fetchers with caching
import { fetchAccounts } from '../../core/data/fetch-accounts.js';
import { fetchTransactions } from '../../core/data/fetch-transactions.js';

export async function handler(args: ToolArgs) {
  // Fetch in parallel with automatic caching
  const [accounts, transactions] = await Promise.all([
    fetchAccounts(),
    fetchTransactions([args.accountId], args.startDate, args.endDate),
  ]);
  
  // Process data...
}
```

**Benefits:**
- Automatic caching for better performance
- Parallel execution support
- Consistent error handling
- Performance metrics tracking

### Pattern 6: Category Mapping

#### Old Pattern (Duplicate Code)

```typescript
// Each tool had its own category mapper
class LocalCategoryMapper {
  mapCategories(categories: Category[]) {
    // Duplicate mapping logic
  }
}
```

#### New Pattern (Recommended)

```typescript
// Using core category mapper
import { CategoryMapper } from '../../core/mapping/category-mapper.js';

export class DataProcessor {
  private categoryMapper = new CategoryMapper();
  
  process(data: Data) {
    const mapped = this.categoryMapper.mapCategories(data.categories);
    // Use mapped categories...
  }
}
```

**Benefits:**
- Single source of truth for category mapping
- Consistent behavior across all tools
- Easier to maintain and test
- No code duplication

### Pattern 7: Tool Structure

#### Old Pattern (Inconsistent)

```typescript
// Some tools had everything in index.ts
export async function handler(args: ToolArgs) {
  // Validation
  if (!args.accountId) return error('Missing accountId');
  
  // Data fetching
  const accounts = await api.getAccounts();
  const transactions = await api.getTransactions(...);
  
  // Processing
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Report generation
  let markdown = '# Report\n\n';
  markdown += `Total: ${total}\n`;
  
  return success(markdown);
}
```

#### New Pattern (Recommended)

```typescript
// Modular structure with separated concerns
// index.ts
import { InputParser } from './input-parser.js';
import { DataFetcher } from './data-fetcher.js';
import { ReportGenerator } from './report-generator.js';

export async function handler(args: ToolArgs) {
  try {
    const input = new InputParser().parse(args);
    const data = await new DataFetcher().fetchAll(input);
    const report = new ReportGenerator().generate(data);
    
    return successWithContent({ type: 'text', text: report });
  } catch (err) {
    return errorFromCatch(err);
  }
}

// input-parser.ts
export class InputParser {
  parse(args: ToolArgs): ParsedInput {
    // Validation logic
  }
}

// data-fetcher.ts
export class DataFetcher {
  async fetchAll(input: ParsedInput): Promise<Data> {
    // Data fetching logic
  }
}

// report-generator.ts
export class ReportGenerator {
  generate(data: Data): string {
    // Report generation logic
  }
}
```

**Benefits:**
- Clear separation of concerns
- Easier to test each component
- Reusable components
- Better maintainability

### Pattern 8: Error Handling

#### Old Pattern (Generic Errors)

```typescript
export async function handler(args: ToolArgs) {
  try {
    const account = await api.getAccount(args.accountId);
    if (!account) {
      return error('Account not found');
    }
    // ...
  } catch (err) {
    return error('Something went wrong');
  }
}
```

#### New Pattern (Recommended)

```typescript
import { notFoundError, apiError, errorFromCatch } from '../../core/response/index.js';

export async function handler(args: ToolArgs) {
  try {
    const account = await api.getAccount(args.accountId);
    
    if (!account) {
      return notFoundError('Account', args.accountId, {
        suggestion: 'Use get-accounts to list available accounts',
      });
    }
    
    // ...
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError('Failed to fetch account', err, {
        operation: 'getAccount',
        accountId: args.accountId,
      });
    }
    
    return errorFromCatch(err);
  }
}
```

**Benefits:**
- Specific error types for different scenarios
- Helpful suggestions for users
- Better error context for debugging
- Consistent error format

## Deprecated Functions

The following functions are deprecated but still work via re-exports. Migrate to the new locations for better maintainability.

### Response Builders

| Deprecated Import | New Import | Status |
|------------------|------------|--------|
| `import { success } from '../../utils/response.js'` | `import { success } from '../../core/response/index.js'` | ⚠️ Deprecated |
| `import { error } from '../../utils/response.js'` | `import { error } from '../../core/response/index.js'` | ⚠️ Deprecated |
| `import { errorFromCatch } from '../../utils/response.js'` | `import { errorFromCatch } from '../../core/response/index.js'` | ⚠️ Deprecated |

### Formatting Utilities

| Deprecated Import | New Import | Status |
|------------------|------------|--------|
| `import { formatDate } from '../../utils.js'` | `import { formatDate } from '../../core/formatting/index.js'` | ⚠️ Deprecated |
| `import { formatAmount } from '../../utils.js'` | `import { formatAmount } from '../../core/formatting/index.js'` | ⚠️ Deprecated |
| `import { formatDateRange } from '../../utils.js'` | `import { formatDateRange } from '../../core/formatting/index.js'` | ⚠️ Deprecated |

### Validators

| Deprecated Import | New Import | Status |
|------------------|------------|--------|
| `import { validateUUID } from '../../utils/validators.js'` | `import { validateUUID } from '../../core/input/validators.js'` | ⚠️ Deprecated |
| `import { validateMonth } from '../../utils/validators.js'` | `import { validateMonth } from '../../core/input/validators.js'` | ⚠️ Deprecated |

### Type Definitions

| Deprecated Import | New Import | Status |
|------------------|------------|--------|
| `import type { Account } from '../../types.js'` | `import type { Account } from '../../core/types/domain.js'` | ⚠️ Deprecated |
| `import type { Transaction } from '../../types.js'` | `import type { Transaction } from '../../core/types/domain.js'` | ⚠️ Deprecated |
| `import type { Category } from '../../types.js'` | `import type { Category } from '../../core/types/domain.js'` | ⚠️ Deprecated |

**Note:** All deprecated imports still work and will continue to work. However, we recommend migrating to the new imports for better code organization and future maintainability.

## Migration Steps

### Step 1: Update Imports (Optional but Recommended)

Run a find-and-replace in your codebase:

```bash
# Response builders
find src -name "*.ts" -exec sed -i '' 's|from.*utils/response|from "../../core/response/index|g' {} \;

# Formatting utilities
find src -name "*.ts" -exec sed -i '' 's|formatDate.*from.*utils\.js|formatDate } from "../../core/formatting/index.js|g' {} \;

# Validators
find src -name "*.ts" -exec sed -i '' 's|from.*utils/validators|from "../../core/input/validators|g' {} \;
```

Or update manually as you work on each file.

### Step 2: Adopt New Error Handling Patterns

Replace generic errors with specific error builders:

```typescript
// Before
return error('Account not found');

// After
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts',
});
```

### Step 3: Use Core Data Fetchers

Replace direct API calls with core data fetchers:

```typescript
// Before
const accounts = await api.getAccounts();

// After
import { fetchAccounts } from '../../core/data/fetch-accounts.js';
const accounts = await fetchAccounts();
```

### Step 4: Refactor Tool Structure (For New Tools)

When creating new tools, follow the modular structure:

```
src/tools/my-new-tool/
├── index.ts              # Schema + handler
├── input-parser.ts       # Validation
├── data-fetcher.ts       # Data retrieval
├── report-generator.ts   # Response formatting
└── types.ts              # Tool-specific types
```

### Step 5: Run Tests

After migration, verify everything still works:

```bash
# Run all tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run full quality check
npm run quality
```

### Step 6: Update Documentation

Update any tool-specific documentation to reflect the new patterns.

## Troubleshooting

### Issue: Import Errors After Migration

**Symptom:**
```
Error: Cannot find module '../../core/response/index.js'
```

**Solution:**
1. Verify the file path is correct relative to your current file
2. Ensure you're using `.js` extension in imports (TypeScript requirement)
3. Check that the module exists: `ls src/core/response/`

### Issue: Type Errors After Migration

**Symptom:**
```
Type 'CallToolResult' is not assignable to type 'Promise<CallToolResult>'
```

**Solution:**
Make sure your handler function is marked as `async` and returns `Promise<CallToolResult>`:

```typescript
export async function handler(args: ToolArgs): Promise<CallToolResult> {
  // ...
}
```

### Issue: Tests Failing After Migration

**Symptom:**
```
TypeError: Cannot read property 'parse' of undefined
```

**Solution:**
Update your test mocks to match the new module structure:

```typescript
// Before
vi.mock('../../utils/response.js');

// After
vi.mock('../../core/response/index.js');
```

### Issue: Circular Dependency Warnings

**Symptom:**
```
Warning: Circular dependency detected
```

**Solution:**
1. Check your import statements for circular references
2. Use type-only imports when possible: `import type { ... }`
3. Consider extracting shared types to a separate file

### Issue: Cache Not Working

**Symptom:**
Data fetching seems slower than expected

**Solution:**
1. Verify cache is enabled: `CACHE_ENABLED=true` in `.env`
2. Check cache TTL: `CACHE_TTL_SECONDS=300` (5 minutes)
3. Ensure you're using core data fetchers, not direct API calls
4. Check cache statistics in logs

### Issue: Error Messages Not Showing Suggestions

**Symptom:**
Error responses don't include helpful suggestions

**Solution:**
Use specialized error builders instead of generic `error()`:

```typescript
// Instead of
return error('Account not found');

// Use
return notFoundError('Account', accountId, {
  suggestion: 'Use get-accounts to list available accounts',
});
```

### Issue: Performance Regression

**Symptom:**
Tools seem slower after migration

**Solution:**
1. Ensure you're using parallel fetching with `Promise.all()`
2. Verify caching is enabled
3. Run performance benchmarks: `npm run benchmark`
4. Check for sequential API calls that could be parallelized

### Issue: Build Errors

**Symptom:**
```
error TS2307: Cannot find module or its corresponding type declarations
```

**Solution:**
1. Run `npm install` to ensure all dependencies are installed
2. Run `npm run build` to compile TypeScript
3. Check `tsconfig.json` for correct module resolution settings
4. Verify all imports use `.js` extensions

## FAQ

### Q: Do I need to migrate my existing code immediately?

**A:** No. All existing code continues to work due to backward-compatible re-exports. Migrate gradually as you work on each file or when adding new features.

### Q: Will the old imports stop working in the future?

**A:** The old imports will continue to work for the foreseeable future. However, we recommend migrating to the new patterns for better maintainability and to take advantage of new features.

### Q: How do I know which pattern to use for a new tool?

**A:** Follow the examples in `docs/PATTERNS.md` and look at recently refactored tools like `get-transactions`, `spending-by-category`, or `monthly-summary` for reference.

### Q: What if I find a bug in the refactored code?

**A:** Please open an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Any error messages or logs

### Q: Can I mix old and new patterns?

**A:** Yes, but it's not recommended. Mixing patterns can make the codebase harder to maintain. Try to be consistent within each file or module.

### Q: How do I test my migrated code?

**A:** Follow the testing patterns in `docs/PATTERNS.md`:
1. Write unit tests for each component
2. Use Vitest for testing
3. Mock external dependencies
4. Test happy path, edge cases, and error cases

### Q: Where can I find more examples?

**A:** Check these resources:
- `docs/PATTERNS.md` - Common patterns and examples
- `ARCHITECTURE.md` - Architecture overview
- `CONTRIBUTING.md` - Contribution guidelines
- Existing tools in `src/tools/` - Real-world examples

### Q: What if I need help with migration?

**A:** You can:
1. Check this migration guide
2. Review the architecture documentation
3. Look at examples in the codebase
4. Open a discussion on GitHub
5. Ask in the project's communication channels

### Q: How do I verify my migration was successful?

**A:** Run these checks:
1. `npm test` - All tests pass
2. `npm run type-check` - No TypeScript errors
3. `npm run lint` - No linting errors
4. `npm run quality` - Full quality check passes
5. Manual testing of affected tools

### Q: Are there any performance benefits to migrating?

**A:** Yes! The new patterns include:
- Automatic caching for frequently accessed data
- Parallel data fetching support
- Performance metrics tracking
- Optimized data structures

### Q: What about custom tools I've added?

**A:** Custom tools should continue to work. When you're ready, migrate them to the new patterns following this guide and the examples in `docs/PATTERNS.md`.

## Additional Resources

- [Architecture Documentation](../ARCHITECTURE.md) - Detailed architecture overview
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute
- [Common Patterns](./PATTERNS.md) - Code patterns and examples
- [Development Guide](./DEVELOPMENT.md) - Development setup and workflow
- [Performance Guide](./PERFORMANCE.md) - Performance optimization tips

## Summary

The refactoring improves code organization, reduces duplication, and establishes consistent patterns while maintaining full backward compatibility. You can migrate gradually at your own pace, and all existing code continues to work.

**Key Takeaways:**
- ✅ No breaking changes - existing code still works
- ✅ Migrate gradually as you work on each file
- ✅ Use new patterns for better maintainability
- ✅ Follow examples in recently refactored tools
- ✅ Run tests after migration to verify everything works

Happy coding! 🚀
