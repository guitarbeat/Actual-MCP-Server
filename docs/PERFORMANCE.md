# Performance Optimization

This document provides detailed information about the performance optimizations implemented in the Actual Budget MCP Server.

## Overview

The performance optimization work focuses on four key areas:

1. **Persistent API Connection** - Single connection maintained throughout server lifetime
2. **Intelligent Caching** - In-memory caching of frequently accessed data
3. **Parallel Data Fetching** - Concurrent execution of multi-account queries
4. **Optimized Enrichment** - Efficient transaction enrichment with lookup table reuse

## Architecture

### Persistent API Connection

The server maintains a single persistent connection to the Actual Budget API throughout its lifetime, eliminating the overhead of repeated initialization and shutdown cycles.

**Connection Lifecycle:**

```
Server Startup → initActualApi() [once] → Persistent Connection → shutdownActualApi() [on exit]
                                                    │
                                                    ├─> Tool Call 1 (50-200ms)
                                                    ├─> Tool Call 2 (50-200ms)
                                                    ├─> Tool Call N (50-200ms)
```

**Performance Impact:**

| Scenario | Before (ms) | After (ms) | Improvement |
|----------|-------------|------------|-------------|
| Single tool call (cold start) | 600-2200 | 600-2200 | 0% (same) |
| Single tool call (warm) | 600-2200 | 50-200 | 70-90% |
| 3 consecutive calls | 1800-6600 | 150-600 | 75-90% |
| 10 consecutive calls | 6000-22000 | 500-2000 | 90-92% |

**Overhead Eliminated Per Request:**
- API initialization: 400-1800ms
- Budget download: 100-400ms
- API shutdown: 100-300ms
- **Total saved**: 600-2500ms per request

**When Initialization Overhead is Eliminated:**

The persistent connection eliminates initialization overhead for all requests after the first one:

1. **First Request (Cold Start)**: Full initialization required (600-2200ms)
   - Connect to Actual server
   - Download budget file
   - Initialize API state
   - Execute tool (50-200ms)

2. **Subsequent Requests (Warm)**: No initialization needed (50-200ms)
   - Connection already established
   - Budget already loaded
   - Execute tool immediately

This means:
- **Single isolated request**: No benefit (same as before)
- **2+ consecutive requests**: 70-90% faster for requests 2+
- **Long-running sessions**: Consistent fast response times
- **Interactive workflows**: Dramatically improved user experience

### Cache Layer

The cache layer uses an LRU (Least Recently Used) eviction strategy with configurable TTL:

```
CacheService
├── accounts cache (TTL: 5 min)
├── categories cache (TTL: 5 min)
├── categoryGroups cache (TTL: 5 min)
├── payees cache (TTL: 5 min)
└── statistics tracker
```

**Key Features:**
- Automatic cache invalidation on write operations
- Configurable TTL per cache entry
- Cache statistics tracking (hits, misses, hit rate)
- Can be disabled for debugging

### Parallel Fetching

Transaction queries across multiple accounts execute concurrently using `Promise.all()`:

```typescript
// Before: Sequential fetching
for (const account of accounts) {
  const transactions = await fetchTransactions(account);
  allTransactions.push(...transactions);
}

// After: Parallel fetching
const results = await Promise.all(
  accounts.map(account => fetchTransactions(account))
);
const allTransactions = results.flat();
```

**Benefits:**
- 50%+ reduction in multi-account query time
- Graceful handling of partial failures
- Maintains data consistency

### Optimized Enrichment

Transaction enrichment (adding payee names, category names) now reuses lookup tables:

```typescript
// Before: Fetch lookups for each transaction batch
async function enrichTransactions(transactions) {
  const payees = await fetchPayees();
  const categories = await fetchCategories();
  return transactions.map(t => enrich(t, payees, categories));
}

// After: Reuse cached lookups
const payees = await fetchPayees(); // Cached
const categories = await fetchCategories(); // Cached
for (const batch of batches) {
  enrichTransactionsBatch(batch, { payees, categories });
}
```

**Benefits:**
- <100ms enrichment time for 1000+ transactions
- Reduced API calls
- Lower memory usage

## Configuration

### Environment Variables

```bash
# Cache Configuration
CACHE_ENABLED=true                      # Enable/disable caching (default: true)
CACHE_TTL_SECONDS=300                   # Cache TTL in seconds (default: 300 = 5 minutes)
CACHE_MAX_ENTRIES=1000                  # Maximum cache entries (default: 1000)

# Performance Monitoring
PERFORMANCE_LOGGING_ENABLED=true        # Enable performance logging (default: true)
PERFORMANCE_LOG_THRESHOLD_MS=1000       # Log operations slower than this (default: 1000ms)
PERFORMANCE_CACHE_STATS_INTERVAL_MS=300000  # Cache stats logging interval (default: 5 minutes)
```

### Cache TTL Recommendations

| Data Type | Default TTL | Rationale |
|-----------|-------------|-----------|
| Accounts | 5 minutes | Account structure rarely changes |
| Categories | 5 minutes | Category structure rarely changes |
| Category Groups | 5 minutes | Groups rarely change |
| Payees | 5 minutes | Payees change occasionally |
| Transactions | Not cached | Transactions change frequently |

## Performance Targets

Based on real-world testing, the optimization provides:

| Metric | Target | Typical Result |
|--------|--------|----------------|
| Consecutive Tool Calls | 70-90% faster | 75-90% faster |
| Multi-Account Query Improvement | 50% reduction | 50-60% reduction |
| Cache Hit Rate | >80% | 85-95% |
| Transaction Enrichment (1000+ txns) | <100ms | 30-80ms |
| Memory Usage (1000 entries) | <50MB | 20-40MB |
| Cache Operation Overhead | <5ms | 1-3ms |
| Persistent Connection Overhead | <10MB | 10-20MB |

## Benchmarking

### Running Benchmarks

```bash
# Run optimization benchmarks (includes persistent connection tests)
npm run benchmark

# Run refactoring performance monitoring
npm run perf:monitor

# Save performance baseline
npm run perf:baseline

# Compare with baseline
npm run perf:compare
```

### Benchmark Tests

1. **Persistent connection performance** - Measures consecutive tool call improvements
2. **Multi-account queries (cache disabled)** - Baseline performance
3. **Multi-account queries (cache enabled)** - Optimized performance
4. **Cache hit rate** - Verifies cache effectiveness
5. **Transaction enrichment** - Validates enrichment performance

### Example Output

```
🚀 Starting Performance Benchmarks

Configuration:
  - Target reduction: 50%
  - Cache hit rate target: 80%
  - Enrichment target: <100ms for 1000+ transactions
  - Iterations: 3

📊 Benchmark 1: Multi-account queries (cache disabled)
  ✓ Multi-account query (no cache): 2450.32ms
    - accounts: 5
    - iterations: 3
    - dateRange: 2024-08-04 to 2024-11-04

📊 Benchmark 2: Multi-account queries (cache enabled)
  ✓ Multi-account query (with cache): 1180.15ms
    - iterations: 3
    - dateRange: 2024-08-04 to 2024-11-04

📈 Performance Improvement Analysis
  ✓ Performance improvement: 0ms
    - noCacheDuration: 2450.32ms
    - withCacheDuration: 1180.15ms
    - improvement: 51.85%
    - target: 50%
    - passed: YES

📊 Benchmark 3: Cache hit rate
  ✓ Cache hit rate: 0ms
    - hitRate: 90.00%
    - target: 80%
    - hits: 27
    - misses: 3
    - passed: YES

📊 Benchmark 4: Transaction enrichment
  ✓ Transaction enrichment: 45.23ms
    - transactionCount: 1523
    - totalDuration: 45.23ms
    - perTransaction: 0.030ms
    - target: <100ms for 1000+ transactions
    - passed: YES

============================================================
📊 BENCHMARK SUMMARY
============================================================
Total Tests: 4
Passed: 4 ✓
Failed: 0 ✗

Cache Statistics:
  Hits: 27
  Misses: 3
  Hit Rate: 90.00%

============================================================
✅ All benchmarks passed!
```

## Troubleshooting

### Slow First Request

**Symptoms:**
- First tool call takes 600-2200ms
- Subsequent calls are much faster

**Explanation:**
This is expected behavior with persistent connections. The first request must:
- Connect to Actual server
- Download budget file
- Initialize API state

Subsequent requests reuse the connection and are 70-90% faster.

**Solutions:**
- This is normal and optimal behavior
- Consider the first request as a "warm-up"
- For testing, run a dummy request first to establish the connection

### Connection Not Persisting

**Symptoms:**
- Every request takes 600-2200ms
- No performance improvement for consecutive calls
- Logs show repeated initialization

**Solutions:**
1. Verify the server is running continuously (not restarting between requests)
2. Check that `shutdownActualApi()` is not being called after each request
3. Review server logs for unexpected shutdown/restart events
4. Ensure you're not in test mode (`--test-resources` or `--test-custom`)

### Cache Not Working

**Symptoms:**
- Repeated queries take the same amount of time
- Cache hit rate is 0%

**Solutions:**
1. Verify `CACHE_ENABLED=true` in environment
2. Enable performance logging: `PERFORMANCE_LOGGING_ENABLED=true`
3. Check logs for cache statistics
4. Restart the server to clear any cache corruption

### Slow Query Performance

**Symptoms:**
- Queries are slower than expected
- Multi-account queries don't show improvement

**Solutions:**
1. Verify caching is enabled
2. Check if parallel fetching is working (look for concurrent operations in logs)
3. Increase `CACHE_TTL_SECONDS` if data doesn't change frequently
4. Review performance logs to identify bottlenecks

### High Memory Usage

**Symptoms:**
- Server memory usage is high
- Out of memory errors

**Solutions:**
1. Reduce `CACHE_MAX_ENTRIES` to limit cache size
2. Reduce `CACHE_TTL_SECONDS` to expire entries more quickly
3. Disable caching: `CACHE_ENABLED=false`
4. Monitor cache statistics to see entry count

### Stale Data

**Symptoms:**
- Changes don't appear immediately
- Data seems outdated

**Solutions:**
1. Verify write operations are invalidating cache (check logs)
2. Reduce `CACHE_TTL_SECONDS` for more frequent updates
3. Restart server to clear cache
4. Temporarily disable cache to verify behavior

### Debugging Cache Behavior

To debug cache-related issues:

```bash
# Enable detailed logging
PERFORMANCE_LOGGING_ENABLED=true
PERFORMANCE_LOG_THRESHOLD_MS=0

# Disable cache to compare behavior
CACHE_ENABLED=false
```

## Implementation Details

### Files Modified

**Persistent Connection:**
- `src/index.ts` - Server lifecycle with persistent connection
- `src/tools/index.ts` - Removed per-request shutdown
- `src/resources.ts` - Removed per-request shutdown
- `src/persistent-connection.integration.test.ts` - Integration tests
- `src/persistent-connection.benchmark.test.ts` - Performance benchmarks

**Core Infrastructure:**
- `src/core/cache/cache-service.ts` - Cache service implementation
- `src/core/cache/cache-service.test.ts` - Cache service tests
- `src/core/performance/metrics-tracker.ts` - Performance metrics tracking
- `src/core/performance/metrics-tracker.test.ts` - Metrics tracker tests
- `src/core/performance/performance-logger.ts` - Performance logging

**Data Fetchers:**
- `src/core/data/fetch-accounts.ts` - Cache-aware account fetching
- `src/core/data/fetch-categories.ts` - Cache-aware category fetching
- `src/core/data/fetch-payees.ts` - Cache-aware payee fetching
- `src/core/data/fetch-transactions.ts` - Parallel transaction fetching

**Cache Invalidation:**
- `src/core/api/cache-invalidation.test.ts` - Cache invalidation tests
- `src/actual-api.ts` - Write operations with cache invalidation

**Tools:**
- `src/tools/monthly-summary/` - Updated to use optimized fetchers
- `src/tools/spending-by-category/` - Updated to use optimized fetchers
- `src/tools/balance-history/` - Updated to use optimized fetchers

### Testing

**Unit Tests:**
- Cache service: 14 tests
- Metrics tracker: 14 tests
- Parallel fetching: 24 tests
- Cache invalidation: 15 tests
- Data fetchers: 24 tests
- Tool/resource handlers: Updated to not expect shutdown

**Integration Tests:**
- Persistent connection lifecycle: 2 tests
- Consecutive tool calls: 1 test
- Tool execution with caching: 7 tests
- Cache invalidation on writes: 15 tests
- Performance improvements: Benchmark script

**Performance Tests:**
- Persistent connection benchmarks: 2 tests
- Cache performance benchmarks: 2 tests

**Total:** 230+ tests passing

## Backward Compatibility

The optimization maintains full backward compatibility:

- All existing tool interfaces unchanged
- All response formats identical
- All error handling preserved
- Can be disabled via `CACHE_ENABLED=false`

## Future Improvements

Potential areas for further optimization:

1. **Connection Health Monitoring** - Periodically check connection health and reconnect if needed
2. **Redis Cache** - Replace in-memory cache with Redis for multi-instance deployments
3. **Query Result Caching** - Cache common query results (e.g., monthly summaries)
4. **Streaming Responses** - Stream large result sets instead of buffering
5. **Connection Pooling** - Pool Actual API connections for multi-budget scenarios
6. **Incremental Updates** - Update cache incrementally instead of full invalidation
7. **Request Queuing** - Queue requests during reconnection instead of failing

## Refactoring Performance Monitoring

The codebase includes comprehensive performance monitoring for refactoring activities to ensure no performance regressions are introduced.

### Monitoring Tools

**Refactoring Performance Monitor** (`scripts/refactoring-performance-monitor.ts`):
- Tests all major tools across multiple iterations
- Compares performance against saved baseline
- Identifies regressions automatically
- Generates detailed performance reports

### Usage

```bash
# Establish baseline before refactoring
npm run perf:baseline

# Monitor performance during refactoring
npm run perf:monitor

# Compare with baseline after changes
npm run perf:compare
```

### Performance Reports

Performance reports are saved in JSON format and include:
- Per-tool execution times (avg, min, max)
- Regression analysis vs baseline
- Statistical summaries
- Trend identification

See [Performance Monitoring Guide](../.kiro/specs/code-refactoring/performance-monitoring-guide.md) for detailed information.

## References

- [Persistent API Connection Requirements](../.kiro/specs/persistent-api-connection/requirements.md)
- [Persistent API Connection Design](../.kiro/specs/persistent-api-connection/design.md)
- [Persistent API Connection Tasks](../.kiro/specs/persistent-api-connection/tasks.md)
- [Performance Optimization Requirements](../.kiro/specs/performance-optimization/requirements.md)
- [Performance Optimization Design](../.kiro/specs/performance-optimization/design.md)
- [Performance Optimization Tasks](../.kiro/specs/performance-optimization/tasks.md)
- [Refactoring Performance Monitoring Guide](../.kiro/specs/code-refactoring/performance-monitoring-guide.md)
- [Performance Comparison Report](../.kiro/specs/code-refactoring/performance-comparison-report.md)
- [Benchmark Script](../scripts/benchmark-performance.ts)
- [Refactoring Performance Monitor](../scripts/refactoring-performance-monitor.ts)
