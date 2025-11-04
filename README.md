# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

## Features

### Resources

- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools

#### Transaction & Account Management

- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, or payee
- **`get-accounts`** - Retrieve a list of all accounts with their current balance and ID
- **`balance-history`** - View account balance changes over time

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group
- **`update-category`** - Update an existing category's name or group
- **`delete-category`** - Delete a category
- **`create-category-group`** - Create a new category group
- **`update-category-group`** - Update a category group's name
- **`delete-category-group`** - Delete a category group

> **Tip:** Category tools validate that IDs resemble Actual Budget UUIDs before making API calls. Use [`get-grouped-categories`](#categories) to copy the correct `groupId`/`categoryId` values before creating or updating records.

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`create-payee`** - Create a new payee
- **`update-payee`** - Update an existing payee's details
- **`delete-payee`** - Delete a payee

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions
- **`update-rule`** - Update an existing transaction rule
- **`delete-rule`** - Delete a transaction rule

#### Schedules

- **`get-schedules`** - List all recurring schedules
- **`create-schedule`** - Create a new recurring schedule
  - Required: `name`, `accountId`, `amount`, `nextDate` (YYYY-MM-DD), `rule` (e.g., monthly/weekly/biweekly)
  - Optional: `payee`, `category`, `notes`
- **`update-schedule`** - Update an existing schedule by `scheduleId`
- **`delete-schedule`** - Delete a schedule by `scheduleId`

Examples:

```json
{ "tool": "create-schedule", "args": { "name": "Rent", "accountId": "acc_123", "amount": -1240, "nextDate": "2025-12-01", "rule": "monthly", "payee": "Bilt", "category": "cat_housing" } }
```

```json
{ "tool": "get-schedules", "args": {} }
```

```json
{ "tool": "update-schedule", "args": { "scheduleId": "sch_123", "amount": -1250, "nextDate": "2026-01-01" } }
```

```json
{ "tool": "delete-schedule", "args": { "scheduleId": "sch_123" } }
```

#### Budgeting

- **`set-budget-amount`** - Set the budgeted amount for a category in a specific month
- **`set-budget-carryover`** - Enable or disable carryover for a category in a month
- **`hold-budget-for-next-month`** - Reserve funds for the next month
- **`reset-budget-hold`** - Clear held funds for a month

These tools enforce month (`YYYY-MM`), category UUID, and numeric amount validations so that downstream API calls never mutate the wrong budget period or category.

##### `set-budget-amount`

| Parameter   | Type    | Required | Validation & Notes |
| ----------- | ------- | -------- | ------------------ |
| `month`     | string  | ✅       | Must be `YYYY-MM`. The server rejects other formats with `month is required and must be a string in YYYY-MM format`. |
| `categoryId`| string  | ✅       | Must be an Actual category UUID. Fetch valid IDs via [`get-grouped-categories`](#categories). |
| `amount`    | number  | ✅       | Accepts positive/negative numeric values. Any non-number triggers `amount is required and must be a number`. |

Example request:

```json
{
  "tool": "set-budget-amount",
  "args": {
    "month": "2024-06",
    "categoryId": "c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e",
    "amount": 250.5
  }
}
```

Success response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully set budget amount of 250.5 for category c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e in month 2024-06\""
    }
  ]
}
```

Example error (bad month format):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: month is required and must be a string in YYYY-MM format"
    }
  ]
}
```

##### `set-budget-carryover`

| Parameter   | Type    | Required | Validation & Notes |
| ----------- | ------- | -------- | ------------------ |
| `month`     | string  | ✅       | Must be `YYYY-MM`. |
| `categoryId`| string  | ✅       | Must be a category UUID; use [`get-grouped-categories`](#categories) to confirm the value. |
| `enabled`   | boolean | ✅       | Only accepts boolean literals (`true`/`false`). |

Example success:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully enabled budget carryover for category c3f83834-81d0-4c93-8d6f-10e3ac7e2a6e in month 2024-06\""
    }
  ]
}
```

Example error (non-boolean `enabled`):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: enabled is required and must be a boolean"
    }
  ]
}
```

##### `hold-budget-for-next-month`

| Parameter | Type   | Required | Validation & Notes |
| --------- | ------ | -------- | ------------------ |
| `month`   | string | ✅       | `YYYY-MM` only. |
| `amount`  | number | ✅       | Must be numeric (positive to reserve funds, negative to release). |

Example error (amount typo):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: amount is required and must be a number"
    }
  ]
}
```

##### `reset-budget-hold`

| Parameter | Type   | Required | Validation & Notes |
| --------- | ------ | -------- | ------------------ |
| `month`   | string | ✅       | `YYYY-MM` only. |

Example success:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Successfully reset budget hold for month 2024-06\""
    }
  ]
}
```

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

### Troubleshooting validation errors

- **Invalid IDs** – Ensure `categoryId`, `groupId`, and other identifiers come from Actual Budget. Use helper tools like [`get-grouped-categories`](#categories), [`get-accounts`](#transaction--account-management), or [`get-payees`](#payees) to copy valid UUIDs.
- **Incorrect month format** – All budget tools expect `YYYY-MM`. If you only know a full date, trim it down (e.g., `2024-06-15` → `2024-06`).
- **Amount typos** – Amounts must be numbers. Remove currency symbols and ensure decimals use `.` (e.g., `250.5`). Negative numbers represent outflows where appropriate.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (optional)

### Remote access

Pull the latest docker image:

```
docker pull sstefanov/actual-mcp:latest
```

### Local setup

1. Clone the repository:

```bash
git clone https://github.com/sstefanov/actual-mcp.git
cd actual-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Build the local docker image (optional):

```bash
docker build -t <local-image-name> .
```

5. Configure environment variables (optional):

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

Optional: separate encryption budget password

If your Actual setup requires a different password to unlock the local/encrypted budget data than the server authentication password, you can set `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in addition to `ACTUAL_PASSWORD`.

```bash
# If server auth and encryption/unlock use different passwords
export ACTUAL_BUDGET_ENCRYPTION_PASSWORD="your-encryption-password"
```

## Usage with Claude Desktop

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following to your configuration...

### a. Using Node.js (npx version):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}

### a. Using Node.js (local only):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/your/clone/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

### b. Using Docker (local or remote images):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/data:/data",
        "-e",
        "ACTUAL_PASSWORD=your-password",
        "-e",
        "ACTUAL_SERVER_URL=https://your-actual-server.com",
        "-e",
        "ACTUAL_BUDGET_SYNC_ID=your-budget-id",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 Use `--enable-write` to enable write-access tools.

## Running an SSE Server

To expose the server over a port using Docker:

```bash
docker run -i --rm \
  -p 3000:3000 \
  -v "/path/to/your/data:/data" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_SERVER_URL="http://your-actual-server.com" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e BEARER_TOKEN="your-bearer-token" \
  sstefanov/actual-mcp:latest \
  --sse --enable-write --enable-bearer
```

> ⚠️ Important: When using --enable-bearer, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"

## Development

For development with auto-rebuild:

```bash
npm run watch
```

### Testing the connection to Actual

To verify the server can connect to your Actual Budget data:

```bash
node build/index.js --test-resources
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

- `index.ts` - Main server implementation
- `types.ts` - Type definitions for API responses and parameters
- `prompts.ts` - Prompt templates for LLM interactions
- `utils.ts` - Helper functions for date formatting and more

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
