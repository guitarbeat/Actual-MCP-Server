# Bolt's Journal - Critical Learnings

This journal records critical performance learnings, anti-patterns, and architectural insights.

## 2024-05-23 - [Initial Setup]
**Learning:** Performance optimizations should be documented to share knowledge.
**Action:** Always check this journal before starting optimization tasks.

## 2024-05-23 - [Optimistic Connection Check]
**Learning:** `ensureConnection` was proactively checking connection health (via `api.getAccounts`) on *every* request, even when `cacheService` was hit. This doubled the latency for cached reads and negated some benefits of caching.
**Action:** Trust the `initialized` state for the happy path ("Optimistic UI" pattern applied to backend). Only check health proactively if not initialized. Rely on error handling to detect and recover from dropped connections.

## 2024-05-23 - [Reduce vs Loop Surprise]
**Learning:** In V8 (Node 20), replacing `reduce` with a `for...of` loop for simple object construction (`byId`) was surprisingly slower (~10%). This contradicts the general rule that loops are faster. However, inlining grouping logic (`aggregateAndSort`) to avoid intermediate objects and helpers WAS significantly faster (~30%).
**Action:** Don't blindly replace `reduce` with loops for small aggregations. Always benchmark. Focus on avoiding intermediate allocations (like `Object.entries` on large objects) rather than just syntax changes.
