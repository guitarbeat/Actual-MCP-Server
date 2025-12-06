# Easy Panel Debugging Guide

## Quick Setup: Custom Domain

### DNS (Namecheap)
1. Add A Record:
   - **Host:** `actual-mcp`
   - **Value:** `64.181.223.201`
   - **TTL:** Automatic

### Easy Panel
1. Go to `actualbudget-mcp` service → Domains
2. Add domain: `actual-mcp.alw.lol`
3. Port: 3000, HTTPS: Enabled
4. Wait for SSL certificate (few minutes)

---

## Debugging Failures

### Step 1: Check Easy Panel Logs

**Go to:** Easy Panel → `actualbudget-mcp` → Logs

**Look for these common errors:**

#### Build Phase Errors

```
❌ npm ci fails
   → Check Node.js version (needs >= 20.0.0)
   → Check package.json is valid
   → Check network connectivity

❌ npm run build fails
   → TypeScript compilation errors
   → Missing dependencies
   → Check build logs for specific errors
```

#### Runtime Phase Errors

```
❌ "Failed to initialize Actual Budget API"
   → Cannot connect to https://actual.alw.lol
   → Check ACTUAL_SERVER_URL is correct
   → Verify Actual Budget server is running
   → Check network/firewall

❌ "Cannot find module 'xxx'"
   → Dependencies not installed
   → Run 'npm ci' again
   → Check package.json

❌ "Port 3000 already in use"
   → Port conflict
   → Change PORT environment variable
   → Or stop conflicting service

❌ "Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not"
   → Missing ACTUAL_PASSWORD env var
   → Set it in Easy Panel

❌ "EADDRINUSE" or "Address already in use"
   → Port conflict
   → Change PORT env var

❌ "ECONNREFUSED" or "Connection refused"
   → Cannot connect to Actual Budget
   → Check ACTUAL_SERVER_URL
   → Verify Actual Budget is running
   → Check firewall rules
```

### Step 2: Run Debug Script

```bash
# Set your MCP server URL
export MCP_URL=https://personal-actualbudget-mcp.imklj5.easypanel.host
# or after custom domain setup:
export MCP_URL=https://actual-mcp.alw.lol

# Run debug script
./scripts/debug-easypanel.sh
```

### Step 3: Common Issues & Fixes

#### Issue: Server Won't Start

**Symptoms:**
- Service shows as "Stopped" or "Error" in Easy Panel
- Logs show initialization failure

**Fixes:**
1. Check environment variables are set correctly
2. Verify Actual Budget server is accessible
3. Check port is not in use
4. Review logs for specific error

#### Issue: Can't Connect to Actual Budget

**Symptoms:**
- "Failed to initialize Actual Budget API"
- Connection timeout errors

**Fixes:**
1. Test Actual Budget server:
   ```bash
   curl https://actual.alw.lol/api/health
   ```

2. Verify credentials:
   - `ACTUAL_SERVER_URL=https://actual.alw.lol`
   - `ACTUAL_PASSWORD` is correct
   - `ACTUAL_BUDGET_SYNC_ID` is correct

3. Check network:
   - MCP server can reach Actual Budget
   - Firewall allows outbound HTTPS

#### Issue: Port Not Accessible

**Symptoms:**
- Can't access server via domain
- 404 or connection refused

**Fixes:**
1. Verify port 3000 is exposed in Easy Panel
2. Check domain configuration
3. Verify `PORT=3000` env var is set
4. Check service is running

#### Issue: Build Fails

**Symptoms:**
- Build logs show errors
- Service never starts

**Fixes:**
1. Check Node.js version (needs >= 20.0.0)
2. Verify `package.json` is valid
3. Check for TypeScript errors
4. Review build logs for specifics

### Step 4: Verify Configuration

**Environment Variables Checklist:**
```bash
✅ ACTUAL_SERVER_URL=https://actual.alw.lol
✅ ACTUAL_PASSWORD=ninI0112@
✅ ACTUAL_BUDGET_SYNC_ID=7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35
✅ BEARER_TOKEN=9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b
✅ PORT=3000
```

**Service Configuration Checklist:**
```bash
✅ Install Command: npm ci
✅ Build Command: npm run build
✅ Start Command: node build/index.js --sse --enable-write
✅ Port: 3000 exposed
✅ Domain: Configured correctly
```

### Step 5: Test Endpoints

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

## What to Share for Help

If issues persist, share:

1. **Full build logs** (from Easy Panel)
2. **Full runtime logs** (from Easy Panel)
3. **Service status** (Running/Stopped/Error)
4. **Error messages** (exact text)
5. **Environment variables** (names only, not values)

## Quick Diagnostic Commands

```bash
# Test Actual Budget
curl https://actual.alw.lol/api/health

# Test MCP Server
curl https://your-mcp-domain/

# Test MCP Endpoint
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     https://your-mcp-domain/mcp

# Run debug script
./scripts/debug-easypanel.sh
```
