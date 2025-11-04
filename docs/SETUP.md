# MCP Client Setup Guide

This guide covers setting up the Actual Budget MCP Server with various MCP clients.

## Quick Links

- **Poke MCP** (Recommended for HTTP/SSE) - See [Poke MCP Setup](#poke-mcp-setup)
- **Claude Desktop** - See [Claude Desktop Setup](#claude-desktop-setup)
- **Cursor IDE** - See [Cursor IDE Setup](#cursor-ide-setup)

---

## Poke MCP Setup

[Poke MCP](https://github.com/modelcontextprotocol/poke-mcp) is a modern MCP client that supports HTTP/SSE transport.

### Server Configuration

#### Option 1: Railway Deployment (Recommended)

1. **Deploy to Railway:**
   - Connect your repository to Railway
   - Railway detects Node.js using Nixpacks
   - `railway.json` configures the start command

2. **Set environment variables:**
   - `ACTUAL_SERVER_URL` - Your Actual Budget server URL
   - `ACTUAL_PASSWORD` - Your Actual Budget server password
   - `ACTUAL_BUDGET_SYNC_ID` - Your budget ID
   - `BEARER_TOKEN` - Secure random token (recommended)

3. **Start command:** `node build/index.js --sse --enable-write --enable-bearer`

4. **Connect Poke MCP:**
   - **URL**: `https://your-app.railway.app/sse` (use `/sse` for SSE transport, not `/mcp`)
   - **Transport**: HTTP/SSE
   - **Authentication**: Bearer Token
   - **Token**: Value of `BEARER_TOKEN` environment variable

#### Option 2: Local Development

```bash
# Build and start server
npm run build
node build/index.js --sse --enable-write

# With bearer authentication
export BEARER_TOKEN="your-secure-token"
node build/index.js --sse --enable-write --enable-bearer
```

**Connect Poke MCP to:** `http://localhost:3000/sse` (use `/sse` endpoint)

#### Option 3: Docker

```bash
docker run -d \
  --name actual-mcp \
  -p 3000:3000 \
  -e ACTUAL_SERVER_URL="https://your-actual-server.com" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e BEARER_TOKEN="your-secure-token" \
  sstefanov/actual-mcp:latest \
  --sse --enable-write --enable-bearer
```

### Server Endpoints

- `GET /sse` - SSE transport endpoint (use this for Poke MCP)
- `POST /messages` - Messages endpoint (used by SSE transport)

### Server Arguments

- `--sse` - Enable SSE transport mode (required for Poke MCP)
- `--enable-write` - Enable write-access tools
- `--enable-bearer` - Enable bearer token authentication
- `--port <number>` - Specify port (default: 3000)

### Testing

```bash
# Test server connection
node build/index.js --test-resources

# Test custom methods
node build/index.js --test-custom
```

---

## Claude Desktop Setup

### Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration Example

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/actual-mcp/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_SERVER_URL": "https://your-actual-server.com",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "ACTUAL_BUDGET_PASSWORD": "your-budget-password"
      }
    }
  }
}
```

**Important:** Add `"--enable-write"` to the `args` array to enable write-access tools.

### Using npx (Alternative)

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_SERVER_URL": "https://your-actual-server.com",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

---

## Cursor IDE Setup

Cursor IDE manages MCP configuration through its UI:

1. Open Cursor Settings
2. Navigate to **Features** → **Model Context Protocol**
3. Add a new MCP server with:
   - **Command**: `node`
   - **Args**: `["/path/to/actual-mcp/build/index.js", "--enable-write"]`
   - **Environment Variables**:
     - `ACTUAL_SERVER_URL`
     - `ACTUAL_PASSWORD`
     - `ACTUAL_BUDGET_SYNC_ID`
     - `ACTUAL_BUDGET_PASSWORD` (optional)

**Important:** Include `"--enable-write"` in the args to enable write-access tools.

---

## Environment Variables

### Required

- `ACTUAL_SERVER_URL` - Your Actual Budget server URL
- `ACTUAL_PASSWORD` - Your Actual Budget server password
- `ACTUAL_BUDGET_SYNC_ID` - Your budget ID (optional if you only have one budget)

### Optional

- `ACTUAL_BUDGET_PASSWORD` - For end-to-end encrypted budgets
- `BEARER_TOKEN` - Secure random token for bearer authentication (required when using `--enable-bearer`)

---

## Security Considerations

### Production (Remote Servers)

**Always use bearer authentication** when exposing the server:

```bash
node build/index.js --sse --enable-write --enable-bearer
export BEARER_TOKEN="your-secure-random-token"
```

### Development (Local)

For local development, bearer authentication is optional:

```bash
node build/index.js --sse --enable-write
```

---

## Troubleshooting

### Connection Issues

- Verify server is running: `curl http://localhost:3000/`
- Check port matches configuration
- Ensure `--sse` flag is used for Poke MCP
- For Poke MCP, use `/sse` endpoint, not `/mcp`

### Input Validation Errors

- **Invalid IDs** – Copy identifiers directly from helper tools to avoid typos. Use [`get-grouped-categories`](../README.md#categories) for category and group UUIDs, [`get-accounts`](../README.md#transaction--account-management) for account IDs, and [`get-payees`](../README.md#payees) for payees.
- **Wrong month format** – Budget tools expect `YYYY-MM` (e.g., `2024-06`). Convert full dates or natural language months before sending the request.
- **Amount not a number** – Remove currency symbols/commas and ensure decimals use `.`. The server only accepts numeric `amount` values.

### Authentication Errors (401)

- Verify `BEARER_TOKEN` environment variable is set
- Ensure `--enable-bearer` flag is used
- Check token matches between client and server

### Actual Budget Connection Issues

- Verify `ACTUAL_SERVER_URL` is correct
- Check `ACTUAL_PASSWORD` is valid
- Ensure `ACTUAL_BUDGET_SYNC_ID` matches an existing budget
- Test connection: `node build/index.js --test-resources`

---

## Next Steps

- See [Development Guide](./DEVELOPMENT.md) for API coverage and development information
- Check the main [README.md](../README.md) for full feature list

