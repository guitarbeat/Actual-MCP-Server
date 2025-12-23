# MCP Inspector Usage Guide

The MCP Inspector is a powerful tool for debugging and testing Model Context Protocol servers. It provides a web-based UI to explore tools, resources, and prompts exposed by the server.

## Current Status
I have started the MCP Inspector in your local environment. 

*   **URL**: [http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=0f9bc44093ce80465a220ff2462da3c822e51747a5ecd32c2bf18d8eabe3faa8](http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=0f9bc44093ce80465a220ff2462da3c822e51747a5ecd32c2bf18d8eabe3faa8)
*   **Auth Token**: `0f9bc44093ce80465a220ff2462da3c822e51747a5ecd32c2bf18d8eabe3faa8`

## Connection Settings (.env)
The server uses these environment variables for its connection to Actual Budget:

| Variable | Description | Example |
|----------|-------------|---------|
| `ACTUAL_SERVER_URL` | Your Actual Budget server URL | `https://your-server.com` |
| `ACTUAL_PASSWORD` | Your server password | `your-secure-password` |
| `ACTUAL_BUDGET_SYNC_ID` | The Sync ID for your specific budget | `your-budget-id` |
| `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` | Optional: If your budget is encrypted | `optional-password` |
| `BEARER_TOKEN` | Optional: For SSE/HTTP authentication | `your-secret-token` |
| `PORT` | Optional: Port for SSE/HTTP (default: 3000) | `3000` |

> [!NOTE]
> Values like `AUTO_SYNC_INTERVAL_MINUTES`, `ENABLE_BUDGET_MANAGEMENT`, etc., are also available for advanced configuration.

## Tool Validation
The Inspector's **Tools** tab serves as the definitive source for verifying your tools. You can:
- **Verify Availability**: Ensure all expected tools (from `src/tools`) are correctly registered and visible.
- **Check Schemas**: Expand each tool to verify that the input arguments and descriptions match your expectations.
- **Test Logic**: Use the **Run** button to execute tools and verify they return the correct financial data from Actual Budget.

## Running with Real Credentials
If you want to run the inspector with your actual credentials, you can run this command in the `mcp-server` directory:

```bash
# Set your environment variables first
export ACTUAL_SERVER_URL="your-url"
export ACTUAL_PASSWORD="your-password"
export ACTUAL_BUDGET_SYNC_ID="your-sync-id"

# Run the inspector
npx @modelcontextprotocol/inspector tsx src/index.ts
```

## Production & Deployment
If you need to build the project for production or deploy it:

### Local Production Build
```bash
npm run build
node build/index.js --sse --enable-write
```

### Deployment (Easy Panel)
The project supports deployment via **Nixpacks** (recommended) or **Dockerfile**. 
- Ensure your environment variables are set in the deployment platform.
- The server requires **Node.js 22**.

> [!IMPORTANT]
> Change `your-url`, `your-password`, and `your-sync-id` to your actual values.
