# Engineering Notes

This repository keeps a few implementation notes in version control so contributors can preserve hard-earned context without relying on personal local tooling.

## Repository Boundaries

- Keep public code and documentation in tracked paths only.
- Keep private financial exports, statement files, backups, and reconciliation scratch work under `.local-reconciliation/`.
- Treat `.actual-data/`, `.playwright-cli/`, and `tmp/` as disposable local state, not durable project structure.
- Prefer extending the existing private workspace layout over adding new ignored top-level directories.

## Performance

- Prefer persistent connections and cache reuse over re-initializing the Actual API on every request.
- Start independent async work before `Promise.all(...)`; do not `await` inside the array literal.
- In hot aggregation paths, prefer `for...in` loops over `Object.values()` when avoiding intermediate allocations matters.
- Use in-place `Array.prototype.sort()` when the array is locally owned and immutability is not required.

## Security

- Keep transport security in shared middleware, not inline in entrypoints.
- Bearer token validation must stay header-only and use constant-time comparison.
- Do not expose raw internal error messages in HTTP 500 responses.
- Keep CSP strict; avoid adding inline script or style exceptions unless there is no safer option.

## Runtime Architecture

- Keep the MCP surface declarative under `mcp-server/src/mcp/`; tools, prompts, and resources should be discoverable without editing the entrypoint.
- Keep remote runtime concerns in `mcp-server/src/runtime/`; transport, auth, readiness, and HTTP wiring should not leak into domain handlers.
- Reuse legacy tool handlers when practical, but prefer moving repeated parsing and orchestration into shared services instead of growing new registry boilerplate.
- Treat `mcp-server/src/index.ts` as a thin bootstrap layer only.
- Keep `mcp-server/src/core/analysis/timeline-reconciliation.ts` as a thin facade; parser logic, heuristics, audit I/O, and apply flow now live under `mcp-server/src/core/analysis/timeline-reconciliation/`.
- Keep `mcp-server/src/core/api/actual-client.ts` as the stable entrypoint, but prefer extracting pure helper concerns into `mcp-server/src/core/api/actual-client/` before growing the facade further.

## Refactor Backlog

- Split `mcp-server/src/core/analysis/amazon-purchase-audit.ts` by behavior so parsing, matching, categorization, and report formatting evolve independently while preserving the existing test surface.
- Continue the `mcp-server/src/core/api/actual-client.ts` decomposition by extracting connection lifecycle, entity operations, transaction workflows, and budget/query helpers behind the current facade.
- Defer `mcp-server/src/core/analysis/uncategorized-audit.ts` decomposition until the Amazon and Actual client refactors are scoped, then split shared heuristics and report assembly into focused helpers.
- Split `mcp-server/src/tools/crud-factory-config.ts` by entity domain so account, transaction, and metadata tool definitions stop accumulating in a single 800+ line registry.
