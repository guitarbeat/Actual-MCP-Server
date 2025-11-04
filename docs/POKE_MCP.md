# Using Actual Budget MCP Server with Poke MCP

This guide explains how to use the Actual Budget MCP Server with [Poke MCP](https://github.com/modelcontextprotocol/poke-mcp), a modern MCP client that supports HTTP/SSE transport.

## Quick Start

Poke MCP works best with the SSE (Server-Sent Events) transport mode. The Actual Budget MCP Server supports this via the `--sse` flag.

## Running the Server for Poke MCP

### Option 1: Local Development

1. **Start the server in SSE mode:**

```bash
npm run build
node build/index.js --sse --enable-write
```

The server will start on port 3000 (default) or the port specified via `--port`.

2. **Connect Poke MCP to the server:**

Poke MCP can connect to the server at:
- **HTTP Endpoint**: `http://localhost:3000/mcp`
- **SSE Endpoint**: `http://localhost:3000/sse` (for SSE transport)

### Option 2: Railway with Nixpacks (Recommended for Production)

1. **Deploy to Railway:**
   - Connect your repository to Railway
   - Railway will automatically detect the Node.js project using Nixpacks
   - The `railway.json` file configures the start command with `--sse --enable-write`

2. **Set environment variables in Railway:**
   - `ACTUAL_SERVER_URL`
   - `ACTUAL_PASSWORD`
   - `ACTUAL_BUDGET_SYNC_ID`
   - `BEARER_TOKEN` (recommended for production)

3. **Connect Poke MCP to your Railway URL:**
   - **HTTP Endpoint**: `https://your-app.railway.app/mcp`
   - Use bearer token authentication if configured

### Option 3: Docker (Alternative)

For Docker-based deployments, you can use the provided Docker images:

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

Or use Docker Compose with the included `dev/docker-compose.yml`:

```bash
cd dev
docker-compose up -d
```

## Configuration

### Environment Variables

Set these environment variables before starting the server:

```bash
# Required: Actual Budget server connection
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"

# Optional: For end-to-end encrypted budgets
export ACTUAL_BUDGET_PASSWORD="your-budget-password"

# Optional: For bearer authentication (recommended for production)
export BEARER_TOKEN="your-secure-token"
```

### Server Arguments

- `--sse` - Enable SSE transport mode (required for Poke MCP HTTP connections)
- `--enable-write` - Enable write-access tools (create, update, delete operations)
- `--enable-bearer` - Enable bearer token authentication
- `--port <number>` - Specify port (default: 3000)

## Connecting with Poke MCP

### Using Poke MCP CLI

```bash
# Connect to the server
poke-mcp connect http://localhost:3000/mcp

# Or with bearer token
poke-mcp connect http://localhost:3000/mcp --token "your-bearer-token"
```

### Using Poke MCP UI

1. Open Poke MCP
2. Navigate to server configuration
3. Add a new server with:
   - **URL**: `http://localhost:3000/mcp`
   - **Transport**: HTTP/SSE
   - **Authentication** (if using bearer token): Bearer Token
   - **Token**: Your bearer token value

## Available Endpoints

When running in SSE mode, the server exposes:

- `POST /mcp` - Main MCP endpoint (stateless HTTP transport)
- `GET /sse` - Server-Sent Events endpoint (for SSE transport)
- `POST /messages` - Alternative messages endpoint (stateless)

All endpoints support:
- Standard MCP protocol methods (tools, resources, prompts)
- Custom `actual.*` JSON-RPC methods (direct API access)

## Security Considerations

### Development (Local)

For local development, you can run without bearer authentication:

```bash
node build/index.js --sse --enable-write
```

### Production

**Always use bearer authentication** when exposing the server:

```bash
node build/index.js --sse --enable-write --enable-bearer
export BEARER_TOKEN="your-secure-random-token"
```

This ensures only authorized clients can access your budget data.

## Testing the Connection

### Test Server Resources

```bash
node build/index.js --test-resources
```

This will verify the server can connect to your Actual Budget data and list available accounts.

### Test Custom Methods

```bash
node build/index.js --test-custom
```

This will test the custom `actual.*` JSON-RPC methods.

### From Poke MCP

Once connected, you can:

1. **List available tools:**
   - Query: `list_tools` or use the Poke MCP UI

2. **List available resources:**
   - Query: `list_resources` or use the Poke MCP UI

3. **Call a tool:**
   - Example: `get-accounts` to retrieve all accounts

## Example Queries via Poke MCP

Once connected, you can interact with your budget data:

```
# Get all accounts
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get-accounts"}}

# Get transactions
{"jsonrpc": "2.0", "method": "tools/call", "params": {
  "name": "get-transactions",
  "arguments": {
    "accountId": "account-id-here",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}}

# Get monthly summary
{"jsonrpc": "2.0", "method": "tools/call", "params": {
  "name": "monthly-summary",
  "arguments": {
    "month": "2024-01"
  }
}}
```

## Troubleshooting

### Connection Issues

**Problem**: Poke MCP can't connect to the server

**Solutions**:
- Verify the server is running: `curl http://localhost:3000/mcp`
- Check the port matches your configuration
- Ensure `--sse` flag is used when starting the server
- Check firewall settings if connecting remotely

### Authentication Errors

**Problem**: 401 Unauthorized errors

**Solutions**:
- Verify `BEARER_TOKEN` environment variable is set
- Ensure `--enable-bearer` flag is used
- Check that the token in Poke MCP matches the server's `BEARER_TOKEN`

### Actual Budget Connection Issues

**Problem**: Server can't connect to Actual Budget

**Solutions**:
- Verify `ACTUAL_SERVER_URL` is correct
- Check `ACTUAL_PASSWORD` is valid
- Ensure `ACTUAL_BUDGET_SYNC_ID` matches an existing budget
- Test connection: `node build/index.js --test-resources`

## Advanced Configuration

### Custom Port

```bash
node build/index.js --sse --enable-write --port 8080
```

Then connect Poke MCP to `http://localhost:8080/mcp`

### HTTPS/SSL

For production deployments, use a reverse proxy (nginx, Caddy) with SSL termination:

```nginx
location /mcp {
    proxy_pass http://localhost:3000/mcp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Performance Tips

1. **Connection Pooling**: The server creates a new connection for each request. For high-traffic scenarios, consider connection pooling.

2. **Caching**: The server doesn't cache data. For frequently accessed data, implement caching at the Poke MCP level or use a reverse proxy cache.

3. **Rate Limiting**: Consider implementing rate limiting for production deployments to prevent abuse.

## Next Steps

- Review the [MCP_CONFIG_GUIDE.md](./MCP_CONFIG_GUIDE.md) for general MCP configuration
- Check [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current project status
- See the main [README.md](../README.md) for full feature list

