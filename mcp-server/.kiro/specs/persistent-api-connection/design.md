# Design Document

## Overview

This design document outlines the implementation approach for maintaining persistent API connections in the Actual Budget MCP Server. The current architecture initializes and shuts down the Actual Budget API for every tool call and resource request, causing significant performance overhead. This design eliminates that overhead by maintaining a single persistent connection throughout the server's lifetime.

## Architecture

### Current Architecture (Problem)

```
Request Flow (Current - Inefficient):
┌─────────────────┐
│  Tool Call 1    │
└────────┬────────┘
         │
         ├─> initActualApi()      [~500-2000ms]
         ├─> Execute Tool          [~50-200ms]
         └─> shutdownActualApi()   [~100-300ms]
         
┌─────────────────┐
│  Tool Call 2    │
└────────┬────────┘
         │
         ├─> initActualApi()      [~500-2000ms]  ← Redundant!
         ├─> Execute Tool          [~50-200ms]
         └─> shutdownActualApi()   [~100-300ms]  ← Wasteful!
```

**Total time for 2 calls**: ~2600-5000ms (initialization dominates)

### Proposed Architecture (Solution)

```
Server Lifecycle:
┌──────────────────────────────────────────────────────────┐
│  Server Startup                                          │
│  └─> initActualApi() [once]                             │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Persistent Connection (shared across requests) │    │
│  │                                                  │    │
│  │  Tool Call 1 ──> Execute [~50-200ms]           │    │
│  │  Tool Call 2 ──> Execute [~50-200ms]           │    │
│  │  Tool Call 3 ──> Execute [~50-200ms]           │    │
│  │  Resource 1  ──> Execute [~50-200ms]           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Server Shutdown                                         │
│  └─> shutdownActualApi() [once]                         │
└──────────────────────────────────────────────────────────┘
```

**Total time for 2 calls**: ~100-400ms (60-90% faster!)

## Components and Interfaces

### 1. API Connection Manager (`src/actual-api.ts`)

**Current State Variables:**
```typescript
let initialized = false;
let initializing = false;
let initializationError: Error | null = null;
```

**No Changes Needed**: The existing guard mechanism already prevents re-initialization. The `initActualApi()` function already has:
```typescript
if (initialized) return;  // ← This is perfect!
```

**Key Insight**: The infrastructure for persistent connections already exists. We just need to stop calling `shutdownActualApi()` after each request.

### 2. Tool Handler (`src/tools/index.ts`)

**Current Implementation (Problematic):**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    await initActualApi();  // ← Good
    // ... execute tool ...
    return result;
  } finally {
    await shutdownActualApi();  // ← BAD! Remove this!
  }
});
```

**Proposed Implementation:**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // initActualApi() is already called at server startup
    // Each wrapper function also calls it (with guard), so this is safe
    
    // ... execute tool ...
    return result;
  } catch (error) {
    return errorFromCatch(error);
  }
  // No finally block, no shutdown!
});
```

### 3. Resource Handler (`src/resources.ts`)

**Current Implementation (Problematic):**
```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    await initActualApi();  // ← Good
    // ... fetch resources ...
    return result;
  } finally {
    await shutdownActualApi();  // ← BAD! Remove this!
  }
});
```

**Proposed Implementation:**
```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    // initActualApi() is already called at server startup
    // ... fetch resources ...
    return result;
  } catch (error) {
    throw error;
  }
  // No finally block, no shutdown!
});
```

### 4. Server Lifecycle (`src/index.ts`)

**Current Implementation:**
```typescript
async function main(): Promise<void> {
  // ... validation ...
  
  if (!testResources && !testCustom) {
    try {
      await initActualApi();  // ← Good! Keep this!
      // ... logging ...
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  }
  
  // ... start server ...
}

process.on('SIGINT', () => {
  console.error('SIGINT received, shutting down server');
  // ... logging ...
  server.close();
  process.exit(0);  // ← Missing shutdownActualApi()!
});
```

**Proposed Implementation:**
```typescript
async function main(): Promise<void> {
  // ... validation ...
  
  if (!testResources && !testCustom) {
    try {
      await initActualApi();  // ← Keep this!
      // ... logging ...
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  }
  
  // ... start server ...
}

process.on('SIGINT', async () => {
  console.error('SIGINT received, shutting down server');
  
  // Log final performance summary and cache stats
  if (metricsTracker.isEnabled()) {
    console.error('');
    logPerformanceSummary();
  }
  
  if (cacheService.isEnabled()) {
    console.error('');
    logCacheStats();
  }
  
  // Stop periodic cache stats logging
  stopPeriodicCacheStatsLogging(cacheStatsInterval);
  
  // Shutdown API connection
  await shutdownActualApi();  // ← ADD THIS!
  
  server.close();
  process.exit(0);
});

// Also handle SIGTERM
process.on('SIGTERM', async () => {
  console.error('SIGTERM received, shutting down server');
  await shutdownActualApi();
  server.close();
  process.exit(0);
});
```

## Data Models

No new data models are required. The existing connection state management in `src/actual-api.ts` is sufficient:

```typescript
// Existing state (no changes needed)
let initialized = false;      // Connection is active
let initializing = false;     // Connection is being established
let initializationError: Error | null = null;  // Last error
```

## Error Handling

### Connection Initialization Errors

**Scenario**: API fails to initialize at server startup

**Handling**:
```typescript
try {
  await initActualApi();
} catch (error) {
  console.error('✗ Failed to initialize Actual Budget API:', error);
  console.error('Server cannot start without Actual Budget connection');
  process.exit(1);  // Fail fast
}
```

### Runtime Connection Errors

**Scenario**: API connection is lost during operation

**Current Behavior**: Each wrapper function calls `initActualApi()`, which will:
1. Check if already initialized (fast path)
2. If not initialized, attempt to initialize
3. If initialization fails, throw error

**Proposed Behavior**: Same as current! The wrapper functions already handle this correctly.

### Concurrent Request Handling

**Scenario**: Multiple tool calls execute simultaneously

**Current Protection**:
```typescript
export async function initActualApi(): Promise<void> {
  if (initialized) return;  // ← Fast path for concurrent requests
  
  if (initializing) {
    // Wait for initialization to complete
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }
  
  initializing = true;
  // ... initialization logic ...
}
```

**Analysis**: The existing implementation already handles concurrent requests safely. No changes needed.

## Testing Strategy

### Unit Tests

#### 1. Tool Handler Tests (`src/tools/index.test.ts`)

**Update Required**: Remove expectations for `shutdownActualApi()` calls

**Before**:
```typescript
expect(actualApi.shutdownActualApi).toHaveBeenCalled();
```

**After**:
```typescript
// Remove this expectation - shutdown should NOT be called
```

#### 2. Resource Handler Tests (`src/resources.test.ts`)

**Update Required**: Remove expectations for `shutdownActualApi()` calls

**Before**:
```typescript
expect(shutdownActualApi).toHaveBeenCalledTimes(1);
```

**After**:
```typescript
// Remove this expectation - shutdown should NOT be called
```

### Integration Tests

#### 1. Consecutive Tool Calls Test

**New Test**: Verify that multiple tool calls share the same connection

```typescript
describe('Persistent API Connection', () => {
  it('should not reinitialize API for consecutive tool calls', async () => {
    const initSpy = vi.spyOn(actualApi, 'initActualApi');
    const shutdownSpy = vi.spyOn(actualApi, 'shutdownActualApi');
    
    // Execute multiple tool calls
    await executeToolCall('get-accounts', {});
    await executeToolCall('get-transactions', { accountId: 'test' });
    await executeToolCall('get-categories', {});
    
    // initActualApi should be called once at startup
    // (or once per call with guard returning immediately)
    expect(shutdownSpy).not.toHaveBeenCalled();
  });
});
```

#### 2. Server Lifecycle Test

**New Test**: Verify proper initialization and cleanup

```typescript
describe('Server Lifecycle', () => {
  it('should initialize API at startup and shutdown on SIGINT', async () => {
    const initSpy = vi.spyOn(actualApi, 'initActualApi');
    const shutdownSpy = vi.spyOn(actualApi, 'shutdownActualApi');
    
    // Start server
    await startServer();
    expect(initSpy).toHaveBeenCalledTimes(1);
    
    // Execute some operations
    await executeToolCall('get-accounts', {});
    await executeToolCall('get-transactions', { accountId: 'test' });
    
    // Shutdown should not have been called yet
    expect(shutdownSpy).not.toHaveBeenCalled();
    
    // Trigger shutdown
    process.emit('SIGINT');
    
    // Now shutdown should be called
    expect(shutdownSpy).toHaveBeenCalledTimes(1);
  });
});
```

### Performance Tests

#### 1. Benchmark Comparison

**New Test**: Measure performance improvement

```typescript
describe('Performance Improvement', () => {
  it('should execute consecutive calls 50%+ faster', async () => {
    // Warm up
    await executeToolCall('get-accounts', {});
    
    // Measure consecutive calls
    const start = Date.now();
    await executeToolCall('get-accounts', {});
    await executeToolCall('get-transactions', { accountId: 'test' });
    await executeToolCall('get-categories', {});
    const duration = Date.now() - start;
    
    // With persistent connection, this should be < 500ms
    // Without persistent connection, this would be > 1500ms
    expect(duration).toBeLessThan(500);
  });
});
```

## Performance Optimization

### Expected Performance Gains

| Scenario | Before (ms) | After (ms) | Improvement |
|----------|-------------|------------|-------------|
| Single tool call (cold start) | 600-2200 | 600-2200 | 0% (same) |
| Single tool call (warm) | 600-2200 | 50-200 | 70-90% |
| 3 consecutive calls | 1800-6600 | 150-600 | 75-90% |
| 10 consecutive calls | 6000-22000 | 500-2000 | 90-92% |

### Breakdown of Time Savings

**Per-Request Overhead Eliminated**:
- API initialization: 400-1800ms
- Budget download: 100-400ms
- API shutdown: 100-300ms
- **Total saved per request**: 600-2500ms

**Remaining Per-Request Time**:
- Tool execution: 50-200ms
- Data fetching: 20-100ms
- Response formatting: 10-50ms
- **Total per request**: 80-350ms

### Memory Impact

**Before**: 
- Connection created and destroyed per request
- Memory usage spikes with each request
- Garbage collection overhead

**After**:
- Single persistent connection
- Stable memory usage
- Reduced GC pressure

**Expected Memory Increase**: ~10-20MB for persistent connection (negligible)

## Migration Strategy

### Phase 1: Remove Shutdown Calls (Low Risk)

1. Remove `shutdownActualApi()` from tool handler finally block
2. Remove `shutdownActualApi()` from resource handler finally block
3. Update unit tests to not expect shutdown calls

**Risk**: Low - the guard in `initActualApi()` prevents issues

### Phase 2: Add Proper Cleanup (Low Risk)

1. Add `shutdownActualApi()` to SIGINT handler
2. Add `shutdownActualApi()` to SIGTERM handler
3. Add integration tests for lifecycle

**Risk**: Low - standard cleanup pattern

### Phase 3: Validate and Monitor (Low Risk)

1. Run full test suite
2. Run performance benchmarks
3. Monitor production metrics

**Risk**: Low - backward compatible change

## Rollback Plan

If issues arise, the rollback is simple:

1. Re-add `shutdownActualApi()` to finally blocks
2. Revert signal handler changes
3. Revert test changes

**Rollback Time**: < 5 minutes

## Security Considerations

### Connection Security

**Concern**: Long-lived connections might be less secure

**Mitigation**: 
- The Actual Budget API already handles connection security
- No additional security risks introduced
- Connection is local or to trusted server

### Resource Exhaustion

**Concern**: Persistent connection might leak resources

**Mitigation**:
- Proper cleanup on SIGINT/SIGTERM
- Existing connection state management is robust
- Memory usage is monitored

## Backward Compatibility

### API Compatibility

**Impact**: None - all public APIs remain unchanged

**Wrapper Functions**: Continue to call `initActualApi()` with guard, ensuring safety

**Tool Interfaces**: No changes to tool schemas or handlers

### Test Compatibility

**Impact**: Minimal - only test expectations need updating

**Changes Required**:
- Remove `shutdownActualApi()` expectations from unit tests
- No changes to test logic or assertions

### Configuration Compatibility

**Impact**: None - no new configuration required

**Environment Variables**: All existing variables work unchanged

## Alternative Approaches Considered

### Alternative 1: Connection Pooling

**Description**: Maintain a pool of connections

**Pros**: Could handle multiple budgets simultaneously

**Cons**: 
- Unnecessary complexity for single-budget use case
- Higher memory usage
- Current API doesn't support multiple simultaneous connections

**Decision**: Rejected - single persistent connection is sufficient

### Alternative 2: Lazy Initialization

**Description**: Initialize on first request instead of at startup

**Pros**: Faster server startup

**Cons**:
- First request has high latency
- Harder to detect configuration issues
- Current approach (init at startup) is better UX

**Decision**: Rejected - fail-fast at startup is preferred

### Alternative 3: Connection Timeout

**Description**: Close connection after period of inactivity

**Pros**: Saves resources during idle periods

**Cons**:
- Adds complexity
- Reintroduces initialization overhead
- Server is typically always active

**Decision**: Rejected - persistent connection is simpler and better for typical usage

## Future Enhancements

### Connection Health Monitoring

**Description**: Periodically check connection health and reconnect if needed

**Implementation**:
```typescript
setInterval(async () => {
  try {
    await api.getBudgets(); // Health check
  } catch (error) {
    console.error('Connection health check failed, reconnecting...');
    initialized = false;
    await initActualApi();
  }
}, 60000); // Every minute
```

**Priority**: Low - current error handling is sufficient

### Connection Metrics

**Description**: Track connection uptime, request count, error rate

**Implementation**: Extend `metricsTracker` to include connection metrics

**Priority**: Low - nice to have for monitoring

### Graceful Degradation

**Description**: Queue requests during reconnection instead of failing

**Implementation**: Request queue with retry logic

**Priority**: Low - current fail-fast behavior is acceptable

## References

- [Actual Budget API Documentation](https://actualbudget.org/docs/api/)
- [MCP SDK Server Documentation](https://github.com/modelcontextprotocol/sdk)
- [Node.js Process Signals](https://nodejs.org/api/process.html#signal-events)
- [Performance Optimization Documentation](../../../docs/PERFORMANCE.md)
