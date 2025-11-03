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
- **`get-account-balance`** - Get the balance of an account as of a specific date
- **`balance-history`** - View account balance changes over time
- **`create-transaction`** - Create new transactions with all fields, automatically creating payees and categories if needed
- **`create-account`** - Create a new account (requires `--enable-write`)
- **`update-account`** - Update an existing account's name, type, or off-budget status (requires `--enable-write`)
- **`close-account`** - Close an account (requires `--enable-write`)
- **`reopen-account`** - Reopen a closed account (requires `--enable-write`)
- **`delete-account`** - Delete an account (requires `--enable-write`)

#### Budget Operations

- **`set-budget-amount`** - Set the budgeted amount for a category in a specific month (requires `--enable-write`)
- **`set-budget-carryover`** - Enable or disable budget carryover for a category (requires `--enable-write`)
- **`hold-budget-for-next-month`** - Hold or release budget funds for the next month (requires `--enable-write`)
- **`reset-budget-hold`** - Reset the budget hold for a category (requires `--enable-write`)

#### Recurring Schedules

- **`get-schedules`** - Get all recurring schedules
- **`create-schedule`** - Create a new recurring schedule for transactions (requires `--enable-write`)
- **`update-schedule`** - Update an existing recurring schedule (requires `--enable-write`)
- **`delete-schedule`** - Delete a recurring schedule (requires `--enable-write`)

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group (requires `--enable-write`)
- **`update-category`** - Update an existing category's name or group (requires `--enable-write`)
- **`delete-category`** - Delete a category (requires `--enable-write`)
- **`create-category-group`** - Create a new category group (requires `--enable-write`)
- **`update-category-group`** - Update a category group's name (requires `--enable-write`)
- **`delete-category-group`** - Delete a category group (requires `--enable-write`)

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`get-payee-rules`** - Get all rules associated with a specific payee
- **`create-payee`** - Create a new payee (requires `--enable-write`)
- **`update-payee`** - Update an existing payee's details (requires `--enable-write`)
- **`delete-payee`** - Delete a payee (requires `--enable-write`)
- **`merge-payees`** - Merge multiple payees into a target payee (requires `--enable-write`)

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions (requires `--enable-write`)
- **`update-rule`** - Update an existing transaction rule (requires `--enable-write`)
- **`delete-rule`** - Delete a transaction rule (requires `--enable-write`)

#### Budget File Management

- **`get-budgets`** - Get a list of all available budgets
- **`load-budget`** - Load a budget by its ID (requires `--enable-write`)
- **`download-budget`** - Download a budget from the server, with optional support for end-to-end encrypted budgets (requires `--enable-write`)
- **`sync`** - Sync the budget with the server (requires `--enable-write`)
- **`run-bank-sync`** - Run bank sync for an account or all accounts (requires `--enable-write`)
- **`run-import`** - Run an import from a file (requires `--enable-write`)

#### Utilities

- **`get-id-by-name`** - Get the ID of an account, category, payee, or category group by its name

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

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

# Password for end-to-end encrypted budgets (optional)
export ACTUAL_BUDGET_PASSWORD="your-budget-password"
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
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "ACTUAL_BUDGET_PASSWORD": "your-budget-password"
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
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "ACTUAL_BUDGET_PASSWORD": "your-budget-password"
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
        "-e",
        "ACTUAL_BUDGET_PASSWORD=your-budget-password",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 `ACTUAL_BUDGET_PASSWORD` is only required for end-to-end encrypted budgets.

> 💡 Use `--enable-write` to enable write-access tools.

## Deployment

This MCP server can be deployed to various platforms. The build output in the `build/` directory is required for deployment.

### Platform-Specific Notes

- **Vercel/Netlify**: Configuration files (`vercel.json`, `netlify.toml`) are included. The platform will automatically run `npm run build` during deployment.
- **Railway/Render**: Use the included `railway.json` or ensure the build command runs before starting the server.
- **Docker**: The included `Dockerfile` handles building automatically.

**Important**: Ensure your deployment platform runs `npm run build` before starting the server, as the `build/` directory is gitignored.

## Running an SSE Server

To expose the server over a port using Docker:

```bash
docker run -i --rm \
  -p 3000:3000 \
  -v "/path/to/your/data:/data" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_SERVER_URL="http://your-actual-server.com" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e ACTUAL_BUDGET_PASSWORD="your-budget-password" \
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
- "Create a transaction for $25.50 at Grocery Store in my Checking account for Food category"
- "Add a new expense of $100 for rent to my account"

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
