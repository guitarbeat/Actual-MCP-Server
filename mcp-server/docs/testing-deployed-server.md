# Testing Deployed Server with MCP Inspector

Guide for testing your Easy Panel deployed MCP server.

## Your Deployment Info

- **Domain:** `personal-actualbudget-mcp.imklj5.easypanel.host`
- **Port:** 3000
- **Full URL:** `https://personal-actualbudget-mcp.imklj5.easypanel.host`
- **Transport:** HTTP/SSE (using `--sse` flag)

## Quick Test

### 1. Test Basic Connectivity

```bash
curl https://personal-actualbudget-mcp.imklj5.easypanel.host/
```

Should return HTML with server information.

### 2. Test MCP Endpoint

```bash
curl https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp \
  -H "Authorization: Bearer 9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Should return a JSON-RPC response with available tools.

### 3. Use Test Script

```bash
BEARER_TOKEN=9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b \
  ./scripts/test-deployed-server.sh
```

## Using MCP Inspector

### Option 1: Direct HTTP Testing

The MCP Inspector primarily works with stdio transport. For HTTP/SSE transport, test directly:

```bash
# List tools
curl https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Call a tool
curl https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"get-accounts",
      "arguments":{}
    }
  }'
```

### Option 2: Local Proxy (Advanced)

Create a local proxy that forwards to your deployed server:

```typescript
// proxy-server.ts
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.all('/mcp', async (req, res) => {
  const response = await fetch('https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp', {
    method: req.method,
    headers: {
      ...req.headers,
      'Authorization': `Bearer ${process.env.BEARER_TOKEN}`,
    },
    body: JSON.stringify(req.body),
  });
  
  const data = await response.json();
  res.json(data);
});

app.listen(6277, () => {
  console.log('Proxy running on http://localhost:6277');
});
```

Then use MCP Inspector with the local proxy.

## Common Issues

### Server Not Responding

**Check Easy Panel logs for:**
- Build errors
- Runtime errors
- Port binding issues

**Verify:**
- Port 3000 is exposed in Easy Panel
- Domain is configured correctly
- Server process is running

### Authentication Errors

**401 Unauthorized:**
- Bearer token is required
- Verify `BEARER_TOKEN` environment variable is set
- Check token matches exactly (no extra spaces)

**Missing Authorization header:**
- Include `Authorization: Bearer <token>` header
- Token must match `BEARER_TOKEN` env var

### Connection Errors

**Can't connect to Actual Budget:**
- Server needs to reach `https://actual.alw.lol`
- Check network/firewall rules
- Verify credentials are correct

**503 Service Unavailable:**
- Server may be starting up
- Transport may not be ready
- Check initialization logs

## Debugging Steps

1. **Check Easy Panel Logs**
   - Look for startup messages
   - Check for initialization errors
   - Verify environment variables are loaded

2. **Test Connectivity**
   ```bash
   curl https://personal-actualbudget-mcp.imklj5.easypanel.host/
   ```

3. **Test MCP Endpoint**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
        https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp
   ```

4. **Check Server Health**
   - Root endpoint should return HTML
   - `/mcp` endpoint should accept JSON-RPC
   - SSE endpoint should be accessible

## Expected Responses

### Root Endpoint (`/`)
```html
<!DOCTYPE html>
<html>
  <head><title>Actual Budget MCP Server</title></head>
  <body>
    <h1>💰 Actual Budget MCP Server</h1>
    <p class="status">✓ Server is running</p>
    ...
  </body>
</html>
```

### MCP Endpoint (`/mcp`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get-accounts",
        "description": "...",
        "inputSchema": {...}
      },
      ...
    ]
  }
}
```

## Next Steps

If the server is accessible but not working correctly:

1. Check Easy Panel logs for specific errors
2. Verify environment variables are set correctly
3. Test Actual Budget connection from the container
4. Verify port configuration matches Easy Panel settings
