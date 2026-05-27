# actual-mcp-operator

Private operator MCP server for **guarded repository self-modification**. Use this alongside `actual-mcp`, never as a replacement for budget tools.

## Capabilities (P0–P1)

| Tool                           | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `read-file`                    | Read allowlisted UTF-8 files                                       |
| `list-files`                   | List allowlisted files and directories                             |
| `search-code`                  | Regex search across allowlisted text files                         |
| `propose-file-change`          | Stage a full-file replacement with unified diff                    |
| `list-pending` / `get-pending` | Inspect staged changes                                             |
| `apply-pending`                | Apply staged changes (requires `--enable-apply` + approval secret) |
| `discard-pending`              | Drop staged changes                                                |

Resources: `operator://constraints`, `operator://pending`

## Setup

```bash
pnpm install
pnpm --filter actual-mcp-operator build
```

Environment (see [`.env.example`](./.env.example)):

- `OPERATOR_REPO_ROOT` — monorepo root (defaults to `cwd`)
- `OPERATOR_APPROVAL_SECRET` — required for `apply-pending` (32+ characters)
- `OPERATOR_BEARER_TOKEN` — required for HTTP mode with `--enable-bearer`

## Run

Stdio (desktop MCP clients):

```bash
pnpm --filter actual-mcp-operator start
```

HTTP (localhost development):

```bash
node operator-mcp/build/index.js --sse --enable-bearer
```

Apply staged changes (disabled by default):

```bash
node operator-mcp/build/index.js --enable-apply
```

## Safety model

- Paths are jailed to `OPERATOR_REPO_ROOT` with an explicit allowlist (`mcp-server/`, `operator-mcp/`, `docs/`, etc.).
- `.env`, `.git`, `node_modules`, and `.operator/` are blocked.
- File writes always stage under `.operator/pending/` first.
- `apply-pending` requires `--enable-apply` and `OPERATOR_APPROVAL_SECRET`.

Do **not** deploy this package to public Render services alongside production budget MCP.

## Claude Desktop example

```json
{
  "mcpServers": {
    "actual-mcp-operator": {
      "command": "node",
      "args": ["/absolute/path/to/workspace/operator-mcp/build/index.js"],
      "env": {
        "OPERATOR_REPO_ROOT": "/absolute/path/to/workspace",
        "OPERATOR_APPROVAL_SECRET": "use-a-long-random-secret-at-least-32-chars"
      }
    }
  }
}
```
