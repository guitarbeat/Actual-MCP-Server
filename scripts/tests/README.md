# Test Scripts

This directory contains test scripts for the MCP server.

## Available Tests

- `test-connection-id-routing.js` - Tests connection ID routing functionality
- `test-mcp-server.sh` - Tests MCP server functionality
- `test-poke-curl.sh` - Tests Poke MCP client simulation using curl
- `test-poke-simulation.js` - Tests Poke MCP client simulation
- `test-sse-local.sh` - Tests SSE transport locally
- `test-sse.js` - Tests SSE transport functionality

## Usage

Most tests require environment variables:
- `SERVER_URL` - The MCP server URL (default: `http://localhost:3000`)
- `BEARER_TOKEN` - Bearer token for authentication (if enabled)

Example:
```bash
SERVER_URL="https://your-server.com" \
BEARER_TOKEN="your-token" \
node scripts/tests/test-sse.js
```

