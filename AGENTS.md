# AGENTS.md

## Scope

This repository is a `pnpm` workspace with one product package: [`mcp-server/`](./mcp-server). Run commands from the workspace root unless a section says otherwise.

## Prerequisites

- Node.js `>=20`
- `pnpm@10.27.0`

Bootstrap once from the repo root:

```bash
pnpm install
```

## Repository Map

- [`package.json`](./package.json): workspace shortcuts for build, test, docs, and public-readiness checks
- [`mcp-server/package.json`](./mcp-server/package.json): authoritative package scripts
- [`mcp-server/src/mcp/`](./mcp-server/src/mcp): declarative MCP surface for tools, prompts, and resources
- [`mcp-server/src/tools/`](./mcp-server/src/tools): legacy tool implementations still reused by the declarative MCP layer
- [`mcp-server/src/runtime/`](./mcp-server/src/runtime): Hono-based remote runtime and MCP bootstrap
- [`mcp-server/scripts/sync-tool-docs.ts`](./mcp-server/scripts/sync-tool-docs.ts): regenerates README MCP-surface counts and [`mcp-server/docs/tool-registry.md`](./mcp-server/docs/tool-registry.md)
- [`mcp-server/scripts/public-repo-check.ts`](./mcp-server/scripts/public-repo-check.ts): blocks local artifacts, tracked env files, local paths, and leaked inspector/auth strings
- [`docs/engineering-notes.md`](./docs/engineering-notes.md): contributor-facing implementation notes

## Common Commands

Workspace-root shortcuts:

```bash
pnpm build
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm type-check
pnpm quality

pnpm dev:mcp-server
pnpm watch:mcp-server
pnpm start:mcp-server
pnpm test:mcp-server
pnpm docs:mcp-server
pnpm public:check:mcp-server
```

Package-level commands from the root:

```bash
pnpm --filter actual-mcp build
pnpm --filter actual-mcp dev
pnpm --filter actual-mcp watch
pnpm --filter actual-mcp start
pnpm --filter actual-mcp inspector
pnpm --filter actual-mcp inspector:custom
pnpm --filter actual-mcp test
pnpm --filter actual-mcp test:startup-smoke
pnpm --filter actual-mcp test:unit:watch
pnpm --filter actual-mcp test:ui
pnpm --filter actual-mcp test:coverage
pnpm --filter actual-mcp lint
pnpm --filter actual-mcp lint:fix
pnpm --filter actual-mcp format
pnpm --filter actual-mcp format:check
pnpm --filter actual-mcp type-check
pnpm --filter actual-mcp docs:generate
pnpm --filter actual-mcp docs:check
pnpm --filter actual-mcp public:check
pnpm --filter actual-mcp quality
```

## Workflows

### Standard code change

1. Run `pnpm install` if dependencies are not already present.
2. Make the change.
3. Run `pnpm --filter actual-mcp quality`.
4. Run `pnpm --filter actual-mcp test`.
5. Run `pnpm --filter actual-mcp build` if entrypoints or packaging changed.
6. Run `pnpm --filter actual-mcp test:startup-smoke` when you change the built entrypoint, remote runtime startup, or packaging behavior.

### MCP surface or docs change

Run this workflow whenever you change anything under [`mcp-server/src/mcp/`](./mcp-server/src/mcp), contributor-facing MCP docs in [`mcp-server/README.md`](./mcp-server/README.md), or the generated inventory in [`mcp-server/docs/tool-registry.md`](./mcp-server/docs/tool-registry.md):

```bash
pnpm --filter actual-mcp docs:generate
pnpm --filter actual-mcp docs:check
```

Commit the regenerated files:

- [`mcp-server/README.md`](./mcp-server/README.md)
- [`mcp-server/docs/tool-registry.md`](./mcp-server/docs/tool-registry.md)

### Inspector and local server workflow

Set local credentials in [`mcp-server/.env.example`](./mcp-server/.env.example)-style variables, typically in `mcp-server/.env`, then use:

```bash
pnpm --filter actual-mcp inspector
pnpm --filter actual-mcp inspector:custom
```

For normal local runs:

```bash
pnpm start:mcp-server
node mcp-server/build/index.js --sse --enable-write --enable-bearer
```

`--sse` remains the compatibility flag that switches the server into remote HTTP mode and exposes `/mcp`, `/health`, and `/ready`.

### Public-readiness workflow

Before pushing a branch intended to be shared publicly, run:

```bash
pre-commit run --all-files
pnpm --filter actual-mcp public:check
pnpm --filter actual-mcp docs:check
```

Do not commit:

- real credentials, bearer tokens, sync IDs, or local inspector session data
- tracked `.env` files
- local assistant state under `.agent/`, `.cursor/`, or `.jules/`
- hardcoded machine-local absolute home-directory paths

### CI parity workflow

GitHub Actions currently runs this sequence:

```bash
pre-commit run gitleaks --all-files
pnpm --filter actual-mcp public:check
pnpm --filter actual-mcp lint
pnpm --filter actual-mcp format:check
pnpm --filter actual-mcp docs:check
pnpm --filter actual-mcp type-check
pnpm --filter actual-mcp build
pnpm --filter actual-mcp test:startup-smoke
pnpm --filter actual-mcp test:coverage
```

### Docker workflow

```bash
docker build -f mcp-server/Dockerfile -t actual-mcp .
docker run --rm -p 3000:3000 \
  -e ACTUAL_SERVER_URL=https://actual.example.com \
  -e ACTUAL_PASSWORD=replace-with-your-actual-password \
  -e ACTUAL_BUDGET_SYNC_ID=replace-with-your-budget-sync-id \
  -e BEARER_TOKEN=replace-with-a-long-random-token \
  actual-mcp
```

The container entrypoint starts `node build/index.js --sse --enable-bearer --enable-write` for remote HTTP mode.

## Current Conventions

- Use the current package filter name: `actual-mcp`.
- Prefer workspace-root `pnpm` commands over ad hoc `npm` commands.
- Desktop MCP client configs should point to the built local entrypoint at `mcp-server/build/index.js` with `node`; do not assume an `npx` install flow.
- `prepublishOnly` for the package runs `build`, `docs:check`, and `public:check`, so changes that affect packaging or docs must keep all three green.

## Cursor Cloud specific instructions

### Polyfill requirement

`@actual-app/api` references `navigator.platform` at module load time. Node.js 20 does not provide this global, so every invocation of the built server or any script that imports the API must include `--require mcp-server/polyfill.cjs`. The startup smoke test and Dockerfile already do this. When running the server locally use:

```bash
node --require mcp-server/polyfill.cjs mcp-server/build/index.js --sse --enable-write
```

### Native addon build approval

`better-sqlite3` and `esbuild` require native build scripts. The root `package.json` includes `pnpm.onlyBuiltDependencies` to approve these non-interactively. Without this, `pnpm install` will skip native compilation and the server will fail at runtime.

### Running without an Actual Budget server

The MCP server starts and responds on `/health` and `/mcp` even without a configured Actual Budget backend. `/ready` will report `no_budgets_found`, and budget-specific tools will error, but the HTTP runtime and MCP protocol handshake work normally. This is sufficient for development and testing of non-budget-dependent code paths.

### Quick verification commands

See the Common Commands and CI parity workflow sections above. Key commands: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter actual-mcp test:startup-smoke`.
