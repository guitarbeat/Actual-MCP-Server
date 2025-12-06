# Easy Panel Troubleshooting Guide

## Your Current Configuration

### Environment Variables ✅
```bash
ACTUAL_SERVER_URL=https://actual.alw.lol
ACTUAL_PASSWORD=ninI0112@
ACTUAL_BUDGET_SYNC_ID=7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35
BEARER_TOKEN=9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b
PORT=3000
```

### Easy Panel Settings
- **Version:** 1.34.1
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Start Command:** `node build/index.js --sse --enable-write`
- **Remote Server IP:** 64.181.223.201

## Common Issues & Solutions

### 1. Server Not Starting

#### Check Logs
In Easy Panel, check the deployment logs for errors:

**Common errors:**
- `Failed to initialize Actual Budget API` → Connection issue
- `Port already in use` → Port conflict
- `Missing environment variables` → Env vars not set correctly

#### Verify Environment Variables
1. Go to Easy Panel → Your Project → Environment Variables
2. Ensure all variables are set exactly as shown above
3. Check for:
   - Extra spaces
   - Missing quotes (should NOT have quotes)
   - Typos in variable names

#### Test Connection
The server needs to connect to `https://actual.alw.lol`. Verify:
- The Actual Budget server is accessible from Easy Panel's network
- Firewall allows outbound HTTPS connections
- Credentials are correct

### 2. Port Configuration

The server listens on `0.0.0.0:3000` by default, which is correct for containers.

**If Easy Panel uses a different port:**
- Set `PORT` environment variable to match Easy Panel's assigned port
- Or configure Easy Panel to use port 3000

**Check Easy Panel port mapping:**
- Look for "Port" or "Expose Port" settings
- Ensure it matches your `PORT` environment variable (or default 3000)

### 3. Network Connectivity

#### Outbound Connections
The server needs to connect to:
- `https://actual.alw.lol` (Actual Budget API)

**Test from Easy Panel container:**
```bash
# If you have shell access
curl https://actual.alw.lol/api/health
```

#### Inbound Connections
For MCP clients to connect:
- Ensure Easy Panel exposes the port (usually automatic)
- Check firewall rules allow inbound connections
- Verify HTTPS/domain is configured if using custom domain

### 4. Build Issues

#### Check Build Logs
Look for errors during `npm run build`:

**Common issues:**
- TypeScript compilation errors
- Missing dependencies
- Node.js version mismatch (requires Node >= 20.0.0)

#### Verify Node.js Version
Easy Panel/Nixpacks should auto-detect, but verify:
- Check build logs for Node.js version
- Should be Node 20.x or higher
- If wrong, specify in `nixpacks.toml` or Easy Panel settings

### 5. Runtime Errors

#### Server Crashes on Startup
Check logs for:
- `Error: Cannot find module` → Missing dependency
- `EADDRINUSE` → Port conflict
- `ECONNREFUSED` → Can't connect to Actual Budget server

#### Server Starts But No Response
- Check if port is exposed correctly
- Verify firewall rules
- Test with curl: `curl http://your-domain:3000/`

### 6. Bearer Token Authentication

Since you're using `--enable-bearer`, ensure:
- `BEARER_TOKEN` is set correctly
- Clients include `Authorization: Bearer <token>` header
- Token matches exactly (no extra spaces)

**Test authentication:**
```bash
curl https://your-domain/mcp \
  -H "Authorization: Bearer 9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Step-by-Step Debugging

### Step 1: Check Deployment Logs
1. Go to Easy Panel → Your Project → Logs
2. Look for:
   - Build errors
   - Startup errors
   - Runtime errors
3. Copy any error messages

### Step 2: Verify Environment Variables
1. Go to Environment Variables section
2. Verify each variable:
   ```
   ACTUAL_SERVER_URL=https://actual.alw.lol
   ACTUAL_PASSWORD=ninI0112@
   ACTUAL_BUDGET_SYNC_ID=7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35
   BEARER_TOKEN=9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b
   PORT=3000
   ```
3. Ensure no quotes around values
4. Ensure no trailing spaces

### Step 3: Test Actual Budget Connection
The server must connect to `https://actual.alw.lol`:

**From your local machine:**
```bash
curl https://actual.alw.lol/api/health
```

**If this fails:**
- Check Actual Budget server status
- Verify credentials
- Check firewall rules

### Step 4: Verify Port Configuration
1. Check Easy Panel port settings
2. Ensure port 3000 is exposed (or match your PORT env var)
3. Verify no port conflicts

### Step 5: Test Server Endpoints

**Health check:**
```bash
curl https://your-easypanel-domain.com/
```

Should return HTML with server info.

**MCP endpoint (with auth):**
```bash
curl https://your-easypanel-domain.com/mcp \
  -H "Authorization: Bearer 9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Quick Fixes

### Fix 1: Add Startup Logging
Add logging to verify environment variables are loaded:

The server already logs initialization, but you can add more:

```typescript
// Already in index.ts - will show in logs
console.error('Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.');
```

### Fix 2: Verify Start Command
Ensure start command is exactly:
```bash
node build/index.js --sse --enable-write
```

**Common mistakes:**
- Missing `--sse` flag (needed for HTTP transport)
- Missing `--enable-write` (if you need write operations)
- Wrong path to `build/index.js`

### Fix 3: Check File Permissions
The build script sets executable permissions, but verify:
```bash
chmod +x build/index.js
```

## Advanced Debugging

### Enable Debug Logging
Add to environment variables:
```bash
DEBUG_PERFORMANCE=true
NODE_ENV=development
```

### Check Container Resources
In Easy Panel, verify:
- Sufficient memory allocated
- CPU resources available
- Disk space available

### Network Debugging
If you have shell access to the container:
```bash
# Test outbound connection
curl -v https://actual.alw.lol/api/health

# Check listening ports
netstat -tuln | grep 3000

# Check process
ps aux | grep node
```

## Still Having Issues?

### Collect This Information:
1. **Error messages** from Easy Panel logs
2. **Build logs** (full output)
3. **Runtime logs** (after deployment)
4. **Port configuration** (what port Easy Panel assigned)
5. **Network test results** (can container reach actual.alw.lol?)

### Common Error Patterns:

**"Cannot find module"**
→ Dependencies not installed correctly
→ Solution: Check `npm ci` completed successfully

**"Port 3000 already in use"**
→ Port conflict
→ Solution: Change PORT env var or Easy Panel port mapping

**"Failed to initialize Actual Budget API"**
→ Can't connect to actual.alw.lol
→ Solution: Check network/firewall, verify credentials

**"EADDRINUSE"**
→ Port already bound
→ Solution: Check for other processes, change port

## Verification Checklist

- [ ] Environment variables set correctly (no quotes, no spaces)
- [ ] Build completes successfully (`npm run build`)
- [ ] Server starts without errors
- [ ] Port 3000 is exposed and accessible
- [ ] Can connect to `https://actual.alw.lol` from container
- [ ] Bearer token is set correctly
- [ ] Start command includes `--sse --enable-write`
- [ ] Node.js version >= 20.0.0

## Next Steps

1. Check Easy Panel deployment logs
2. Verify environment variables
3. Test Actual Budget connection
4. Verify port configuration
5. Test server endpoints

If issues persist, share:
- Specific error messages from logs
- What happens when you try to access the server
- Whether the build succeeds
