# Actual MCP Server — Project Conventions

## Tech Stack

- pnpm monorepo; the MCP server lives in `mcp-server/`
- Run commands: `pnpm --filter actual-mcp run <script>`
- Key scripts: `lint`, `type-check`, `test`, `test:startup-smoke`

## Actual Budget MCP Rules

- Transaction amounts are always **cents** (integers). $12.50 → `1250`.
- Use `import-transaction-batch` for bulk imports; `accountId` goes inside each transaction object.
- Reconcile by matching date+amount (±3 days for payment/transfer date offsets) — never wipe and reimport.
- Do not add reconciliation adjustment transactions.
- Phantom transactions that are legitimate manual entries (Roth IRA contributions, Robinhood Gold interest, cash expenses) should be left alone.

## MCP Server Architecture

- Tools are in `mcp-server/src/tools/` — unified CRUD via `crud-factory.ts` + per-entity handlers.
- Tool category `'advanced'` hides a tool from non-advanced sessions; `'core'` exposes it in all write-enabled sessions.
- `requiresWrite: true` gates a tool behind write-mode regardless of category.
- The unified `manage-{entity}` tool uses the `create` action's category for the whole tool — keep `create` as `'core'` unless the action is truly dangerous.

## Infrastructure

- MCP server runs at `actual-mcp.alw.lol` (Coolify auto-deploys on push to main).
- Coolify dashboard: `coolify.alw.lol`.
- For Oracle/Coolify SSH access, use the key from the ops repo.
- Bearer token is in `.claude/settings.local.json` (never commit it).

## Shell

- Use `sed -i ''` (macOS) not GNU `sed -i`.
- Use `pnpm` not `npm` in this repo.
