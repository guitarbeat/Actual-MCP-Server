# actual-mcp

Actual Budget MCP server for Claude Desktop, Codex, Cursor, and other MCP clients.

## Highlights

- Actual Budget reads and writes over MCP, with separate read-only, write, and advanced (`--enable-nini`) tool surfaces.
- Transfer-aware transaction creation, starting-balance repair, account reconciliation, budget planning, schedule management, and batch transaction import.
- Persistent Actual connection management, in-memory caching, safe logging, bearer auth for remote transports, and both stdio plus HTTP/SSE transports.

## Install

From the workspace root:

```bash
pnpm install
pnpm --filter actual-mcp build
```

## Configuration

Copy the placeholders from [`.env.example`](./.env.example) and set these values:

```bash
ACTUAL_SERVER_URL=https://actual.example.com
ACTUAL_PASSWORD=replace-with-your-actual-password
ACTUAL_BUDGET_SYNC_ID=replace-with-your-budget-sync-id
```

Optional variables:

- `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` for encrypted budgets
- `BEARER_TOKEN` for HTTP/SSE auth when `--enable-bearer` is enabled
- `PORT` for HTTP/SSE mode
- `AUTO_SYNC_INTERVAL_MINUTES`, `CACHE_ENABLED`, and `CACHE_TTL_SECONDS` for runtime behavior

## Run Modes

Default stdio mode is intended for desktop MCP clients:

```bash
pnpm --filter actual-mcp start
```

Remote HTTP/SSE mode:

```bash
node build/index.js --sse --enable-write --enable-bearer
```

Useful flags:

- `--enable-write` exposes write-capable tools
- `--enable-nini` exposes advanced account and budget-file tools
- `--enable-bearer` requires `BEARER_TOKEN` and allows non-localhost binding by default
- `--host` and `--port` override the HTTP listener

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

The container entrypoint starts the server in HTTP/SSE mode with `--enable-write` and `--enable-bearer`.

## Tool Surface

<!-- TOOL_SURFACE:START -->
Generated from `src/tools/index.ts`. The current registry exposes 47 tools total:
- 13 read-only core tools
- 26 write-enabled core tools
- 8 advanced `--enable-nini` tools

The full generated inventory lives in [docs/tool-registry.md](docs/tool-registry.md).
<!-- TOOL_SURFACE:END -->

## Inspector And Development

- MCP Inspector: `pnpm run inspector`
- Build: `pnpm build`
- Tests: `pnpm test`
- Type-check: `pnpm type-check`
- Lint and format validation: `pnpm quality`
- Regenerate tool docs: `pnpm docs:generate`
- Verify docs are current: `pnpm docs:check`
- Verify the tree is safe to publish: `pnpm public:check`

The inspector runs locally and should never be committed with live session URLs, auth tokens, or local machine details.
