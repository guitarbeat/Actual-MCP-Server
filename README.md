# Actual MCP

This workspace is centered on the public Actual Budget MCP server in [`mcp-server/`](./mcp-server). It exposes Actual Budget data and write workflows over MCP, including budgeting, reconciliation, schedule management, transaction imports, starting-balance repair, and transfer-aware transaction creation.

## Distribution Targets

- npm package: [`@guitarbeat/actual-mcp`](https://www.npmjs.com/package/@guitarbeat/actual-mcp)
- Container image: `ghcr.io/guitarbeat/actual-mcp`
- Source repository: `https://github.com/guitarbeat/Actual-MCP-Server`

## Quick Start

```bash
git clone https://github.com/guitarbeat/Actual-MCP-Server.git
cd Actual-MCP-Server
pnpm install
pnpm --filter @guitarbeat/actual-mcp build
pnpm --filter @guitarbeat/actual-mcp test
```

Use [`mcp-server/README.md`](./mcp-server/README.md) for package installation, MCP client configuration, Docker usage, and the generated tool inventory.

## Public Hygiene

- Rotate any previously exposed credentials, bearer tokens, sync IDs, and local inspector tokens before publishing.
- Rewrite git history to remove earlier secret-bearing files or values before pushing a public branch.
- Run `pre-commit run --all-files` and `pnpm --filter @guitarbeat/actual-mcp public:check` before release.

## Repository Layout

```text
.
├── mcp-server/              # Publishable MCP server package
├── docs/                    # Contributor-facing engineering notes
├── render.yaml              # Render blueprint for HTTP/SSE deployment
└── .pre-commit-config.yaml  # Secret scanning and public-tree checks
```
