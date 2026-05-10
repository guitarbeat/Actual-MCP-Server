# MCP Tool Consolidation Audit

## Context

This audit evaluates all 46 tools exposed by the Actual Budget MCP Server to identify
redundancies and propose consolidations. The goal is to reduce tool count without
losing functionality, improving LLM tool selection accuracy.

## Why Fewer Tools Matters

LLMs perform better with fewer, well-scoped tools:

| Tool Count | Effect |
|------------|--------|
| ≤ 20 | Ideal — near-perfect tool selection |
| 20–30 | Good — occasional hesitation on similar tools |
| 30–40 | Degraded — frequent confusion between overlapping tools |
| 40+ | Poor — significant accuracy loss, wrong tool selection |

At 46 tools, the server sits firmly in the "poor" zone. Each tool added doesn't just
increase choice — it geometrically increases the comparison surface the LLM must evaluate.

## Current Tool Inventory (46 tools)

### Read-only tools (14)
| Tool | Category |
|------|----------|
| `get-accounts` | Core |
| `get-account-balance` | Core |
| `get-transactions` | Core |
| `get-budget-summary` | Core |
| `get-budget-month` | Core |
| `get-grouped-categories` | Core |
| `get-payees` | Core |
| `get-tags` | Advanced |
| `get-rules` | Advanced |
| `get-bank-sync-status` | Advanced |
| `financial-insights` | Advanced |
| `spending-by-category` | Core |
| `monthly-summary` | Core |
| `get-schedules` | Advanced |

### Write tools — CRUD (18, from 6 entities × 3 ops)
| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Category | `create-category` | `update-category` | `delete-category` |
| Payee | `create-payee` | `update-payee` | `delete-payee` |
| Account | `create-account` | `update-account` | `delete-account` |
| Tag | `create-tag` | `update-tag` | `delete-tag` |
| Rule | `create-rule` | `update-rule` | `delete-rule` |
| Category Group | `create-category-group` | `update-category-group` | `delete-category-group` |

### Write tools — Specialized (14)
| Tool | Category |
|------|----------|
| `create-transactions` | Core |
| `update-transaction` | Core |
| `delete-transaction` | Core |
| `set-budget-amount` | Core |
| `merge-payees` | Advanced |
| `close-account` | Advanced |
| `reopen-account` | Advanced |
| `run-bank-sync` | Advanced |
| `audit-transactions` | Advanced |
| `apply-audit-fixes` | Advanced |
| `audit-payees` | Advanced |
| `apply-payee-fixes` | Advanced |
| `balance-correction` | Advanced |
| `import-transactions` | Core |

---

## Consolidation Plan

### 🔴 Priority 1: CRUD Consolidation (saves 12 tools)

**Change**: Replace 18 separate create/update/delete tools with 6 unified `manage-*` tools.

| Before (18 tools) | After (6 tools) |
|--------------------|-----------------|
| `create-category`, `update-category`, `delete-category` | `manage-category` |
| `create-payee`, `update-payee`, `delete-payee` | `manage-payee` |
| `create-account`, `update-account`, `delete-account` | `manage-account` |
| `create-tag`, `update-tag`, `delete-tag` | `manage-tag` |
| `create-rule`, `update-rule`, `delete-rule` | `manage-rule` |
| `create-category-group`, `update-category-group`, `delete-category-group` | `manage-category-group` |

Each `manage-*` tool accepts an `action` parameter (`"create"`, `"update"`, or `"delete"`)
and the relevant fields. The Zod validation for each action is unchanged — the same schemas
are used, just dispatched from a single entry point.

**Why this works**: When an LLM decides to "create a category", it already knows the entity
type and the operation. A single `manage-category` tool with `action: "create"` is just as
clear as `create-category`, but the LLM only has to scan 6 entity tools instead of 18.

**Implementation**: The existing `crud-factory.ts` already has the entity configurations.
The new `createUnifiedCRUDTool` function reuses them to produce one tool per entity.
The old `createCRUDTools` is preserved but deprecated.

### 🟡 Priority 2: Audit + Apply Merge (saves 2 tools)

| Before | After |
|--------|-------|
| `audit-transactions` + `apply-audit-fixes` | `audit-transactions` with `mode: "audit" \| "apply"` |
| `audit-payees` + `apply-payee-fixes` | `audit-payees` with `mode: "audit" \| "apply"` |

The audit→apply two-step pattern is good UX, but the LLM doesn't need two separate tools.
A `mode` parameter achieves the same workflow: first call with `mode: "audit"` to preview,
then call again with `mode: "apply"` to execute.

### 🟡 Priority 3: Analytics Dedup (saves 1 tool)

| Before | After |
|--------|-------|
| `monthly-summary` + `financial-insights` | `financial-insights` with optional `months` param |

`monthly-summary` is effectively a subset of `financial-insights`. Folding the monthly
view into the insights tool eliminates the overlap.

### 🟢 Priority 4: Balance Merge (saves 1 tool)

| Before | After |
|--------|-------|
| `get-accounts` + `get-account-balance` | `get-accounts` with `includeBalances: true` option |

`get-account-balance` just returns what `get-accounts` could include. Adding a boolean
flag is simpler than maintaining a separate tool.

---

## Impact Summary

| Phase | Tools Removed | Remaining |
|-------|---------------|-----------|
| Current | — | 46 |
| Phase 1: CRUD Consolidation | -12 | **34** |
| Phase 2: Audit+Apply | -2 | **32** |
| Phase 3: Analytics | -1 | **31** |
| Phase 4: Balance | -1 | **30** |

**Net reduction: 46 → 30 tools (35% fewer)**

With Phase 1 alone (this PR), we drop from 46 to 34 — already a meaningful improvement
in LLM accuracy.

---

## Backward Compatibility

The `createCRUDTools` function is preserved with a `@deprecated` annotation.
Existing tests for entity schemas are unaffected since the underlying Zod schemas
haven't changed. The unified tool reuses the same schemas, just dispatches them
from a single handler.

Tool names change from `create-X`/`update-X`/`delete-X` to `manage-X`, which is
a breaking change for any hardcoded tool name references. MCP clients that discover
tools dynamically (the standard pattern) will adapt automatically.
