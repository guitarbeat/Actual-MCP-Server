# Cursor MCP Configuration

This directory contains the MCP (Model Context Protocol) server configuration for Cursor IDE.

## Configuration File

The `mcp.json` file configures the Actual Budget MCP server to work with Cursor using **Streamable HTTP transport**.

## Setup Instructions

1. **Start the MCP server with Streamable HTTP transport:**
   ```bash
   cd mcp-server
   npm start -- --sse --enable-write --enable-bearer
   ```
   
   The server will run on `http://localhost:3000/mcp`

2. **The MCP server is configured to:**
   - Use Streamable HTTP transport (modern MCP protocol)
   - Enable write operations (`--enable-write` flag)
   - Use Bearer token authentication (`--enable-bearer` flag)
   - Connect to your Actual Budget instance

3. **Restart Cursor** after creating/modifying this configuration.

## Configuration Details

The server uses:
- **Command**: `node` (Node.js runtime)
- **Script**: `build/index.js` (compiled TypeScript)
- **Flags**: `--enable-write` (allows write operations)
- **Environment**: All credentials are configured in the `env` section

## Alternative: Use Development Mode

If you prefer to use development mode (TypeScript directly), you can modify `mcp.json`:

```json
{
  "mcpServers": {
    "actual-budget": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/aaron/Downloads/actual-mcp-1/mcp-server/src/index.ts",
        "--enable-write"
      ],
      "env": {
        "ACTUAL_SERVER_URL": "https://actual.alw.lol",
        "ACTUAL_PASSWORD": "ninI0112@",
        "ACTUAL_BUDGET_SYNC_ID": "7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35",
        "BEARER_TOKEN": "9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b",
        "PORT": "3000"
      }
    }
  }
}
```

Note: Development mode requires `tsx` to be installed (`npm install -g tsx` or use `npx`).

## Troubleshooting

- **Server not connecting**: 
  - Make sure the server is running: `npm start -- --sse --enable-write --enable-bearer`
  - Check that the server is listening on port 3000
  - Verify the URL in `mcp.json` matches your server URL

- **DNS rebinding protection errors**: 
  - The server uses bearer authentication which should bypass DNS rebinding protection
  - If you see "Invalid Host" errors, try using `127.0.0.1` instead of `localhost` in the URL
  - Or ensure the server is started with `--enable-bearer` flag

- **Authentication errors**:
  - Verify the Bearer token in `mcp.json` matches the `BEARER_TOKEN` environment variable
  - Make sure the server is started with `--enable-bearer` flag

- **Environment variables**: Verify all credentials in the `.env` file are correct

