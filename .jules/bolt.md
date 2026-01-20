# Bolt's Journal - Critical Learnings

This journal records critical performance learnings, anti-patterns, and architectural insights.

## 2024-05-23 - [Initial Setup]
**Learning:** Performance optimizations should be documented to share knowledge.
**Action:** Always check this journal before starting optimization tasks.

## 2024-05-23 - [Optimistic Connection Check]
**Learning:** `ensureConnection` was proactively checking connection health (via `api.getAccounts`) on *every* request, even when `cacheService` was hit. This doubled the latency for cached reads and negated some benefits of caching.
**Action:** Trust the `initialized` state for the happy path ("Optimistic UI" pattern applied to backend). Only check health proactively if not initialized. Rely on error handling to detect and recover from dropped connections.

## 2024-05-24 - [Transaction Grouping Optimization]
**Learning:** Iterating over large transaction lists with `forEach` and repeated callback invocations (`getCategoryName`, `getGroupInfo`) creates significant overhead. Simple `for...of` loops combined with local caching of repeated lookups (e.g., category info) yielded a ~22% performance improvement on large datasets.
**Action:** For aggregation loops processing potentially large arrays, prefer `for...of` and cache repeated lookups locally to minimize function call overhead and object allocation.
