# actual-mcp-operator

Private operator MCP server for **guarded repository self-modification**. Use this alongside `actual-mcp`, never as a replacement for budget tools.

## Capabilities

### P0–P1 — Files and staged writes

| Tool                           | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `read-file`                    | Read allowlisted UTF-8 files                                       |
| `list-files`                   | List allowlisted files and directories                             |
| `search-code`                  | Regex search across allowlisted text files                         |
| `propose-file-change`          | Stage a full-file replacement with unified diff                    |
| `list-pending` / `get-pending` | Inspect staged changes                                             |
| `apply-pending`                | Apply staged changes (requires `--enable-apply` + approval secret) |
| `discard-pending`              | Drop staged changes                                                |

### P2 — Git

| Tool           | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `git-status`   | Porcelain status (read-only)                                                  |
| `git-diff`     | Repository or path diff (read-only)                                           |
| `git-log`      | Recent commits (read-only)                                                    |
| `git-commit`   | Commit staged or explicit allowlisted paths (`--enable-git-write` + approval) |
| `git-pull`     | `git pull --ff-only` (`--enable-git-write`)                                   |
| `git-push`     | Push branch, no `--force` (`--enable-git-push` + approval)                    |
| `git-rollback` | `git reset --hard HEAD~N` (`--enable-git-write` + approval)                   |

Set `OPERATOR_ALLOWED_BRANCH_PREFIX` (e.g. `cursor/`) to restrict mutating git operations to matching branches.

### P3 — Quality and health

| Tool                    | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `run-quality`           | `pnpm --filter actual-mcp quality`                |
| `run-build`             | `pnpm --filter actual-mcp build`                  |
| `run-tests`             | `pnpm --filter actual-mcp test`                   |
| `run-startup-smoke`     | `pnpm --filter actual-mcp test:startup-smoke`     |
| `run-quality-gate`      | quality → build → test (optional startup smoke)   |
| `operator-health-check` | git status, pending count, flags, build artifacts |

### P4 — Deploy orchestration

| Tool             | Purpose                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `prepare-deploy` | Stash if dirty → `git fetch` → `git pull --ff-only` (requires `--enable-deploy` + `--enable-git-write`) |
| `execute-deploy` | Run quality → build → test (optional smoke); log result (requires `--enable-deploy` + approval)         |
| `deploy-status`  | Read recent entries from `.operator/deploy-log.jsonl`                                                   |

Typical flow: `prepare-deploy` → review → `apply-pending` / `git-commit` as needed → `execute-deploy` → restart processes manually when `restartRequired` is true.

Resources: `operator://constraints`, `operator://pending`

## Setup

```bash
pnpm install
pnpm --filter actual-mcp-operator build
```

Environment (see [`.env.example`](./.env.example)):

- `OPERATOR_REPO_ROOT` — monorepo root (defaults to `cwd`)
- `OPERATOR_APPROVAL_SECRET` — required for apply/git mutators (32+ characters)
- `OPERATOR_BEARER_TOKEN` — required for HTTP mode with `--enable-bearer`
- `OPERATOR_ALLOWED_BRANCH_PREFIX` — optional branch guard for git writes

## Run

Stdio (desktop MCP clients):

```bash
pnpm --filter actual-mcp-operator start
```

Enable mutating operations (local operator host only):

```bash
node operator-mcp/build/index.js \
  --enable-apply \
  --enable-git-write \
  --enable-git-push \
  --enable-deploy
```

HTTP (localhost development):

```bash
node operator-mcp/build/index.js --sse --enable-bearer
```

## Safety model

- Paths are jailed to `OPERATOR_REPO_ROOT` with an explicit allowlist (`mcp-server/`, `operator-mcp/`, `docs/`, etc.).
- `.env`, `.git`, `node_modules`, and `.operator/` are blocked for **file** tools (git uses the real `.git` directory via the git CLI).
- File writes stage under `.operator/pending/` first.
- Mutations require explicit flags plus `approvalSecret` where noted.

Do **not** deploy this package to public Render services alongside production budget MCP.

## Claude Desktop example

```json
{
  "mcpServers": {
    "actual-mcp-operator": {
      "command": "node",
      "args": [
        "/absolute/path/to/workspace/operator-mcp/build/index.js",
        "--enable-apply",
        "--enable-git-write",
        "--enable-deploy"
      ],
      "env": {
        "OPERATOR_REPO_ROOT": "/absolute/path/to/workspace",
        "OPERATOR_APPROVAL_SECRET": "use-a-long-random-secret-at-least-32-chars",
        "OPERATOR_ALLOWED_BRANCH_PREFIX": "cursor/"
      }
    }
  }
}
```
