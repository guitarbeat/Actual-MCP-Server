# Actual MCP

This repository contains a source-buildable Actual Budget MCP server in [`mcp-server/`](./mcp-server). The server exposes Actual Budget data and write workflows over MCP, including budgeting, reconciliation, schedule management, transaction imports, starting-balance repair, and transfer-aware transaction creation.

## Primary Package

- [`mcp-server/`](./mcp-server) is the product package.
- [`mcp-server/README.md`](./mcp-server/README.md) is the authoritative guide for installation, configuration, client setup, and tool inventory.
- [`docs/engineering-notes.md`](./docs/engineering-notes.md) contains contributor-facing implementation notes.

## Quick Start

```bash
git clone <your-repo-url>
cd actual-mcp
pnpm install
pnpm --filter actual-mcp build
pnpm --filter actual-mcp test
```

For package-specific setup and MCP client configuration, use [`mcp-server/README.md`](./mcp-server/README.md).

## Security And Public Readiness

- Rotate any previously exposed credentials, bearer tokens, sync IDs, and local inspector tokens before sharing the repository.
- Rewrite git history to remove previously committed secret-bearing files or values before pushing a public branch.
- Run `pre-commit run --all-files` and `pnpm --filter actual-mcp public:check` to verify the working tree is public-safe.

## Repository Layout

```text
.
├── mcp-server/           # Actual Budget MCP server package
├── docs/                 # Contributor-facing engineering notes
├── render.yaml           # Render blueprint for the MCP server
└── .pre-commit-config.yaml
```
