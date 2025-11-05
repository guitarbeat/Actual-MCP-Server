# Design Document

## Overview

This design document outlines the technical approach for improving tool quality in the Actual Budget MCP Server. The improvements focus on consistency, usability, and performance without adding new tools or breaking existing functionality. The design follows the existing modular architecture and maintains backward compatibility.

## Architecture

### High-Level Design Principles

1. **Incremental Enhancement**: Improve existing tools without breaking changes
2. **Modular Components**: Create reusable formatters and validators
3. **Backward Compatible**: Maintain existing tool interfaces
4. **Performance First**: Improvements should not degrade performance
5. **Type Safe**: Leverage TypeScript for compile-time safety

### Component Overview

```
src/
├── core/
│   ├── response/
│   │   ├── formatters/           # NEW: Response formatters
│   │   │   ├── table-formatter.ts
│   │   │   ├── entity-formatter.ts
│   │   │   └── summary-formatter.ts
│   │   ├── validators/           # NEW: Response validators
│   │   │   └── response-validator.ts
│   │   └── metadata/             # NEW: Response metadata
│   │       └── metadata-builder.ts
│   ├── validation/               # NEW: Enhanced validation
│   │   ├── batch-validator.ts
│   │   ├── fuzzy-matcher.ts
│   │   └── validation-rules.ts
│   ├── performance/
│   │   ├── baselines.ts          # NEW: Performance baselines
│   │   ├── trend-analyzer.ts     # NEW: Trend detection
│   │   └── performance-budgets.ts # NEW: Per-tool budgets
│   ├── cache/
│   │   ├── cache-warmer.ts       # NEW: Proactive cache warming
│   │   ├── granular-keys.ts      # NEW: Granular cache key builder
│   │   └── prefetch-strategy.ts  # NEW: Smart prefetching
│   └── analytics/                # NEW: Usage analytics
│       ├── usage-tracker.ts
│       └── analytics-reporter.ts
└── tools/
    └── [existing tools with enhanced schemas]
```

## Components and Interfaces

### 1. Response Formatters

#### TableFormatter

Standardizes markdown table generation across all tools.

```typescript
interface TableColumn {
  header: string;
  key: string;
  align?: 'left' | 'right' | 'center';
  formatter?: (value: any) => string;
}

interface TableOptions {
  title?: string;
  metadata?: Record<string, string>;
  summary?: string;
}

class TableFormatter {
  /**
   * Generate a standardized markdown table
   */
  format<T>(
    data: T[],
    columns: TableColumn[],
    options?: TableOptions
  ): string;
  
  /**
   * Generate metadata section
   */
  private formatMetadata(metadata: Record<string, string>): string;
  
  /**
   * Generate table header with alignment
   */
  private formatHeader(columns: TableColumn[]): string;
  
  /**
   * Generate table rows
   */
  private formatRows<T>(data: T[], columns: TableColumn[]): string;
}
```

**Usage Example**:
```typescript
const formatter = new TableFormatter();
const markdown = formatter.format(
  transactions,
  [
    { header: 'Date', key: 'date', align: 'left' },
    { header: 'Payee', key: 'payee', align: 'left' },
    { header: 'Amount', key: 'amount', align: 'right', formatter: formatAmount },
  ],
  {
    title: 'Filtered Transactions',
    metadata: {
      'Date Range': `${startDate} to ${endDate}`,
      'Matching': `${filtered.length}/${total}`,
    },
    summary: `Total: ${formatAmount(sum)}`,
  }
);
```

#### EntityFormatter

Standardizes entity display for write operations.

```typescript
interface EntityFormatOptions {
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { before: any; after: any }>;
  relatedEntities?: Array<{ type: string; id: string; name: string }>;
}

class EntityFormatter {
  /**
   * Format entity operation result
   */
  format(options: EntityFormatOptions): string;
  
  /**
   * Format changes for update operations
   */
  private formatChanges(changes: Record<string, { before: any; after: any }>): string;
  
  /**
   * Format related entities affected
   */
  private formatRelatedEntities(entities: Array<{ type: string; id: string; name: string }>): string;
}
```

**Usage Example**:
```typescript
const formatter = new EntityFormatter();
const message = formatter.format({
  operation: 'update',
  entityType: 'transaction',
  entityId: 'abc123',
  entityName: 'Amazon purchase',
  changes: {
    amount: { before: 45.99, after: 50.00 },
    category: { before: 'Shopping', after: 'Books' },
  },
});
// Output:
// ✓ Updated transaction 'Amazon purchase' (abc123)
// 
// Changes:
// • amount: $45.99 → $50.00
// • category: Shopping → Books
```

#### SummaryFormatter

Standardizes aggregation and summary display.

```typescript
interface SummarySection {
  title: string;
  items: Array<{ label: string; value: string | number; formatter?: (v: any) => string }>;
}

class SummaryFormatter {
  /**
   * Format summary sections
   */
  format(sections: SummarySection[]): string;
  
  /**
   * Format a single summary item
   */
  private formatItem(label: string, value: any, formatter?: (v: any) => string): string;
}
```

### 2. Enhanced Error Handling

#### FuzzyMatcher

Provides entity name suggestions when lookups fail.

```typescript
interface MatchResult {
  name: string;
  score: number;
  id: string;
}

class FuzzyMatcher {
  /**
   * Find similar entity names using Levenshtein distance
   */
  findSimilar(
    query: string,
    candidates: Array<{ id: string; name: string }>,
    maxResults?: number,
    threshold?: number
  ): MatchResult[];
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number;
  
  /**
   * Normalize string for comparison (lowercase, trim, remove special chars)
   */
  private normalize(str: string): string;
}
```

**Usage Example**:
```typescript
const matcher = new FuzzyMatcher();
const payees = await fetchAllPayees();
const suggestions = matcher.findSimilar('Amazn', payees, 3, 0.7);

if (suggestions.length > 0) {
  throw notFoundError('payee', 'Amazn', {
    suggestions: suggestions.map(s => s.name),
    message: `Did you mean: ${suggestions.map(s => s.name).join(', ')}?`,
  });
}
```

#### BatchValidator

Collects all validation errors before failing.

```typescript
interface ValidationError {
  field: string;
  message: string;
  example?: string;
}

class BatchValidator {
  private errors: ValidationError[] = [];
  
  /**
   * Add a validation error
   */
  addError(field: string, message: string, example?: string): void;
  
  /**
   * Check if there are any errors
   */
  hasErrors(): boolean;
  
  /**
   * Get all errors
   */
  getErrors(): ValidationError[];
  
  /**
   * Throw if there are errors
   */
  throwIfErrors(): void;
  
  /**
   * Format errors for display
   */
  formatErrors(): string;
}
```

**Usage Example**:
```typescript
const validator = new BatchValidator();

if (!args.account) {
  validator.addError('account', 'Account is required', 'Example: "Checking" or account ID');
}

if (!args.date) {
  validator.addError('date', 'Date is required', 'Example: "2024-01-15"');
}

if (args.amount && args.amount === 0) {
  validator.addError('amount', 'Amount cannot be zero', 'Example: 45.99 or -45.99');
}

validator.throwIfErrors();
// Throws with all errors at once:
// Validation failed:
// • account: Account is required (Example: "Checking" or account ID)
// • date: Date is required (Example: "2024-01-15")
// • amount: Amount cannot be zero (Example: 45.99 or -45.99)
```

### 3. Response Metadata

#### MetadataBuilder

Adds context to tool responses.

```typescript
interface ResponseMetadata {
  dataSource: 'cache' | 'api';
  cacheAge?: number;
  timestamp: number;
  filtered?: { count: number; total: number };
  truncated?: { shown: number; total: number; suggestion: string };
  calculation?: { method: string; parameters: Record<string, any> };
}

class MetadataBuilder {
  private metadata: Partial<ResponseMetadata> = {};
  
  /**
   * Set data source
   */
  setDataSource(source: 'cache' | 'api', cacheAge?: number): this;
  
  /**
   * Set filter information
   */
  setFiltered(count: number, total: number): this;
  
  /**
   * Set truncation information
   */
  setTruncated(shown: number, total: number, suggestion: string): this;
  
  /**
   * Set calculation method
   */
  setCalculation(method: string, parameters: Record<string, any>): this;
  
  /**
   * Build metadata object
   */
  build(): ResponseMetadata;
  
  /**
   * Format metadata as markdown
   */
  formatAsMarkdown(): string;
}
```

**Usage Example**:
```typescript
const metadata = new MetadataBuilder()
  .setDataSource('cache', 120000) // 2 minutes old
  .setFiltered(45, 120)
  .build();

const markdown = `# Transactions

${metadata.formatAsMarkdown()}

[table data...]
`;

// Output includes:
// Data source: Cache (2 minutes old)
// Showing: 45 of 120 transactions
```

### 4. Performance Enhancements

#### PerformanceBaselines

Establishes and tracks performance baselines.

```typescript
interface PerformanceBudget {
  tool: string;
  baseline: number;
  warning: number;
  critical: number;
}

class PerformanceBaselines {
  private baselines: Map<string, PerformanceBudget>;
  
  /**
   * Initialize baselines from configuration
   */
  constructor(budgets: PerformanceBudget[]);
  
  /**
   * Check if duration exceeds budget
   */
  checkBudget(tool: string, duration: number): {
    status: 'ok' | 'warning' | 'critical';
    budget: PerformanceBudget;
    percentOver: number;
  };
  
  /**
   * Update baseline based on recent performance
   */
  updateBaseline(tool: string, recentDurations: number[]): void;
  
  /**
   * Get budget for a tool
   */
  getBudget(tool: string): PerformanceBudget | undefined;
}
```

**Configuration**:
```typescript
const budgets: PerformanceBudget[] = [
  { tool: 'get-transactions', baseline: 180, warning: 250, critical: 400 },
  { tool: 'spending-by-category', baseline: 650, warning: 900, critical: 1500 },
  { tool: 'monthly-summary', baseline: 1200, warning: 1800, critical: 3000 },
  { tool: 'manage-transaction', baseline: 250, warning: 400, critical: 600 },
  // ... more tools
];
```

#### TrendAnalyzer

Detects performance regressions over time.

```typescript
interface PerformanceTrend {
  tool: string;
  current: number;
  average7d: number;
  average30d: number;
  trend: 'improving' | 'stable' | 'degrading';
  percentChange: number;
}

class TrendAnalyzer {
  /**
   * Analyze performance trends for a tool
   */
  analyzeTrend(tool: string, metrics: PerformanceMetric[]): PerformanceTrend;
  
  /**
   * Detect anomalies in performance
   */
  detectAnomalies(tool: string, metrics: PerformanceMetric[]): boolean;
  
  /**
   * Calculate rolling average
   */
  private calculateRollingAverage(metrics: PerformanceMetric[], days: number): number;
}
```

### 5. Cache Improvements

#### CacheWarmer

Proactively loads frequently accessed data.

```typescript
interface WarmingStrategy {
  key: string;
  fetcher: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

class CacheWarmer {
  private strategies: WarmingStrategy[];
  
  /**
   * Register a warming strategy
   */
  register(strategy: WarmingStrategy): void;
  
  /**
   * Warm cache on server startup
   */
  async warmOnStartup(): Promise<void>;
  
  /**
   * Warm cache after write operations
   */
  async warmAfterWrite(affectedKeys: string[]): Promise<void>;
  
  /**
   * Execute warming strategies in priority order
   */
  private async executeStrategies(strategies: WarmingStrategy[]): Promise<void>;
}
```

**Configuration**:
```typescript
const warmer = new CacheWarmer();

// High priority - always needed
warmer.register({
  key: 'accounts:all',
  fetcher: () => fetchAllAccounts(),
  priority: 'high',
});

warmer.register({
  key: 'categories:grouped',
  fetcher: () => fetchAllCategoryGroups(),
  priority: 'high',
});

// Medium priority - frequently needed
warmer.register({
  key: 'payees:all',
  fetcher: () => fetchAllPayees(),
  priority: 'medium',
});

// Low priority - occasionally needed
warmer.register({
  key: 'rules:all',
  fetcher: () => fetchAllRules(),
  priority: 'low',
});
```

#### GranularCacheKeys

Builds specific cache keys for targeted invalidation.

```typescript
class GranularCacheKeys {
  /**
   * Build cache key for transactions
   */
  static transactions(accountId?: string, startDate?: string, endDate?: string): string {
    if (accountId && startDate && endDate) {
      return `transactions:${accountId}:${startDate}:${endDate}`;
    }
    if (accountId) {
      return `transactions:${accountId}`;
    }
    return 'transactions:all';
  }
  
  /**
   * Build cache key for accounts
   */
  static accounts(filter?: 'on-budget' | 'off-budget' | 'closed'): string {
    return filter ? `accounts:${filter}` : 'accounts:all';
  }
  
  /**
   * Build cache key for categories
   */
  static categories(grouped?: boolean): string {
    return grouped ? 'categories:grouped' : 'categories:flat';
  }
  
  /**
   * Get all keys matching a pattern
   */
  static getMatchingKeys(pattern: string): string[] {
    // Returns all cache keys matching the pattern
    // e.g., 'transactions:*' returns all transaction cache keys
  }
  
  /**
   * Invalidate keys matching pattern
   */
  static invalidatePattern(pattern: string): void {
    const keys = this.getMatchingKeys(pattern);
    keys.forEach(key => cacheService.invalidate(key));
  }
}
```

**Usage Example**:
```typescript
// Fetch with granular key
const key = GranularCacheKeys.transactions('account123', '2024-01', '2024-12');
const transactions = await cacheService.getOrFetch(key, () => 
  fetchTransactions('account123', '2024-01', '2024-12')
);

// Invalidate only affected transactions
await updateTransaction('account123', transactionId, updates);
GranularCacheKeys.invalidatePattern(`transactions:account123:*`);
```

### 6. Usage Analytics

#### UsageTracker

Tracks tool usage patterns and failures.

```typescript
interface UsageMetric {
  tool: string;
  timestamp: number;
  success: boolean;
  errorType?: string;
  duration: number;
}

interface UsagePattern {
  sequence: string[];
  count: number;
  avgDuration: number;
}

class UsageTracker {
  private metrics: UsageMetric[] = [];
  private patterns: Map<string, UsagePattern> = new Map();
  
  /**
   * Record tool usage
   */
  record(tool: string, success: boolean, duration: number, errorType?: string): void;
  
  /**
   * Get usage statistics for a tool
   */
  getToolStats(tool: string): {
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    commonErrors: Array<{ type: string; count: number }>;
  };
  
  /**
   * Detect usage patterns (tool sequences)
   */
  detectPatterns(): UsagePattern[];
  
  /**
   * Identify unused tools
   */
  getUnusedTools(threshold: number): string[];
  
  /**
   * Generate usage report
   */
  generateReport(): string;
}
```

## Data Models

### Enhanced Tool Schema

```typescript
interface EnhancedToolSchema {
  name: string;
  description: string;
  useCases: string[];           // NEW: Common use cases
  examples: ToolExample[];      // NEW: Example invocations
  relatedTools: string[];       // NEW: Related tool names
  category: ToolCategory;       // NEW: Tool category
  inputSchema: {
    type: string;
    properties: Record<string, EnhancedPropertySchema>;
    required?: string[];
  };
}

interface EnhancedPropertySchema {
  type: string;
  description: string;
  examples?: string[];          // NEW: Example values
  pattern?: string;
  default?: any;
  enum?: any[];
}

interface ToolExample {
  description: string;
  input: Record<string, any>;
  output: string;
}

type ToolCategory = 
  | 'data-retrieval'
  | 'analysis'
  | 'mutation'
  | 'entity-management'
  | 'automation';
```

### Performance Budget Configuration

```typescript
interface PerformanceBudgetConfig {
  budgets: PerformanceBudget[];
  thresholds: {
    slowOperationMs: number;
    criticalOperationMs: number;
    regressionPercent: number;
  };
  trending: {
    windowDays: number;
    alertThreshold: number;
  };
}
```

### Cache Configuration

```typescript
interface CacheConfig {
  warming: {
    enabled: boolean;
    onStartup: boolean;
    afterWrite: boolean;
    strategies: WarmingStrategy[];
  };
  granularity: {
    enabled: boolean;
    keyBuilder: typeof GranularCacheKeys;
  };
  prefetch: {
    enabled: boolean;
    relatedEntities: Record<string, string[]>;
  };
}
```

## Error Handling

### Enhanced Error Types

```typescript
// Extend existing error builders

interface NotFoundErrorOptions {
  entityType: string;
  identifier: string;
  suggestions?: string[];      // NEW: Fuzzy match suggestions
  searchTip?: string;          // NEW: How to search
}

interface ValidationErrorOptions {
  field: string;
  message: string;
  example?: string;            // NEW: Example value
  acceptedFormats?: string[];  // NEW: List of formats
  relatedFields?: string[];    // NEW: Related fields
}

interface ApiErrorOptions {
  operation: string;
  details: string;
  suggestion: string;
  retryable: boolean;          // NEW: Can user retry?
  relatedDocs?: string;        // NEW: Link to docs
}
```

## Testing Strategy

### Unit Tests

1. **Response Formatters**
   - Test table generation with various data types
   - Test metadata formatting
   - Test edge cases (empty data, null values)

2. **Validation**
   - Test batch validation with multiple errors
   - Test fuzzy matching with various inputs
   - Test validation rules for all field types

3. **Performance**
   - Test baseline calculations
   - Test trend detection
   - Test budget checking

4. **Cache**
   - Test cache warming strategies
   - Test granular key generation
   - Test invalidation patterns

### Integration Tests

1. **End-to-End Tool Execution**
   - Test tools with new formatters
   - Verify response consistency
   - Verify metadata inclusion

2. **Error Scenarios**
   - Test error messages with suggestions
   - Test batch validation in real tools
   - Verify error consistency

3. **Performance**
   - Benchmark tools with new infrastructure
   - Verify no performance regression
   - Test cache warming effectiveness

### Performance Tests

1. **Baseline Establishment**
   - Run benchmark suite for all tools
   - Record baseline metrics
   - Verify budgets are realistic

2. **Cache Effectiveness**
   - Measure cache hit rates
   - Measure latency improvement
   - Test warming strategies

## Migration Strategy

### Phase 1: Foundation (Week 1)

1. Create response formatters
2. Implement cache warming
3. Add performance baselines
4. No breaking changes

### Phase 2: Tool Updates (Week 2-3)

1. Update 5 tools per day with new formatters
2. Enhance error messages incrementally
3. Add tool examples and use cases
4. Maintain backward compatibility

### Phase 3: Advanced Features (Week 4)

1. Implement usage analytics
2. Add response validation
3. Implement trend analysis
4. Create performance dashboard

### Rollback Plan

- All changes are additive
- Old response formats still work
- Feature flags for new functionality
- Can disable enhancements per-tool

## Performance Considerations

### Response Formatters

- **Impact**: Minimal (<5ms overhead)
- **Mitigation**: Cache formatted templates
- **Benefit**: Consistency worth the cost

### Fuzzy Matching

- **Impact**: 10-20ms for entity lookup failures
- **Mitigation**: Only run on errors (rare)
- **Benefit**: Better UX on errors

### Cache Warming

- **Impact**: 200-500ms startup time
- **Mitigation**: Async warming, non-blocking
- **Benefit**: 30-50% faster first requests

### Usage Analytics

- **Impact**: <1ms per tool call
- **Mitigation**: Async recording, batched writes
- **Benefit**: Data-driven optimization

## Security Considerations

### Input Validation

- Batch validation doesn't expose internal structure
- Fuzzy matching limited to prevent enumeration attacks
- Error messages don't leak sensitive data

### Cache

- Cache keys don't include sensitive data
- Cache warming respects permissions
- Granular keys prevent data leakage

### Analytics

- Usage data anonymized
- No PII in analytics
- Configurable retention period

## Monitoring and Observability

### Metrics to Track

1. **Response Quality**
   - Format consistency rate
   - Metadata inclusion rate
   - Error message quality score

2. **Performance**
   - Tool execution time (p50, p95, p99)
   - Cache hit rate
   - Warming effectiveness

3. **Usage**
   - Tool invocation frequency
   - Error rates by tool
   - Common tool sequences

### Logging

```typescript
// Enhanced logging format
[TOOL] get-transactions | duration: 245ms | status: success | cache: hit | filtered: 45/120
[ERROR] manage-transaction | validation failed | fields: [account, date] | suggestions: provided
[PERF] monthly-summary | 1823ms | baseline: 1200ms | +52% ⚠️ | trend: degrading
[CACHE] warming complete | 6 strategies | 450ms | hit rate: 78%
```

## Documentation Updates

### README.md

- Add section on response formats
- Document error message structure
- Explain performance budgets
- Show cache configuration

### ARCHITECTURE.md

- Document new core modules
- Explain formatter patterns
- Describe validation strategy
- Show cache architecture

### Tool Documentation

- Add use cases to each tool
- Include examples for all parameters
- Document related tools
- Show common error scenarios

## Success Criteria

### Quantitative

- ✅ 100% of tools use standard formatters
- ✅ 90% of errors include suggestions
- ✅ Cache hit rate >70%
- ✅ First request latency <400ms
- ✅ No performance regression (within 5%)

### Qualitative

- ✅ LLMs select correct tool on first try
- ✅ Users understand error messages
- ✅ Developers can easily add new tools
- ✅ Performance issues detected proactively
- ✅ Code maintainability improved

## Future Enhancements

### Beyond This Spec

1. **Response Streaming**: Stream large result sets
2. **Adaptive Caching**: ML-based cache strategy
3. **Tool Composition**: Chain tools automatically
4. **Smart Defaults**: Learn user preferences
5. **A/B Testing**: Test response format variations
