## 2024-05-24 - [Missing Transaction Caching]

**Learning:** `getTransactions` was calling the API directly without caching, despite `CacheService` being available and invalidation logic existing for a generic `transactions` key. This resulted in redundant API calls for the same data.

**Action:** Always verify if expensive data fetch operations are using `CacheService`. Ensure cache keys are granular enough (e.g., including date ranges) and invalidation patterns match these keys (e.g., using `invalidatePattern`).
