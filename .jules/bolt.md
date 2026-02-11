# Bolt's Journal - Critical Learnings

This journal records critical performance learnings, anti-patterns, and architectural insights.

## 2024-05-23 - [Initial Setup]
**Learning:** Performance optimizations should be documented to share knowledge.
**Action:** Always check this journal before starting optimization tasks.

## 2024-05-23 - [Optimistic Connection Check]
**Learning:** `ensureConnection` was proactively checking connection health (via `api.getAccounts`) on *every* request, even when `cacheService` was hit. This doubled the latency for cached reads and negated some benefits of caching.
**Action:** Trust the `initialized` state for the happy path ("Optimistic UI" pattern applied to backend). Only check health proactively if not initialized. Rely on error handling to detect and recover from dropped connections.

## 2026-01-15 - [Aggregation Optimization]
**Learning:** Generic `groupBy` + `sumBy` + `sortBy` pipelines incur significant overhead due to multiple iterations and closure allocations. In hot paths, single-pass aggregation using plain Objects (faster than Maps for string keys in this runtime) and native `sort` yielded ~24% improvement.
**Action:** Prefer single-pass aggregation loops and native `Array.prototype.sort` over composing generic utility functions for high-frequency data processing.

## 2026-01-25 - [Promise.all Concurrency]
**Learning:** Using `await` inside a `Promise.all` array element (e.g., `[await task1(), task2()]`) blocks the construction of the array and prevents `task2` from starting until `task1` completes, defeating the purpose of parallelism.
**Action:** Always start promises *before* `Promise.all` or pass the promise itself (e.g., `[task1Promise, task2Promise]`) without `await`ing it inside the array literal.

## 2026-02-08 - [Object Iteration vs Array Allocation]
**Learning:** When aggregating data from a large object (Record), using `for...in` loop is significantly faster (~15%) than `Object.values()` or `Object.entries()` because it avoids allocating an intermediate array of keys or values.
**Action:** For performance-critical loops over large objects, prefer `for...in` combined with incremental processing (e.g. summing) to minimize allocations and passes.
