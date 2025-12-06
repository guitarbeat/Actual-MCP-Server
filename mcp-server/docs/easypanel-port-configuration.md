# Easy Panel Port Configuration Guide

## Your Current Setup

### Actual Budget Server (`actualbudget`)
- **Internal Port:** 5006
- **External Domain:** `https://actual.alw.lol`
- **Easy Panel Routing:** Traefik routes `https://actual.alw.lol` → internal port 5006

### MCP Server (`actualbudget-mcp`)
- **Internal Port:** 3000
- **External Domain:** `personal-actualbudget-mcp.imklj5.easypanel.host`
- **Easy Panel Routing:** Traefik routes domain → internal port 3000

## How MCP Server Connects to Actual Budget

The MCP server uses `ACTUAL_SERVER_URL` environment variable to connect to Actual Budget.

### Option 1: Use External Domain (Recommended) ✅

**Environment Variable:**
```bash
ACTUAL_SERVER_URL=https://actual.alw.lol
```

**Pros:**
- ✅ Works from anywhere (internal or external)
- ✅ Uses HTTPS (secure)
- ✅ Easy Panel's Traefik handles routing
- ✅ No port needed in URL

**Cons:**
- Requires external DNS/domain resolution
- Goes through Traefik (slight overhead)

**This is what you currently have** - and it's correct!

### Option 2: Use Internal Service Name (If Same Project)

If both services are in the same Easy Panel project, you can use internal service name:

**Environment Variable:**
```bash
ACTUAL_SERVER_URL=http://personal_actualbudget:5006
```

**Pros:**
- ✅ Direct internal connection (faster)
- ✅ No external DNS needed
- ✅ Bypasses Traefik

**Cons:**
- ⚠️ Only works if services are in same project
- ⚠️ Uses HTTP (not HTTPS) - but internal is fine
- ⚠️ Must include port number

**Service Name Format:**
- Easy Panel service names use underscores: `projectName_serviceName`
- Your project: `personal`
- Your Actual Budget service: `actualbudget`
- Internal name: `personal_actualbudget`

## Which Should You Use?

### Use External Domain (`https://actual.alw.lol`) If:
- ✅ You want HTTPS security
- ✅ Services might be in different projects
- ✅ You want consistent configuration
- ✅ **This is recommended for production**

### Use Internal Service Name (`http://personal_actualbudget:5006`) If:
- ✅ Both services are in same Easy Panel project
- ✅ You want faster internal communication
- ✅ You're troubleshooting connectivity issues
- ✅ You don't need HTTPS for internal communication

## Current Configuration

Your current `ACTUAL_SERVER_URL=https://actual.alw.lol` is **correct** and should work.

**No port needed** because:
- HTTPS uses port 443 by default
- Easy Panel's Traefik handles routing
- The domain is configured to route to port 5006 internally

## Troubleshooting

### If MCP Server Can't Connect to Actual Budget

1. **Test external domain:**
   ```bash
   curl https://actual.alw.lol/api/health
   ```

2. **If external fails, try internal:**
   ```bash
   # From MCP server container (if you have shell access)
   curl http://personal_actualbudget:5006/api/health
   ```

3. **Check Easy Panel network:**
   - Verify both services are in same project
   - Check if internal networking is enabled
   - Verify service names match

### Port Configuration Summary

| Service | Internal Port | External Access | Environment Variable |
|---------|--------------|------------------|---------------------|
| Actual Budget | 5006 | `https://actual.alw.lol` | N/A (server config) |
| MCP Server | 3000 | `personal-actualbudget-mcp.imklj5.easypanel.host` | `PORT=3000` |

**For MCP Server → Actual Budget connection:**
- Use: `ACTUAL_SERVER_URL=https://actual.alw.lol` ✅ (no port)
- Or: `ACTUAL_SERVER_URL=http://personal_actualbudget:5006` (if internal)

## Recommendation

**Keep your current configuration:**
```bash
ACTUAL_SERVER_URL=https://actual.alw.lol
```

This is the correct setup. If you're having connectivity issues, the problem is likely:
1. Actual Budget server not running
2. Network/firewall blocking
3. Credentials incorrect
4. Service initialization failing

Check Easy Panel logs to see the actual error!
