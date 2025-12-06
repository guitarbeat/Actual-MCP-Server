# Easy Panel Debugging Guide

Quick reference for debugging Easy Panel deployment issues.

## Common Configuration Issues

### Issue: Wrong Version Field

**Symptom:** Build fails or uses wrong Node.js version

**Problem:** The "Version" field in Easy Panel's Nixpacks config should be the **Node.js major version**, not a Nixpacks version.

**Solution:**

- Set **Version** to: `22` (Node.js LTS version)
- ❌ **Wrong:** `1.34.1` (this looks like a Nixpacks version)
- ✅ **Correct:** `20` or `22`

**Why:** Your `package.json` specifies `"node": ">=22.0.0"`, so use Node.js version `22`.

### Issue: Build Fails

**Check Build Logs For:**

- `Cannot find module` → Dependencies not installed
- `TypeScript compilation errors` → Code issues
- `npm ci failed` → Dependency lock file issues
- `Node version mismatch` → Wrong Node.js version

**Solutions:**

1. Verify **Version** field is `20` or `22`
2. Check **Install Command** is `npm ci`
3. Check **Build Command** is `npm run build`
4. Review build logs in Easy Panel for specific errors

### Issue: Server Won't Start

**Check Runtime Logs For:**

- `Failed to initialize Actual Budget API` → Connection/credentials issue
- `Cannot find module 'build/index.js'` → Build didn't complete
- `Port 3000 already in use` → Port conflict
- `Missing environment variables` → Config issue

**Solutions:**

1. Verify build completed successfully
2. Check all environment variables are set (no quotes, no spaces)
3. Verify **Start Command** is: `node build/index.js --sse --enable-write`
4. Check Actual Budget server is accessible

## Correct Easy Panel Configuration

### Nixpacks Settings

```
Version: 22                    ← Node.js major version (NOT 1.34.1)
Install Command: npm ci
Build Command: npm run build
Start Command: node build/index.js --sse --enable-write
Nix Packages: (empty)
APT Packages: (empty)
```

### Environment Variables

```bash
ACTUAL_SERVER_URL=https://actual.alw.lol
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
BEARER_TOKEN=your-token
PORT=3000
```

**Important:**

- No quotes around values
- No trailing spaces
- Use exact variable names (case-sensitive)

## Debugging Checklist

### Pre-Deployment

- [ ] **Version field** set to `22` (not `1.34.1`)
- [ ] **Install Command** is `npm ci`
- [ ] **Build Command** is `npm run build`
- [ ] **Start Command** is `node build/index.js --sse --enable-write`
- [ ] All environment variables set correctly

### Post-Deployment

- [ ] Build logs show successful compilation
- [ ] Runtime logs show "✓ Budget loaded" message
- [ ] Service status is "Running" (not "Stopped" or "Error")
- [ ] Port 3000 is exposed and accessible
- [ ] Root endpoint (`/`) returns HTML page
- [ ] MCP endpoint (`/mcp`) accepts requests with bearer token

## Quick Tests

### Test 1: Check Build Artifacts

```bash
# In Easy Panel terminal or SSH
ls -la build/
# Should show: index.js, index.d.ts, and other compiled files
```

### Test 2: Test Server Endpoint

```bash
curl https://your-mcp-domain/
# Should return HTML with "Actual Budget MCP Server"
```

### Test 3: Test MCP Endpoint

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     https://your-mcp-domain/mcp
# Should return JSON with tools list
```

### Test 4: Check Logs

In Easy Panel → Service → Logs:

- Look for initialization errors
- Check for "Failed to initialize" messages
- Verify environment variables are loaded

## Common Error Messages

### "Cannot find module 'build/index.js'"

**Cause:** Build didn't complete or build directory missing
**Fix:** Check build logs, verify build command runs successfully

### "Failed to initialize Actual Budget API"

**Cause:** Connection or authentication issue with Actual Budget server
**Fix:**

- Verify `ACTUAL_SERVER_URL` is correct
- Check credentials are correct
- Test Actual Budget server: `curl https://actual.alw.lol/api/health`

### "Port 3000 already in use"

**Cause:** Another service using port 3000
**Fix:** Change `PORT` environment variable to different port (e.g., `3001`)

### "Database is out of sync with migrations"

**Cause:** Actual Budget server database issue (not MCP server)
**Fix:** Update Actual Budget server to latest version

## Version Field Explanation

The **Version** field in Easy Panel's Nixpacks configuration refers to the **runtime version** (Node.js in this case), not the Nixpacks version itself.

- ✅ **Correct:** `22` (Node.js major version)
- ❌ **Wrong:** `1.34.1` (this appears to be a Nixpacks version number)

Easy Panel/Nixpacks will automatically:

1. Use the version number to select the Node.js runtime
2. Install Node.js 22.x based on your version field
3. Run your install/build/start commands in that environment

## Getting More Help

If issues persist:

1. **Share Build Logs:** Full output from Easy Panel build phase
2. **Share Runtime Logs:** Full output from Easy Panel runtime phase
3. **Service Status:** Is it Running, Stopped, or Error?
4. **Configuration:** Version field value and all commands (sanitize sensitive data)
5. **Error Messages:** Specific error messages from logs

## Local Testing

Before deploying, test locally:

```bash
# Install dependencies
npm ci

# Build
npm run build

# Test with inspector
npm run inspector

# Test HTTP mode
node build/index.js --sse --enable-write
```

If it works locally but not in Easy Panel, the issue is likely:

- Version field configuration
- Environment variables
- Port configuration
- Build command differences
