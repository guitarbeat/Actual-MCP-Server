# Easy Panel Deployment Guide

Complete guide for deploying and troubleshooting the Actual Budget MCP Server on Easy Panel.

## Quick Setup

### 1. Environment Variables

Set these in Easy Panel → `actualbudget-mcp` → Environment Variables:

```bash
ACTUAL_SERVER_URL=https://actual.alw.lol
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
BEARER_TOKEN=your-bearer-token
PORT=3000
```

**Important:** No quotes around values, no trailing spaces.

### 2. Build Configuration

- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Start Command:** `node build/index.js --sse --enable-write`

### 3. Port Configuration

- **MCP Server Port:** 3000 (set via `PORT=3000` env var)
- **Actual Budget Port:** 5006 (internal, routed via Traefik)
- **Connection:** Use `https://actual.alw.lol` (no port needed - Traefik handles routing)

## Custom Domain Setup

### DNS (Namecheap)

1. Add A Record:
   - **Host:** `actual-mcp`
   - **Type:** A Record
   - **Value:** `64.181.223.201` (your Easy Panel server IP)
   - **TTL:** Automatic

### Easy Panel

1. Go to `actualbudget-mcp` service → Domains
2. Add domain: `actual-mcp.alw.lol`
3. Settings: Port 3000, HTTPS Enabled, Path `/`
4. Wait for SSL certificate (few minutes)

**Test:** `curl https://actual-mcp.alw.lol/`

## Common Issues & Solutions

### Issue: Server Won't Start

**Symptoms:** Service shows "Stopped" or "Error" in Easy Panel

**Check Logs For:**

- `Failed to initialize Actual Budget API` → Database migration issue (see below)
- `Cannot find module` → Dependencies not installed, check build logs
- `Port 3000 already in use` → Port conflict, change PORT env var
- `Missing environment variables` → Verify all env vars are set correctly

**Fixes:**

1. Check Easy Panel logs for specific errors
2. Verify environment variables (no quotes, correct names)
3. Ensure build completed successfully
4. Verify Actual Budget server is running

### Issue: Database Migration Mismatch

**Error:** `Database is out of sync with migrations` or `out-of-sync-migrations`

**Cause:** Actual Budget server database has missing/corrupted migrations

**Solution:**

1. **Update Actual Budget** (recommended):
   - In Easy Panel, update `actualbudget` service
   - Use latest image: `ghcr.io/actualbudget/actual:latest`
   - Restart service - migrations will auto-apply

2. **Reset Database** (⚠️ data loss):
   - Stop Actual Budget service
   - Delete `/data` volume
   - Restart - creates fresh database

**Note:** This is an Actual Budget server issue, not MCP server. Fix Actual Budget first.

### Issue: Can't Connect to Actual Budget

**Symptoms:** `Failed to initialize Actual Budget API` or connection timeout

**Fixes:**

1. Test Actual Budget: `curl https://actual.alw.lol/api/health`
2. Verify credentials are correct
3. Check network/firewall allows outbound HTTPS
4. Use internal service name if same project: `http://personal_actualbudget:5006`

### Issue: Port Not Accessible

**Symptoms:** Can't access server via domain, 404 errors

**Fixes:**

1. Verify port 3000 is exposed in Easy Panel domain config
2. Check `PORT=3000` env var is set
3. Verify domain points to correct service
4. Check service is running

### Issue: Build Fails

**Symptoms:** Build logs show errors, service never starts

**Fixes:**

1. Check Node.js version (needs >= 22.0.0)
2. Verify `package.json` is valid
3. Check for TypeScript compilation errors
4. Review build logs for specifics

## Testing & Debugging

### Test Server Connectivity

```bash
# Test root endpoint
curl https://your-mcp-domain/

# Test MCP endpoint
curl https://your-mcp-domain/mcp \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Run Debug Script

```bash
export MCP_URL=https://your-mcp-domain
export BEARER_TOKEN=your-token
./scripts/debug-easypanel.sh
```

### Check Logs

**Easy Panel Logs:**

- Go to service → Logs tab
- Look for initialization errors
- Check build phase for compilation errors
- Check runtime phase for connection errors

**Common Error Patterns:**

- `Failed to initialize Actual Budget API` → Database/connection issue
- `Cannot find module` → Build/dependency issue
- `Port already in use` → Port conflict
- `Missing environment variables` → Config issue

## Verification Checklist

- [ ] All environment variables set correctly (no quotes, no spaces)
- [ ] Build completes successfully (`npm run build`)
- [ ] Service shows as "Running" in Easy Panel
- [ ] Port 3000 is exposed and accessible
- [ ] Domain configured correctly (if using custom domain)
- [ ] Actual Budget server is running and accessible
- [ ] Can connect to `https://actual.alw.lol` from MCP server
- [ ] Bearer token matches environment variable

## Expected Behavior

**When Working:**

- Root endpoint (`/`) returns HTML with "Actual Budget MCP Server" page
- MCP endpoint (`/mcp`) accepts JSON-RPC requests with bearer auth
- Server logs show "✓ Budget loaded" message
- No initialization errors in logs

## Getting Help

If issues persist, share:

1. **Full build logs** from Easy Panel
2. **Full runtime logs** from Easy Panel
3. **Service status** (Running/Stopped/Error)
4. **Specific error messages**
5. **Environment variable names** (not values)

## Quick Reference

**Environment Variables:**

```bash
ACTUAL_SERVER_URL=https://actual.alw.lol  # No port needed
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
BEARER_TOKEN=your-token
PORT=3000
```

**Commands:**

```bash
npm ci              # Install dependencies
npm run build       # Build server
npm run inspector   # Test locally with inspector
```

**Test Commands:**

```bash
curl https://actual.alw.lol/api/health                    # Test Actual Budget
curl https://your-mcp-domain/                            # Test MCP server
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     https://your-mcp-domain/mcp                         # Test MCP endpoint
```
