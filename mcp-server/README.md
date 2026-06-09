# actual-mcp

Actual Budget MCP server for Claude Desktop, Codex, Cursor, and other MCP clients.

## Highlights

- Actual Budget reads and writes over MCP, with separate read-only, write, and advanced (`--enable-advanced`) tool surfaces.
- Declarative MCP registration for tools, prompts, and resources under `src/mcp/`, with native SDK tool registration, explicit safety annotations, and structured tool results for newer clients.
- Transfer-aware transaction creation, starting-balance repair, account reconciliation, budget planning, schedule management, and batch transaction import.
- Hono-based remote runtime with streamable HTTP MCP transport, bearer auth, health checks, and stdio support for desktop clients.

## Agent playbook (discovery and routing)

This server exposes many atomic tools for parity with Actual Budget. To reduce wrong-tool selection and wasted context:

1. **Enable only the tier you need**: default read-only; add `--enable-write` for mutations; add `--enable-advanced` for multi-budget and high-risk account operations.
2. **Fetch the catalog first**: read the MCP resource **`actual://mcp/tool-surface`** (JSON: tools grouped by read / write / advanced with one-line hints). Use it to shortlist before calling `tools/list`.
3. **Prefer prompts for multi-step flows**: under `src/mcp/prompts/`, prompts bundle ordered steps (e.g. spending analysis, health check, uncategorized triage). Run a prompt when the user goal matches a workflow; drop to individual tools for precise CRUD or custom filters.
4. **Use resources for narrative context**: account and budget markdown resources under `actual://...` complement tools; they do not replace tools for structured queries.
5. **Respect pagination and limits**: list-style tools cap or paginate results. **`get-transactions`** returns newest-first slices with **`limit`**, **`offset`**, **`hasMore`**, and **`totalMatchingFilters`**; tune defaults with `ACTUAL_GET_TRANSACTIONS_DEFAULT_LIMIT` / `ACTUAL_GET_TRANSACTIONS_MAX_LIMIT` (see [`.env.example`](./.env.example)). For other list tools, set explicit `limit` / cursor fields when budgets are large.

## Install

From the workspace root:

```bash
pnpm install
pnpm --filter actual-mcp build
```

## Configuration

Copy the placeholders from [`.env.example`](./.env.example) and set these values. When `ACTUAL_SERVER_URL` is set, configure exactly one of `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`:

```bash
ACTUAL_SERVER_URL=https://actual.example.com
ACTUAL_PASSWORD=replace-with-your-actual-password
# ACTUAL_SESSION_TOKEN=replace-with-your-actual-session-token
ACTUAL_BUDGET_SYNC_ID=replace-with-your-budget-sync-id
```

Optional variables:

- `ACTUAL_SESSION_TOKEN` as an alternative to `ACTUAL_PASSWORD` for remote-server auth. Set exactly one of the two auth variables.
- `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` for encrypted budgets
- `ACTUAL_READ_FRESHNESS_MODE` to control read freshness. Use `strict-live` to sync before every read and fail instead of serving stale data; default is `cached`.
- `ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID` for the full sandbox-only MCP smoke suite
- `ACTUAL_TOOL_TEST_PREFIX` to namespace sandbox smoke-test fixtures. Defaults to `__mcp_tool_test__`.
- `BEARER_TOKEN` for HTTP/SSE auth when `--enable-bearer` is enabled. Use a long random value; startup now rejects weak tokens.
- `PORT` for HTTP/SSE mode
- `AUTO_SYNC_INTERVAL_MINUTES`, `CACHE_ENABLED`, and `CACHE_TTL_SECONDS` for runtime behavior. Remote deployments should set a non-zero sync interval.
- `MCP_ALLOWED_ORIGINS` to allow browser-based MCP clients in production; server-to-server clients without an `Origin` header remain allowed.
- `MCP_SESSION_TTL_MINUTES` to expire inactive streamable HTTP sessions and prevent unbounded session growth.
- `MCP_TOOL_CORRELATION_LOGS` set to `true` to stderr-log MCP tool executions with shortened request/session identifiers on streamable HTTP.
- `MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC` set to a positive integer for periodic `[MCP_DIAG]` lines (connection status, truncated budget id, RSS megabytes, plus `ready_epochs`, `forced_inits`, and `init_skips` counters).
- `MCP_READINESS_TRANSITION_LOGS` set to `true` so each **change** in the public `/ready` payload (`ready|status|reason`) emits a correlated stderr line `[READINESS]` with the HTTP status that would be returned (suppresses duplicate probes when nothing changed).
- `MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC` set to a positive integer to emit periodic `[TOOL_USAGE_SUMMARY]` lines (per-tool invocation counts since the last summary) for lightweight usage signal when correlation logs are not enough.
- `ACTUAL_GET_TRANSACTIONS_DEFAULT_LIMIT` / `ACTUAL_GET_TRANSACTIONS_MAX_LIMIT` to bound **`get-transactions`** page size (defaults 200 / cap 5000).

### Streamable HTTP sessions and budget scope

Remote mode allocates one MCP server instance (`McpServer`) per authenticated streamable HTTP session, but **`@actual-app/api` and this package's Actual client remain process-global**. Idle sessions prune independently via `MCP_SESSION_TTL_MINUTES`, yet every active session still shares **one loaded budget**, cache layers, sync loops, `switch-budget` effects, and connection health probes. Provision **separate deployments or isolated processes** when you need mutually exclusive budgets—not additional bearer tokens against the same process.

Grouped tool discovery is available as JSON via the MCP resource **`actual://mcp/tool-surface`** (tier metadata only; Actual data still requires authenticated tools/resources).

### Actual server compatibility

The published npm package pins `@actual-app/api` to **26.5.1** (see [`package.json`](./package.json)). Bump that dependency only alongside an Actual Server version you validated end-to-end, and rerun `pnpm --filter actual-mcp test` plus startup smoke whenever either side jumps major/minor trains.

## Run Modes

Default stdio mode is intended for desktop MCP clients:

```bash
pnpm --filter actual-mcp start
```

Remote HTTP mode:

```bash
node build/index.js --sse --enable-write --enable-bearer
```

Useful flags:

- `--enable-write` exposes write-capable tools
- `--enable-advanced` exposes advanced account and budget-file tools
- `--enable-bearer` requires `BEARER_TOKEN`, enforces a minimum token length at startup, and protects the remote `/mcp` endpoint
- `--host` and `--port` override the HTTP listener

Remote deployment notes:

- Terminate TLS in front of the server and treat the bearer token as a full read/write secret.
- Restrict network access with your reverse proxy or platform controls when possible.
- Use `/health` for liveness and `/ready` for Actual connectivity readiness.

**Bearer vs OAuth (HTTP MCP):** this server uses a single shared **`BEARER_TOKEN`** validated in [`runtime/auth`](./src/runtime/auth.ts), which suits server-to-server or trusted reverse proxies. If you need interactive user consent, per-client credentials, or token rotation typical of OAuth 2.1 + PKCE, plan a separate gateway or IdP integration in front of `/mcp`—that flow is **not** built into this package today.

## Render

This package can be deployed directly to Render as a web service. The repository root includes [`render.yaml`](../render.yaml), which points Render at [`Dockerfile`](./Dockerfile) and starts the server in remote HTTP mode with `--enable-write` and `--enable-bearer`.

Typical Render setup:

1. Create the service from the repository Blueprint.
2. Provide `ACTUAL_SERVER_URL`, one of `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`, `ACTUAL_BUDGET_SYNC_ID`, and `BEARER_TOKEN`.
3. Use `/health` as the liveness endpoint and `/ready` as the readiness endpoint.
4. Optional tuneables such as `MCP_SESSION_TTL_MINUTES`, `ACTUAL_CONNECTION_HEALTH_TTL_MS`, `AUTO_SYNC_INTERVAL_MINUTES`, `MCP_ALLOWED_ORIGINS`, `MCP_TOOL_CORRELATION_LOGS`, `MCP_READINESS_TRANSITION_LOGS`, or `MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC` are documented in `.env.example` / `README`; add them in the Render Dashboard when you rely on defaults other than ours.

If you are looking at Render Workflows examples such as:

```ts
import { task } from '@renderinc/sdk/workflows';
```

that is a different Render product for background jobs. It does not replace this package's server entrypoint at [`src/index.ts`](./src/index.ts). A Render Workflow project should live alongside this service, not inside the MCP server runtime unless you are intentionally building a second app surface.

## Client Examples

Claude Desktop uses `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "actual-budget": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_SERVER_URL": "https://actual.example.com",
        "ACTUAL_PASSWORD": "replace-with-your-actual-password",
        "ACTUAL_BUDGET_SYNC_ID": "replace-with-your-budget-sync-id"
      }
    }
  }
}
```

Replace `ACTUAL_PASSWORD` with `ACTUAL_SESSION_TOKEN` if you prefer session-token auth. Do not set both.

Codex uses `~/.codex/config.toml`:

```toml
[mcp_servers.actual_budget]
command = "node"
args = ["/absolute/path/to/mcp-server/build/index.js", "--enable-write"]

[mcp_servers.actual_budget.env]
ACTUAL_SERVER_URL = "https://actual.example.com"
ACTUAL_PASSWORD = "replace-with-your-actual-password"
ACTUAL_BUDGET_SYNC_ID = "replace-with-your-budget-sync-id"
```

Replace `ACTUAL_PASSWORD` with `ACTUAL_SESSION_TOKEN` if you prefer session-token auth. Do not set both.

Cursor uses `~/.cursor/mcp.json` or project-local `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "actual-budget": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_SERVER_URL": "https://actual.example.com",
        "ACTUAL_PASSWORD": "replace-with-your-actual-password",
        "ACTUAL_BUDGET_SYNC_ID": "replace-with-your-budget-sync-id"
      }
    }
  }
}
```

Replace `ACTUAL_PASSWORD` with `ACTUAL_SESSION_TOKEN` if you prefer session-token auth. Do not set both.

Build the package first, then use the absolute path to `mcp-server/build/index.js` in your client configuration.

## Docker

Build locally from the repository root:

```bash
docker build -f mcp-server/Dockerfile -t actual-mcp .
```

Run the local image:

```bash
docker run --rm -p 3000:3000 \
  -e ACTUAL_SERVER_URL=https://actual.example.com \
  -e ACTUAL_PASSWORD=replace-with-your-actual-password \
  -e ACTUAL_BUDGET_SYNC_ID=replace-with-your-budget-sync-id \
  -e BEARER_TOKEN=replace-with-a-long-random-token \
  actual-mcp
```

Use either `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN` in the container environment, not both.

The container entrypoint starts the server in remote HTTP mode with `--enable-write` and `--enable-bearer`.

## Operations Reference

<!-- OPERATIONS_REFERENCE:START -->

These commands are generated from the package scripts and container entrypoint so `pnpm docs:check` can detect drift:

```bash
pnpm --filter actual-mcp start
node build/index.js --sse --enable-write --enable-bearer
docker build -f mcp-server/Dockerfile -t actual-mcp .
docker run --rm -p 3000:3000 \
  -e ACTUAL_SERVER_URL=https://actual.example.com \
  -e ACTUAL_PASSWORD=replace-with-your-actual-password \
  -e ACTUAL_BUDGET_SYNC_ID=replace-with-your-budget-sync-id \
  -e BEARER_TOKEN=replace-with-a-long-random-token \
  actual-mcp
pnpm run inspector
pnpm run test:tools:live
pnpm run test:tools:sandbox
pnpm run test:tools:all
pnpm run test:startup-smoke
pnpm run docs:generate
pnpm run docs:check
pnpm run public:check
```

<!-- OPERATIONS_REFERENCE:END -->

## MCP Surface

<!-- TOOL_SURFACE:START -->

Generated from the declarative MCP modules under `src/mcp/`. The current surface exposes 45 tools, 8 prompts, and 12 resources:

- 16 read-only core tools
- 19 write-enabled core tools
- 10 advanced `--enable-advanced` tools
- 8 prompts
- 7 static resources
- 5 templated resources

The full generated inventory lives in [docs/tool-registry.md](docs/tool-registry.md).

<!-- TOOL_SURFACE:END -->

## Environment Variables Reference

| Variable                                  | Default                             | Description                                                                                                                                      |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACTUAL_SERVER_URL`                       | _(required)_                        | URL of your Actual Budget server                                                                                                                 |
| `ACTUAL_PASSWORD`                         | _(required if no token)_            | Password for remote-server auth. Set exactly one of `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`                                                  |
| `ACTUAL_SESSION_TOKEN`                    | _(required if no password)_         | Session token for remote-server auth. Alternative to `ACTUAL_PASSWORD`                                                                           |
| `ACTUAL_BUDGET_SYNC_ID`                   | _(required)_                        | Sync/group ID of the budget to load                                                                                                              |
| `ACTUAL_BUDGET_ENCRYPTION_PASSWORD`       | _(empty)_                           | Decryption password for encrypted budgets                                                                                                        |
| `BEARER_TOKEN`                            | _(required when `--enable-bearer`)_ | Shared secret for HTTP bearer auth. Must meet minimum length; checked at startup                                                                 |
| `PORT`                                    | `3000`                              | HTTP listener port in remote mode                                                                                                                |
| `ACTUAL_READ_FRESHNESS_MODE`              | `cached`                            | `cached` serves from cache; `strict-live` syncs before every read and fails on stale data                                                        |
| `ACTUAL_CONNECTION_HEALTH_TTL_MS`         | `20000`                             | How long (ms) read paths may skip a lightweight health probe (bounded 3000-300000)                                                               |
| `AUTO_SYNC_INTERVAL_MINUTES`              | `5`                                 | How often to sync with the Actual server in the background. Set non-zero for remote deployments                                                  |
| `CACHE_ENABLED`                           | `true`                              | Enable in-memory response cache                                                                                                                  |
| `CACHE_TTL_SECONDS`                       | `300`                               | Cache entry lifetime in seconds                                                                                                                  |
| `MCP_SESSION_TTL_MINUTES`                 | _(disabled)_                        | Expire idle streamable HTTP sessions after this many minutes. Omit to disable pruning                                                            |
| `MCP_ALLOWED_ORIGINS`                     | _(empty)_                           | Comma-separated list of allowed `Origin` headers for browser-based clients. Server-to-server requests without `Origin` are controlled separately |
| `MCP_TOOL_CORRELATION_LOGS`               | `false`                             | When `true` (HTTP mode), emit stderr lines with shortened request/session IDs per tool invocation                                                |
| `MCP_READINESS_TRANSITION_LOGS`           | `false`                             | When `true`, emit a `[READINESS]` stderr line on each change to the `/ready` payload                                                             |
| `MCP_CONNECTION_DIAGNOSTICS_INTERVAL_SEC` | _(disabled)_                        | Positive integer to emit periodic `[MCP_DIAG]` connection and memory lines                                                                       |
| `MCP_TOOL_USAGE_SUMMARY_INTERVAL_SEC`     | _(disabled)_                        | Positive integer to emit periodic `[TOOL_USAGE_SUMMARY]` per-tool invocation counts                                                              |
| `ACTUAL_GET_TRANSACTIONS_DEFAULT_LIMIT`   | `200`                               | Default page size for `get-transactions`                                                                                                         |
| `ACTUAL_GET_TRANSACTIONS_MAX_LIMIT`       | `5000`                              | Maximum allowed page size for `get-transactions`                                                                                                 |
| `ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID`      | _(empty)_                           | Sync ID of the dedicated sandbox budget used by the write-phase smoke tests                                                                      |
| `ACTUAL_TOOL_TEST_PREFIX`                 | `__mcp_tool_test__`                 | Prefix for fixture data created by smoke tests                                                                                                   |

## Architecture Overview

The server is organized into four main layers:

- **MCP surface** (`src/mcp/`): Declarative tool, prompt, and resource registration. Tools are grouped into read-only (default), write (`--enable-write`), and advanced (`--enable-advanced`) tiers. The MCP resource `actual://mcp/tool-surface` exposes the tool catalog as JSON.
- **Tool implementations** (`src/tools/`): Individual handlers for each MCP tool. Each tool exports a `schema` (JSON Schema) and a `handler` function.
- **Domain logic** (`src/core/`): Shared utilities for aggregation, analysis, data access, formatting, input parsing, and caching. The Actual Budget API client (`src/core/api/actual-client.ts`) is process-global and serializes all init/reconnect operations.
- **Runtime** (`src/runtime/`): Hono-based HTTP server for remote mode. Handles MCP sessions, bearer auth, and health/readiness endpoints. Stdio mode is used for desktop clients.

> **Note**: `@actual-app/api` and the Actual client are process-global. All active MCP sessions share one loaded budget. Use separate deployments for mutually exclusive budgets.

## HTTP Endpoints Reference

| Endpoint       | Method          | Auth                            | Description                                                               |
| -------------- | --------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `/`            | GET             | None                            | Server name, version, and ready status                                    |
| `/health`      | GET             | None                            | Liveness check -- always returns `{ status: "ok" }`                       |
| `/ready`       | GET             | None                            | Readiness check -- 200 when budget is loaded, 503 otherwise               |
| `/diagnostics` | GET             | None                            | Connection state, memory usage, and config summary                        |
| `/mcp`         | GET/POST/DELETE | Bearer (when `--enable-bearer`) | MCP protocol endpoint (streamable HTTP transport)                         |
| `/reconnect`   | POST            | Bearer (when `--enable-bearer`) | Force a reconnect to the Actual Budget server -- useful after cold starts |

## Troubleshooting

| Symptom                                               | Likely cause                     | Fix                                                                                              |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/ready` returns 503 with `no_budgets_found`          | No budget downloaded yet         | Verify `ACTUAL_BUDGET_SYNC_ID` matches a budget on your Actual server                            |
| `/ready` returns 503 with `authentication_failed`     | Wrong password or session token  | Check `ACTUAL_PASSWORD` / `ACTUAL_SESSION_TOKEN` -- set exactly one, not both                    |
| `/ready` returns 503 with `migration_in_progress`     | Actual server schema out of sync | Update your Actual Budget server to the latest version and restart it                            |
| Server unresponsive after Render free-tier cold start | State reset on wake              | POST to `/reconnect` (bearer protected) or set `AUTO_SYNC_INTERVAL_MINUTES` to keep warm         |
| Bearer auth fails with 401                            | Token too short or mismatch      | `BEARER_TOKEN` must meet minimum length; check the value matches your client config              |
| MCP client times out on first tool call               | Budget sync in progress          | Wait for `/ready` to return 200 before running tools, or set `ACTUAL_READ_FRESHNESS_MODE=cached` |
| Memory growing in long-running containers             | Session leak                     | Set `MCP_SESSION_TTL_MINUTES` to expire idle sessions                                            |

## Inspector And Development

- MCP Inspector: `pnpm run inspector`
- Build: `pnpm build`
- Tests: `pnpm test`
- Live MCP tool smoke suite: `pnpm run test:tools:live`
- Sandbox MCP tool smoke suite: `pnpm run test:tools:sandbox`
- Combined MCP tool smoke suite: `pnpm run test:tools:all`
- Type-check: `pnpm type-check`
- Lint and format validation: `pnpm quality`
- Regenerate tool docs: `pnpm docs:generate`
- Verify docs are current: `pnpm docs:check`
- Verify the tree is safe to publish: `pnpm public:check`

The inspector runs locally and should never be committed with live session URLs, auth tokens, or local machine details.

## MCP Tool Smoke Testing

The tool smoke runner talks to the built stdio server over MCP and validates the tool surface in two phases:

- `pnpm run test:tools:live` runs read-only live checks against the configured budget and forces `ACTUAL_READ_FRESHNESS_MODE=strict-live` for the spawned server.
- `pnpm run test:tools:sandbox` runs the full write and `--enable-advanced` pass only when `ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID` is set.
- `pnpm run test:tools:all` runs both phases, skipping the sandbox phase when no sandbox budget ID is configured.

The live smoke pass enables `--enable-advanced` so safe budget-file discovery via `get-budget-files` is covered without exposing write tools. The sandbox pass uses test-prefixed fixtures and switches back to the configured budget before exiting.
For a persistent destructive-test budget, the recommended budget name is `Sandbox`. Set `ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID` to that budget's sync/group ID so the write-phase smoke tests always target the dedicated sandbox instead of your primary budget.
