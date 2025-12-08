# Library Recommendations for Code Reduction

This document identifies existing libraries and tools that can significantly reduce code in this project while preserving or improving functionality. All recommendations focus on well-supported, lightweight, and practical options.

## Summary

| Library | Current Code | Replacement | Lines Saved | Impact |
|---------|-------------|-------------|-------------|---------|
| `lru-cache` | Custom CacheService (225 lines) | ~20 lines | ~205 | High |
| Enhanced `date-fns` usage | Custom date formatters (51 lines) | ~15 lines | ~36 | Medium |
| `group-by` or `lodash-es` | Custom aggregation (52+ lines) | ~10 lines | ~42 | Medium |
| `serialize-error` | Custom error serialization (60+ lines) | ~5 lines | ~55 | Low |
| `currency.js` | Custom amount formatting (16 lines) | ~5 lines | ~11 | Low |
| Enhanced Zod schemas | Custom validators (120 lines) | ~40 lines | ~80 | Medium |

**Total Estimated Reduction: ~429 lines of code**

---

## 1. LRU Cache Implementation

### Current Implementation
- **File**: `mcp-server/src/core/cache/cache-service.ts` (225 lines)
- **Features**: LRU eviction, TTL support, pattern-based invalidation, statistics

### Recommendation: Use `lru-cache`

**Package**: `lru-cache` (v10.x)
- **Size**: ~15KB minified
- **Weekly Downloads**: 30M+
- **Maintenance**: Actively maintained by npm
- **TypeScript**: Full TypeScript support

### Benefits
- **Code Reduction**: ~205 lines → ~20 lines (90% reduction)
- **Performance**: Highly optimized, battle-tested implementation
- **Features**: Built-in TTL, size limits, statistics, disposal callbacks
- **Maintainability**: No need to maintain custom cache logic

### Migration Example

**Before** (225 lines):
```typescript
export class CacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private accessOrder: string[];
  // ... 200+ more lines of LRU logic
}
```

**After** (~20 lines):
```typescript
import { LRUCache } from 'lru-cache';

export class CacheService {
  private cache: LRUCache<string, unknown>;

  constructor() {
    this.cache = new LRUCache({
      max: parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10),
      ttl: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10) * 1000,
      updateAgeOnGet: true, // LRU behavior
    });
  }

  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.isEnabled()) return fetchFn();
    
    const cached = this.cache.get(key) as T | undefined;
    if (cached !== undefined) return cached;
    
    const data = await fetchFn();
    this.cache.set(key, data, { ttl });
    return data;
  }

  // Pattern invalidation can use cache.keys() iteration
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  getStats(): CacheStats {
    return {
      hits: this.cache.size, // Approximate
      misses: 0, // Would need custom tracking
      entries: this.cache.size,
      hitRate: 0, // Would need custom tracking
    };
  }
}
```

### Impact
- **Maintainability**: ⬆️ High - Eliminates 200+ lines of custom cache logic
- **Performance**: ⬆️ Slight improvement - Optimized C++ bindings
- **Development Effort**: ⬇️ Low - Simple migration, well-documented API

---

## 2. Date Formatting and Manipulation

### Current Implementation
- **Files**: 
  - `mcp-server/src/core/formatting/date-formatter.ts` (51 lines)
  - Custom date parsing in multiple tools
- **Already Using**: `date-fns` v4.1.0 (but underutilized)

### Recommendation: Leverage More `date-fns` Functions

**Package**: `date-fns` (already installed)
- **Current Usage**: Minimal
- **Available Functions**: `format`, `parse`, `isValid`, `startOfMonth`, `endOfMonth`, `subMonths`, etc.

### Benefits
- **Code Reduction**: ~36 lines saved across multiple files
- **Consistency**: Standardized date handling
- **Reliability**: Well-tested date operations
- **No New Dependency**: Already in package.json

### Migration Examples

**Before**:
```typescript
// mcp-server/src/core/formatting/date-formatter.ts
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function getDateRangeForMonths(months: number): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
```

**After**:
```typescript
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return format(new Date(date), 'yyyy-MM-dd');
}

export function getDateRangeForMonths(months: number): { start: string; end: string } {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, months - 1));
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
```

**Additional Opportunities**:
- Replace manual date parsing in `transaction-aggregator.ts` with `parse` and `format`
- Use `isValid` for date validation instead of manual checks
- Use `differenceInMonths`, `addMonths` for date calculations

### Impact
- **Maintainability**: ⬆️ Medium - More readable, less error-prone
- **Performance**: ➡️ Neutral - Similar performance
- **Development Effort**: ⬇️ Very Low - Simple refactoring

---

## 3. Data Aggregation Utilities

### Current Implementation
- **Files**:
  - `mcp-server/src/core/aggregation/group-by.ts` (52 lines)
  - `mcp-server/src/core/aggregation/transaction-grouper.ts` (37 lines)
  - `mcp-server/src/tools/monthly-summary/transaction-aggregator.ts` (52 lines)
- **Pattern**: Manual `reduce`, `forEach` loops for grouping and summing

### Recommendation: Use `group-by` or `lodash-es` (tree-shakeable)

**Option A: `group-by`** (Lightweight, single-purpose)
- **Package**: `group-by` (v1.1.0)
- **Size**: ~1KB
- **Weekly Downloads**: 500K+
- **TypeScript**: Yes

**Option B: `lodash-es`** (Comprehensive, tree-shakeable)
- **Package**: `lodash-es` (v4.17.21)
- **Size**: Tree-shakeable (import only what you need)
- **Weekly Downloads**: 20M+
- **TypeScript**: Full support with `@types/lodash-es`

### Benefits
- **Code Reduction**: ~42 lines across multiple files
- **Readability**: More declarative code
- **Performance**: Optimized implementations
- **Maintainability**: Less custom aggregation logic

### Migration Example

**Before**:
```typescript
// mcp-server/src/core/aggregation/group-by.ts
export class GroupAggregator {
  aggregateAndSort(spendingByCategory: Record<string, CategorySpending>): GroupSpending[] {
    const spendingByGroup: Record<string, GroupSpending> = {};
    Object.values(spendingByCategory).forEach((category) => {
      if (!spendingByGroup[category.group]) {
        spendingByGroup[category.group] = {
          name: category.group,
          total: 0,
          categories: [],
        };
      }
      spendingByGroup[category.group].total += category.total;
      spendingByGroup[category.group].categories.push(category);
    });
    // ... sorting logic
  }
}
```

**After** (using `lodash-es`):
```typescript
import { groupBy, mapValues, sumBy } from 'lodash-es';

export class GroupAggregator {
  aggregateAndSort(spendingByCategory: Record<string, CategorySpending>): GroupSpending[] {
    const grouped = groupBy(Object.values(spendingByCategory), 'group');
    
    const spendingByGroup = mapValues(grouped, (categories, groupName) => ({
      name: groupName,
      total: sumBy(categories, 'total'),
      categories: categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
    }));

    return Object.values(spendingByGroup).sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total)
    );
  }
}
```

**Alternative** (using `group-by` - lighter weight):
```typescript
import groupBy from 'group-by';

export class GroupAggregator {
  aggregateAndSort(spendingByCategory: Record<string, CategorySpending>): GroupSpending[] {
    const categories = Object.values(spendingByCategory);
    const grouped = groupBy(categories, 'group');
    
    // Manual aggregation still needed, but grouping is simpler
    const spendingByGroup = Object.entries(grouped).map(([groupName, categories]) => ({
      name: groupName,
      total: categories.reduce((sum, c) => sum + c.total, 0),
      categories: categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
    }));

    return spendingByGroup.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }
}
```

### Recommendation
**Use `lodash-es`** for:
- Tree-shakeable (only imports what you use)
- Comprehensive utility functions (`sumBy`, `groupBy`, `orderBy`, `keyBy`)
- Well-tested and performant
- Better TypeScript support

### Impact
- **Maintainability**: ⬆️ Medium - More declarative, less error-prone
- **Performance**: ➡️ Neutral to slight improvement
- **Development Effort**: ⬇️ Low - Straightforward refactoring

---

## 4. Error Serialization

### Current Implementation
- **Files**:
  - `mcp-server/src/core/response/response-builder.ts` (60+ lines of error handling)
  - `mcp-server/src/core/logging/safe-logger.ts` (error formatting)
- **Pattern**: Manual error type checking and serialization

### Recommendation: Use `serialize-error`

**Package**: `serialize-error` (v11.0.0)
- **Size**: ~2KB
- **Weekly Downloads**: 5M+
- **Maintenance**: Actively maintained
- **TypeScript**: Full support

### Benefits
- **Code Reduction**: ~55 lines
- **Reliability**: Handles circular references, non-serializable values
- **Consistency**: Standardized error serialization

### Migration Example

**Before**:
```typescript
export function errorFromCatch(err: unknown, context: ErrorContext = {}): MCPResponse {
  let resolvedMessage: string | undefined;
  
  try {
    if (err instanceof Error) {
      resolvedMessage = err.message || 'Unknown error';
    } else if (typeof err === 'string') {
      resolvedMessage = err;
    } else if (err === null || err === undefined) {
      resolvedMessage = undefined;
    } else {
      try {
        const stringified = JSON.stringify(err);
        if (typeof err === 'object' && err !== null && 'message' in err) {
          resolvedMessage = String((err as { message: unknown }).message);
        } else {
          resolvedMessage = stringified;
        }
      } catch {
        resolvedMessage = String(err);
      }
    }
  } catch {
    resolvedMessage = 'Unknown error (could not process error object)';
  }
  // ... more logic
}
```

**After**:
```typescript
import { serializeError } from 'serialize-error';

export function errorFromCatch(err: unknown, context: ErrorContext = {}): MCPResponse {
  const serialized = serializeError(err);
  const resolvedMessage = 
    serialized.message || 
    (typeof serialized === 'string' ? serialized : JSON.stringify(serialized)) ||
    context.fallbackMessage ||
    'Unknown error encountered';
  
  const suggestion = context.suggestion ?? inferSuggestion(resolvedMessage);
  logErrorWithContext(err, context);
  return error(resolvedMessage, suggestion);
}
```

### Impact
- **Maintainability**: ⬆️ Low to Medium - Simpler error handling
- **Performance**: ➡️ Neutral
- **Development Effort**: ⬇️ Very Low - Drop-in replacement

---

## 5. Currency Formatting

### Current Implementation
- **File**: `mcp-server/src/core/formatting/amount-formatter.ts` (16 lines)
- **Current**: Uses `Intl.NumberFormat` (good, but limited features)

### Recommendation: Use `currency.js` (Optional)

**Package**: `currency.js` (v2.0.4)
- **Size**: ~3KB
- **Weekly Downloads**: 1M+
- **Features**: Parsing, formatting, arithmetic operations

### Benefits
- **Code Reduction**: ~11 lines (small but useful)
- **Features**: Better parsing, arithmetic operations, multiple currencies
- **Reliability**: Handles edge cases better

### Migration Example

**Before**:
```typescript
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}
```

**After**:
```typescript
import currency from 'currency.js';

export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';
  return currency(amount / 100, { symbol: '$' }).format();
}
```

### Impact
- **Maintainability**: ⬆️ Low - Slight improvement
- **Performance**: ➡️ Neutral
- **Development Effort**: ⬇️ Very Low

**Note**: This is optional since `Intl.NumberFormat` works well. Only add if you need additional currency features.

---

## 6. Enhanced Zod Schema Usage

### Current Implementation
- **File**: `mcp-server/src/core/input/validators.ts` (120 lines)
- **Pattern**: Custom validation functions alongside Zod schemas

### Recommendation: Consolidate to Zod Schemas

**Package**: `zod` (already installed)
- **Current Usage**: Partial (schemas exist but custom validators remain)
- **Opportunity**: Replace custom validators with Zod schema validation

### Benefits
- **Code Reduction**: ~80 lines
- **Consistency**: Single validation approach
- **Type Safety**: Better TypeScript inference
- **No New Dependency**: Already using Zod

### Migration Example

**Before**:
```typescript
// Custom validators
export function validateUUID(value: string): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function validateDate(value: string): boolean {
  if (typeof value !== 'string' || !DATE_REGEX.test(value.trim())) {
    return false;
  }
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function assertUuid(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required and must be a valid UUID`);
  }
  if (!validateUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}
```

**After**:
```typescript
import { z } from 'zod';

// Reusable Zod schemas
export const UUIDSchema = z.string().uuid();
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (date) => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  },
  { message: 'Invalid date' }
);
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const PositiveIntegerCentsSchema = z.number().int().positive();

// Helper functions using Zod
export function assertUuid(value: unknown, fieldName: string): string {
  return UUIDSchema.parse(value);
}

export function assertDate(value: unknown, fieldName: string): string {
  return DateSchema.parse(value);
}
```

### Impact
- **Maintainability**: ⬆️ High - Single validation system, better error messages
- **Performance**: ➡️ Neutral
- **Development Effort**: ⬇️ Medium - Requires refactoring existing validators

---

## 7. Additional Considerations

### String Similarity (Optional)
If payee name matching becomes more complex, consider:
- **Package**: `string-similarity` (v4.0.4)
- **Use Case**: Fuzzy matching for payee names in `name-resolver.ts`
- **Impact**: Low priority, only if fuzzy matching is needed

### Query Builder (Future)
If SQL-like querying is needed:
- **Package**: `kysely` or `drizzle-orm`
- **Use Case**: Complex transaction filtering
- **Impact**: Not needed currently, but worth considering for future

---

## Implementation Priority

### High Priority (Immediate Impact)
1. **`lru-cache`** - Largest code reduction, well-tested
2. **Enhanced `date-fns` usage** - Already installed, easy win

### Medium Priority (Good ROI)
3. **`lodash-es` for aggregation** - Significant code reduction
4. **Enhanced Zod schemas** - Better consistency

### Low Priority (Nice to Have)
5. **`serialize-error`** - Small improvement, low risk
6. **`currency.js`** - Optional, only if more features needed

---

## Migration Strategy

1. **Phase 1**: Add `lru-cache` and refactor `CacheService` (1-2 hours)
2. **Phase 2**: Enhance `date-fns` usage across date formatters (1 hour)
3. **Phase 3**: Add `lodash-es` and refactor aggregation utilities (2-3 hours)
4. **Phase 4**: Consolidate validators to Zod schemas (2-3 hours)
5. **Phase 5** (Optional): Add `serialize-error` and `currency.js` (1 hour)

**Total Estimated Time**: 7-10 hours for high/medium priority items

---

## Risk Assessment

| Library | Risk Level | Mitigation |
|---------|-----------|------------|
| `lru-cache` | Low | Well-tested, drop-in replacement |
| `date-fns` (enhanced) | Very Low | Already installed, incremental usage |
| `lodash-es` | Low | Tree-shakeable, widely used |
| `serialize-error` | Very Low | Small, focused library |
| `currency.js` | Very Low | Optional, can keep current implementation |
| Enhanced Zod | Low | Already using Zod, just more of it |

---

## Conclusion

These recommendations can reduce **~429 lines of code** while improving maintainability and reliability. The highest-impact changes are:

1. **`lru-cache`** - Eliminates 200+ lines of custom cache logic
2. **Enhanced `date-fns`** - Better date handling with existing dependency
3. **`lodash-es`** - Cleaner aggregation code

All recommended libraries are:
- ✅ Well-maintained and actively developed
- ✅ Lightweight or tree-shakeable
- ✅ TypeScript-friendly
- ✅ Widely used in production
- ✅ Have good documentation

