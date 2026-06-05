# Actual MCP

This repository contains a source-buildable Actual Budget MCP server in [`mcp-server/`](./mcp-server). The server exposes Actual Budget data and write workflows over MCP, including budgeting, reconciliation, schedule management, transaction imports, starting-balance repair, and transfer-aware transaction creation.

## Primary Package

- [`mcp-server/`](./mcp-server) is the product package.
- [`mcp-server/README.md`](./mcp-server/README.md) is the authoritative guide for installation, configuration, client setup, and tool inventory.
- [`docs/engineering-notes.md`](./docs/engineering-notes.md) contains contributor-facing implementation notes.

## Public Vs. Private Layout

This repository is organized around a simple rule:

- Public, shareable project assets stay in tracked paths such as `mcp-server/`, `docs/`, `.github/`, and the root config files.
- Private financial exports, reconciliation scratch files, backups, and other local-only artifacts belong under `.local-reconciliation/`, which is gitignored on purpose.
- Local runtime caches such as `.actual-data/`, `.playwright-cli/`, and `tmp/` are also private and should never be committed.

If you need a place for budget-specific working files, put them under `.local-reconciliation/` instead of creating a new top-level folder.

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

## Docker Compose

For local development or self-hosting with Docker Compose:

1. Copy the example environment file and set your credentials:

   ```bash
   cp mcp-server/.env.example .env
   # Edit .env with your ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_BUDGET_SYNC_ID, and BEARER_TOKEN
   ```

2. Start the server:

   ```bash
   docker compose up
   ```

   The server starts in remote HTTP mode on port 3000 with write access enabled.

3. For development with additional logging:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

Budget data is persisted in a named Docker volume (`actual-data`). Use `/health` for liveness checks and `/ready` for readiness checks.

## Security And Public Readiness

- Rotate any previously exposed credentials, bearer tokens, sync IDs, and local inspector tokens before sharing the repository.
- Rewrite git history to remove previously committed secret-bearing files or values before pushing a public branch.
- Run `pre-commit run --all-files` and `pnpm --filter actual-mcp public:check` to verify the working tree is public-safe.
- Keep private reconciliation data, statement exports, backup zips, and ad hoc audit outputs under `.local-reconciliation/` only.

## Repository Layout

```text
.
+-- mcp-server/             # Public product code and package scripts
+-- docs/                   # Public contributor docs
+-- .github/                # Public CI and repo automation
+-- .local-reconciliation/  # Private local-only financial workspace (ignored)
+-- .actual-data/           # Private local Actual cache/state (ignored)
+-- tmp/                    # Private scratch outputs (ignored)
+-- render.yaml             # Public deployment blueprint
`-- .pre-commit-config.yaml # Public repo hygiene checks
```

## Architecture

The system consists of three main components communicating via the Model Context Protocol (MCP) or Actual's internal sync:

```text
+-----------------------+       +-------------------+       +-------------+
| Actual Budget Server  | <---> | Actual MCP Server | <---> | MCP Client  |
| (Node.js/SQLite)      | Sync  | (Hono/HTTP/stdio) |  MCP  | (Claude,    |
+-----------------------+       +-------------------+       |  Cursor...) |
```

### Streamable HTTP transport and budget scope

When running in remote HTTP mode, the server allocates one MCP server instance (`McpServer`) per authenticated streamable HTTP session. However, the Actual Client library (`@actual-app/api`) and its connections remain **process-global**. Idle sessions are pruned automatically via `MCP_SESSION_TTL_MINUTES`, yet every active session still shares **one loaded budget**, cache layers, sync loops, and connection health probes.

### Tool Structure

Tools, prompts, and resources are structured using declarative MCP registration under `src/mcp/`. This allows for explicit safety annotations, structured tool results, and easy discovery by clients.

## Deployment

### Render Deployment

When deploying to Render's free tier or standard web services, keep in mind the **ephemeral disk limitation**. Since Actual uses SQLite, data stored locally on the MCP Server instance will be lost on restarts.
**Solution:** Ensure you are syncing to a persistent Actual Budget Server. The MCP Server acts as an ephemeral client. Set a non-zero `AUTO_SYNC_INTERVAL_MINUTES` to keep cached reads fresh.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACTUAL_SERVER_URL` | The URL of your Actual Budget Server | |
| `ACTUAL_PASSWORD` | Actual Server password (use this OR `ACTUAL_SESSION_TOKEN`) | |
| `ACTUAL_SESSION_TOKEN` | Session token for auth (use this OR `ACTUAL_PASSWORD`) | |
| `ACTUAL_BUDGET_SYNC_ID` | The Sync ID of your budget | |
| `BEARER_TOKEN` | Token required for clients to connect to the MCP Server in HTTP mode | |
| `PORT` | Port for the MCP HTTP server | 3000 |
| `MCP_SESSION_TTL_MINUTES`| Time before idle HTTP sessions are pruned | |
| `AUTO_SYNC_INTERVAL_MINUTES`| Interval for automatic syncing | 5 |

### Common Production Configurations

- **Reverse Proxy:** Terminate TLS in front of the server (e.g., using Nginx, Caddy, or a platform load balancer) and treat the bearer token as a full read/write secret.
- **Network Restrictions:** Restrict network access to the MCP server using your reverse proxy or platform controls. Only allow trusted MCP clients.

## Troubleshooting

- **Budget not loading after cold start:** In remote setups, the connection to Actual might drop or sleep. Use the `/reconnect` endpoint or wait for the automatic health probes to re-establish the connection.
- **CORS errors:** If using the HTTP transport from a web-based client, ensure you set `CORS_ALLOWED_ORIGINS` in your environment to allow your client's origin.
- **Rate limit errors:** If you encounter rate limiting, you can adjust `RATE_LIMIT_MAX` (if applicable to your proxy/setup) or ensure your client isn't polling aggressively.
- **Health Checks:** Use the `/health` endpoint for standard liveness checks and `/ready` to verify Actual connectivity readiness.

## Development

### Running locally with Docker Compose

You can use Docker Compose to run the MCP server locally alongside other services:

```yaml
version: '3'
services:
  actual-mcp:
    build:
      context: .
      dockerfile: mcp-server/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ACTUAL_SERVER_URL=https://actual.example.com
      - ACTUAL_PASSWORD=your-password
      - ACTUAL_BUDGET_SYNC_ID=your-sync-id
      - BEARER_TOKEN=your-secure-token
```

### Running Tests

To run the test suite, use the workspace `test` script from the root directory:

```bash
pnpm --filter actual-mcp test
```

For smoke testing against the Actual tool surface:

```bash
pnpm --filter actual-mcp test:tools:all
```

### Adding a New Tool

1. Create a new module under `mcp-server/src/mcp/tools/`.
2. Define the tool's input schema using Zod.
3. Register the tool in `mcp-server/src/mcp/tools/index.ts`, ensuring you declare whether it requires write access or advanced privileges.

## Tools Reference

Below is a list of all available MCP tools with their input parameters and example outputs.

### Read-Only Core

- **`audit-historical-transfers`**: Audit already-imported transactions for strict historical transfer candidates.
  - *Inputs*: None
  - *Output Example*: `{"type": "audit-results", "data": [{"id": "...", "amount": 1000}]}`
- **`audit-uncategorized-transactions`**: Audit uncategorized transactions at scale.
  - *Inputs*: None
  - *Output Example*: `{"type": "audit-results", "data": [{"id": "...", "payee": "Unknown"}]}`
- **`balance-history`**: Track how an account balance has changed over time with monthly snapshots.
  - *Inputs*: `accountId`
  - *Output Example*: `{"accountId": "...", "history": [{"month": "2024-01", "balance": 1000}]}`
- **`get-account-balance`**: Check the current or historical balance of a specific account.
  - *Inputs*: `accountId`
  - *Output Example*: `{"accountId": "...", "balance": 5000}`
- **`get-accounts`**: List all accounts with current balances.
  - *Inputs*: None
  - *Output Example*: `[{"id": "...", "name": "Checking", "balance": 5000}]`
- **`get-budget-month`**: View budget details for a specific month.
  - *Inputs*: `month` (YYYY-MM)
  - *Output Example*: `{"month": "2024-01", "income": 5000, "budgeted": 4000}`
- **`get-financial-insights`**: Get a pre-analyzed financial health summary.
  - *Inputs*: None
  - *Output Example*: `{"health": "good", "insights": ["Savings rate is 20%"]}`
- **`get-grouped-categories`**: List all budget categories organized by groups.
  - *Inputs*: None
  - *Output Example*: `[{"id": "...", "name": "Bills", "categories": [{"id": "...", "name": "Rent"}]}]`
- **`get-payees`**: List all merchants and payees, or search for specific ones.
  - *Inputs*: `search` (optional)
  - *Output Example*: `[{"id": "...", "name": "Grocery Store"}]`
- **`get-rules`**: List auto-categorization rules.
  - *Inputs*: None
  - *Output Example*: `[{"id": "...", "conditions": [...], "actions": [...]}]`
- **`get-schedules`**: Retrieve all recurring transaction schedules.
  - *Inputs*: None
  - *Output Example*: `[{"id": "...", "name": "Rent", "amount": 1000}]`
- **`get-tags`**: List all tags in Actual Budget, or search for specific tags.
  - *Inputs*: `search` (optional)
  - *Output Example*: `[{"id": "...", "name": "Travel"}]`
- **`get-transactions`**: Query and filter transaction history.
  - *Inputs*: `accountId` (optional), `limit` (optional), `offset` (optional)
  - *Output Example*: `{"transactions": [{"id": "...", "amount": -5000, "date": "2024-01-01"}]}`
- **`monthly-summary`**: Generate high-level financial overview.
  - *Inputs*: `months` (optional)
  - *Output Example*: `{"summary": {"income": 15000, "expenses": 12000}}`
- **`recommend-budget-plan`**: Analyze recent budget history and recommend category targets.
  - *Inputs*: `month` (YYYY-MM)
  - *Output Example*: `{"recommendations": [{"categoryId": "...", "amount": 500}]}`
- **`spending-by-category`**: Break down spending by category.
  - *Inputs*: `month` (YYYY-MM)
  - *Output Example*: `{"breakdown": [{"categoryId": "...", "amount": -2000}]}`

### Write Core

- **`apply-budget-plan`**: Apply category budget recommendations to a target month.
  - *Inputs*: `month`, `recommendations`
  - *Output Example*: `{"status": "success", "applied": 5}`
- **`apply-historical-transfers`**: Link strict historical transfer candidates as real transfers.
  - *Inputs*: `candidates`
  - *Output Example*: `{"status": "success", "linked": 2}`
- **`create-schedule`**: Create a new recurring transaction schedule.
  - *Inputs*: `name`, `amount`, `frequency`
  - *Output Example*: `{"id": "...", "name": "New Schedule"}`
- **`create-transaction`**: Add a new transaction to an account.
  - *Inputs*: `accountId`, `date`, `amount` (in cents), `payeeName`, `categoryId`
  - *Output Example*: `{"id": "...", "amount": -1000}`
- **`delete-schedule`**: Delete a recurring transaction schedule.
  - *Inputs*: `id`
  - *Output Example*: `{"status": "success"}`
- **`delete-transaction`**: Remove a transaction permanently.
  - *Inputs*: `id`
  - *Output Example*: `{"status": "success"}`
- **`import-transaction-batch`**: Import a structured batch of transactions into Actual Budget.
  - *Inputs*: `accountId`, `transactions`
  - *Output Example*: `{"status": "success", "imported": 10}`
- **`import-transactions`**: Sync transactions from connected bank accounts.
  - *Inputs*: `accountId`
  - *Output Example*: `{"status": "success", "synced": 5}`
- **`manage-category`**: Create, update, or delete a category.
  - *Inputs*: `action`, `id` (optional), `name` (optional), `groupId` (optional)
  - *Output Example*: `{"status": "success", "category": {"id": "..."}}`
- **`manage-category-group`**: Create, update, or delete a category group.
  - *Inputs*: `action`, `id` (optional), `name` (optional)
  - *Output Example*: `{"status": "success", "group": {"id": "..."}}`
- **`manage-payee`**: Create, update, or delete a payee.
  - *Inputs*: `action`, `id` (optional), `name` (optional)
  - *Output Example*: `{"status": "success", "payee": {"id": "..."}}`
- **`manage-rule`**: Create, update, or delete a rule.
  - *Inputs*: `action`, `id` (optional), `conditions` (optional), `actions` (optional)
  - *Output Example*: `{"status": "success", "rule": {"id": "..."}}`
- **`manage-tag`**: Create, update, or delete a tag.
  - *Inputs*: `action`, `id` (optional), `name` (optional)
  - *Output Example*: `{"status": "success", "tag": {"id": "..."}}`
- **`merge-payees`**: Combine duplicate payees into one.
  - *Inputs*: `targetId`, `mergeIds`
  - *Output Example*: `{"status": "success", "merged": 3}`
- **`reconcile-account`**: Compare an account against a statement balance.
  - *Inputs*: `accountId`, `statementBalance`
  - *Output Example*: `{"status": "success", "reconciled": true}`
- **`set-account-starting-balance`**: Create or update the single starting balance transaction for an existing account.
  - *Inputs*: `accountId`, `balance`
  - *Output Example*: `{"status": "success", "transactionId": "..."}`
- **`set-budget`**: Set or update the budget amount for a category in a specific month.
  - *Inputs*: `month`, `categoryId`, `amount`
  - *Output Example*: `{"status": "success", "updated": true}`
- **`update-schedule`**: Update an existing recurring transaction schedule.
  - *Inputs*: `id`, `fields`
  - *Output Example*: `{"status": "success", "schedule": {"id": "..."}}`
- **`update-transaction`**: Modify an existing transaction.
  - *Inputs*: `id`, `fields`
  - *Output Example*: `{"status": "success", "transaction": {"id": "..."}}`

### Advanced (`--enable-advanced`)

- **`close-account`**: Close an account in Actual Budget.
  - *Inputs*: `accountId`
  - *Output Example*: `{"status": "success", "closed": true}`
- **`get-budget-files`**: List all available budget files.
  - *Inputs*: None
  - *Output Example*: `[{"id": "...", "name": "My Budget"}]`
- **`hold-budget`**: Hold budget amount for the next month.
  - *Inputs*: `month`, `amount`
  - *Output Example*: `{"status": "success", "held": true}`
- **`manage-account`**: Create, update, or delete a account.
  - *Inputs*: `action`, `id` (optional), `name` (optional), `type` (optional)
  - *Output Example*: `{"status": "success", "account": {"id": "..."}}`
- **`reopen-account`**: Reopen a closed account.
  - *Inputs*: `accountId`
  - *Output Example*: `{"status": "success", "reopened": true}`
- **`reset-budget-hold`**: Reset (clear) a budget hold for a specific month.
  - *Inputs*: `month`
  - *Output Example*: `{"status": "success", "reset": true}`
- **`switch-budget`**: Switch to a different budget file.
  - *Inputs*: `id` (budget sync ID)
  - *Output Example*: `{"status": "success", "switched": true}`
