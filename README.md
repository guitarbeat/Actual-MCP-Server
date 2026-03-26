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

## Render Deployment

This repository already includes a Render Blueprint at [`render.yaml`](./render.yaml) for deploying the MCP server as a web service.

Use the blueprint when you want to host the MCP server itself on Render:

1. Build and push this repository to GitHub.
2. In Render, create a new Blueprint or web service from the repo.
3. Set `ACTUAL_SERVER_URL`, one of `ACTUAL_PASSWORD` or `ACTUAL_SESSION_TOKEN`, `ACTUAL_BUDGET_SYNC_ID`, and `BEARER_TOKEN`.
4. Deploy and use `/health` and `/ready` for platform checks.

The Render Workflows SDK is a separate product from the MCP server runtime in this repo. Code like:

```ts
import { task } from "@renderinc/sdk/workflows";
```

is for background workflow jobs created with `render workflows init --language node`, not for the MCP server entrypoint under [`mcp-server/src/index.ts`](./mcp-server/src/index.ts), which now boots stdio mode or the remote Hono-based HTTP runtime.

If you want both:

- keep this repo and `render.yaml` for the deployed MCP server
- create a separate Render Workflows project for background jobs
- have the workflow call the deployed MCP server or other APIs as needed

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
