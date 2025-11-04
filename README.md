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

## Quick Start - Deploy to Railway

The easiest way to use this MCP server is to deploy it to Railway using Nixpacks.

### Prerequisites

- A [Railway](https://railway.app/) account
- [Actual Budget](https://actualbudget.com/) server URL and credentials
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client

### Step 1: Deploy to Railway

1. **Fork or connect your repository to Railway:**
   - Go to [Railway](https://railway.app/)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository

2. **Railway will automatically:**
   - Detect the Node.js project using Nixpacks
   - Run `npm ci` to install dependencies
   - Run `npm run build` to compile TypeScript
   - Start the server with the command from `railway.json`

3. **Configure environment variables in Railway:**
   - Go to your Railway project settings
   - Add the following environment variables:
     - `ACTUAL_SERVER_URL` - Your Actual Budget server URL (e.g., `https://your-actual-server.com`)
     - `ACTUAL_PASSWORD` - Your Actual Budget server password
     - `ACTUAL_BUDGET_SYNC_ID` - Your budget ID (optional, if you have multiple budgets)
     - `ACTUAL_BUDGET_PASSWORD` - Password for end-to-end encrypted budgets (optional)
     - `BEARER_TOKEN` - A secure random token for authentication (recommended for production)

4. **Get your Railway deployment URL:**
   - Railway will provide a public URL (e.g., `https://your-app.railway.app`)
   - Your MCP server will be available at `https://your-app.railway.app/mcp`

### Step 2: Connect Claude Desktop to Your Remote Server

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following configuration to connect to your Railway deployment:

```json
{
  "mcpServers": {
    "actualBudget": {
      "url": "https://your-app.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer your-bearer-token"
      }
    }
  }
}

Replace:
- `https://your-app.railway.app/mcp` with your Railway deployment URL + `/mcp`
- `your-bearer-token` with the `BEARER_TOKEN` you set in Railway environment variables

> **Note**: If you're using Claude Desktop, it may require HTTP/SSE transport support. Check your Claude Desktop version supports remote MCP servers. For Poke MCP and other modern MCP clients, use the configuration above.

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 `ACTUAL_BUDGET_PASSWORD` is only required for end-to-end encrypted budgets.

> 💡 Use `--enable-write` to enable write-access tools.

## Usage with Poke MCP

[Poke MCP](https://github.com/modelcontextprotocol/poke-mcp) is a modern MCP client that supports HTTP/SSE transport. 

### Quick Start

1. **Start the server in SSE mode:**

```bash
npm run build
node build/index.js --sse --enable-write
```

2. **Connect Poke MCP to the server:**

The server will be available at `http://localhost:3000/mcp` for Poke MCP connections.

### Configuration

For detailed Poke MCP setup instructions, see the [Poke MCP Guide](./docs/POKE_MCP.md).

**Quick example:**

```bash
# Start server with SSE and bearer auth (recommended for production)
export BEARER_TOKEN="your-secure-token"
node build/index.js --sse --enable-write --enable-bearer

# Connect Poke MCP to: http://localhost:3000/mcp
# Use bearer token: your-secure-token
```

For local development without authentication:

```bash
node build/index.js --sse --enable-write
```

## Alternative Deployment Options

### Other Platforms

- **Render/Other Platforms**: Ensure the build command (`npm run build`) runs before starting the server. The start command should be `node build/index.js --sse --enable-write`.

**Important**: Ensure your deployment platform runs `npm run build` before starting the server, as the `build/` directory is gitignored.

> **Note**: Docker images are available for alternative deployments, but Nixpacks is the recommended approach for Railway deployments.

## Local Development (Optional)

For local development or testing only, you can run the server locally:

```bash
# Set environment variables
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
export BEARER_TOKEN="your-bearer-token"  # Optional but recommended

# Build and run
npm run build
node build/index.js --sse --enable-write --enable-bearer
```

The server will be available at `http://localhost:3000/mcp` for MCP clients.

> ⚠️ Important: When using `--enable-bearer`, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

> **Note**: For production deployments, use Railway with Nixpacks (see Deployment section above). Docker images are available as an alternative option.

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
