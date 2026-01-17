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
