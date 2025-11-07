# Local Deployment Guide for Actual MCP Server

## Quick Start

### Option 1: Direct Node.js (Recommended for Cursor MCP)

The MCP configuration in `~/.cursor/mcp.json` is already set up to use the built server directly via stdio.

1. **Configure environment variables** in `~/.cursor/mcp.json`:
   - Replace `YOUR_ACTUAL_SERVER_URL` with your Actual server URL
   - Replace `YOUR_ACTUAL_PASSWORD` with your Actual password
   - Replace `YOUR_BUDGET_SYNC_ID` with your budget sync ID (optional but recommended)

2. **Restart Cursor** to load the new MCP server configuration

3. **Test the connection** - The server will start automatically when Cursor tries to use it

### Option 2: Docker Deployment (SSE/HTTP Mode)

If you want to run the server as an HTTP endpoint:

1. **Create `.env` file** from `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

   Or use the deployment script:
   ```bash
   ./deploy-local.sh
   docker run -d --name actual-mcp-server \
     -p 3000:3000 \
     --env-file .env \
     actual-mcp:local
   ```

3. **Access the server** at `http://localhost:3000`

### Option 3: Nixpacks Build Only

To build a Docker image using nixpacks:

```bash
nixpacks build . -n actual-mcp:local
```

## Environment Variables

Required (if using remote Actual server):
- `ACTUAL_SERVER_URL` - Your Actual Budget server URL
- `ACTUAL_PASSWORD` - Your Actual Budget password

Optional:
- `ACTUAL_BUDGET_SYNC_ID` - Auto-load budget on startup (recommended)
- `AUTO_SYNC_INTERVAL_MINUTES` - Auto-sync interval (default: 5)
- `BEARER_TOKEN` - Required if using `--enable-bearer` flag
- `ACTUAL_DATA_DIR` - Local data directory (if not using remote server)

## Testing

Test the server connection:
```bash
node build/index.js --test-resources
```

This will verify connectivity and list your accounts.

## Troubleshooting

1. **Server won't start**: Check that environment variables are set correctly
2. **Connection errors**: Verify your Actual server URL and password
3. **Build errors**: Run `npm install` and `npm run build` again

