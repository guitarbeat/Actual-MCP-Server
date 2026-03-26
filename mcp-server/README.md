# actual-mcp

Actual Budget MCP server for Claude Desktop, Codex, Cursor, and other MCP clients.

## Highlights

- Actual Budget reads and writes over MCP, with separate read-only, write, and advanced (`--enable-nini`) tool surfaces.
- Declarative MCP registration for tools, prompts, and resources under `src/mcp/`.
- Transfer-aware transaction creation, starting-balance repair, account reconciliation, budget planning, schedule management, and batch transaction import.
- Hono-based remote runtime with streamable HTTP MCP transport, bearer auth, health checks, and stdio support for desktop clients.

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
- `--enable-nini` exposes advanced account and budget-file tools
- `--enable-bearer` requires `BEARER_TOKEN`, enforces a minimum token length at startup, and protects the remote `/mcp` endpoint
- `--host` and `--port` override the HTTP listener

Remote deployment notes:

- Terminate TLS in front of the server and treat the bearer token as a full read/write secret.
- Restrict network access with your reverse proxy or platform controls when possible.
- Use `/health` for liveness and `/ready` for Actual connectivity readiness.

## Render

This package can be deployed directly to Render as a web service. The repository root includes [`render.yaml`](../render.yaml), which points Render at [`Dockerfile`](./Dockerfile) and starts the server in remote HTTP mode with `--enable-write` and `--enable-bearer`.

Typical Render setup:

1. Create the service from the repository Blueprint.
2. Provide `ACTUAL_SERVER_URL`, one of `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`, `ACTUAL_BUDGET_SYNC_ID`, and `BEARER_TOKEN`.
3. Use `/health` as the liveness endpoint and `/ready` as the readiness endpoint.

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

## MCP Surface

<!-- TOOL_SURFACE:START -->

Generated from the declarative MCP modules under `src/mcp/`. The current surface exposes 51 tools, 2 prompts, and 10 resources:

- 14 read-only core tools
- 29 write-enabled core tools
- 8 advanced `--enable-nini` tools
- 2 prompts
- 5 static resources
- 5 templated resources

The full generated inventory lives in [docs/tool-registry.md](docs/tool-registry.md).

<!-- TOOL_SURFACE:END -->

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
- `pnpm run test:tools:sandbox` runs the full write and `--enable-nini` pass only when `ACTUAL_TOOL_TEST_SANDBOX_BUDGET_ID` is set.
- `pnpm run test:tools:all` runs both phases, skipping the sandbox phase when no sandbox budget ID is configured.

The live smoke pass enables `--enable-nini` so safe budget-file discovery via `get-budget-files` is covered without exposing write tools. The sandbox pass uses test-prefixed fixtures and switches back to the configured budget before exiting.
