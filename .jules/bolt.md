# Bolt's Journal - Critical Learnings

This journal records critical performance learnings, anti-patterns, and architectural insights.

## 2024-05-23 - [Initial Setup]
**Learning:** Performance optimizations should be documented to share knowledge.
**Action:** Always check this journal before starting optimization tasks.

## 2024-05-23 - [Optimistic Connection Check]
**Learning:** `ensureConnection` was proactively checking connection health (via `api.getAccounts`) on *every* request, even when `cacheService` was hit. This doubled the latency for cached reads and negated some benefits of caching.
**Action:** Trust the `initialized` state for the happy path ("Optimistic UI" pattern applied to backend). Only check health proactively if not initialized. Rely on error handling to detect and recover from dropped connections.

## 2025-05-24 - [Regex Replacement Overhead]
**Learning:** Replacing chained `.replace()` calls with a single regex replacer function (`str.replace(regex, map[match])`) showed mixed results. While 2x faster for strings *without* matches (one scan vs multiple), it was slightly slower for long strings with many matches due to regex/callback overhead in this environment.
**Action:** Prefer simple chained replacements for known short lists of characters unless the input is guaranteed to be mostly clean (no matches), in which case the single-pass scan wins.
