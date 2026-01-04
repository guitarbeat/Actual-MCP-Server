## 2024-05-23 - [NameResolver Optimization]
**Learning:** `WeakMap` is an excellent tool for caching derived data (like normalized name indices) when the source data (lists of accounts/categories) is effectively immutable/cached by reference. This allows transforming O(N) linear searches into O(1) hash map lookups without complex cache invalidation logic, as the cache is tied to the lifecycle of the data array itself.
**Action:** Identify other areas where derived data is computed from cached arrays and consider using `WeakMap` for memoization.
