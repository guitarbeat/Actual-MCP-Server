## 2026-01-07 - [WeakMap Identity Cache Pattern]
**Learning:** Using `WeakMap` keyed by the data source array (e.g., `Account[]`) is a powerful pattern for handling cache invalidation automatically.
**Action:** When caching derived data (like name->ID lookups), key the cache off the source data object itself. If the source data is replaced (e.g., new array from API), the cache automatically starts fresh without manual `clear()` calls. This eliminates stale data bugs and improves performance for stable data.
