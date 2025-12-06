# Easy Panel Deployment Issues - Diagnosis

## Current Status

**Domain:** `personal-actualbudget-mcp.imklj5.easypanel.host`  
**Expected Port:** 3000  
**Status:** ❌ Server not responding correctly

### Test Results

1. **Root endpoint (`/`):**
   - Returns: Generic "Not Found" page (404)
   - Expected: Actual Budget MCP Server HTML page
   - **Issue:** Service may not be running or routing is incorrect

2. **MCP endpoint (`/mcp`):**
   - Returns: `{"message":"Route POST:/api/errors/not-started not found","error":"Not Found","statusCode":404}`
   - **Issue:** Request is being routed incorrectly or service isn't started

## Possible Issues

### 1. Service Not Running

**Check Easy Panel logs for:**
- Build errors during `npm ci` or `npm run build`
- Runtime errors when starting `node build/index.js --sse --enable-write`
- Port binding errors
- Environment variable errors

**Common errors to look for:**
```
Failed to initialize Actual Budget API
Error: Cannot find module
Port 3000 already in use
Missing environment variables
```

### 2. Port Configuration Mismatch

**Your Easy Panel config shows:**
- Domain port: 3000 ✅
- Internal protocol: http ✅
- But the service might be listening on a different port

**Check:**
- Is `PORT=3000` environment variable actually set?
- Does Easy Panel route port 3000 correctly?
- Is there a port conflict?

### 3. Path Routing Issue

The error suggests requests might be hitting a different service or route.

**Verify in Easy Panel:**
- Domain configuration points to correct service (`actualbudget-mcp`)
- Port mapping is correct (3000)
- Path is `/` (not `/api` or something else)

### 4. Service Startup Failure

The server might be crashing on startup.

**Check logs for:**
- Initialization errors
- Connection failures to `https://actual.alw.lol`
- Missing dependencies
- TypeScript/build errors

## Diagnostic Steps

### Step 1: Check Easy Panel Logs

1. Go to Easy Panel → Your Project → `actualbudget-mcp` service
2. Click on "Logs" tab
3. Look for:
   - Build phase errors
   - Startup errors
   - Runtime errors

**What to look for:**
```
> actual-mcp@1.2.0 build
> tsc -p tsconfig.build.json ...
[Any TypeScript errors?]

> node build/index.js --sse --enable-write
[Any startup errors?]
[Any connection errors?]
```

### Step 2: Verify Environment Variables

In Easy Panel → Environment Variables, verify:

```
ACTUAL_SERVER_URL=https://actual.alw.lol
ACTUAL_PASSWORD=ninI0112@
ACTUAL_BUDGET_SYNC_ID=7a78ae61-a6ee-4ddb-9c3a-c16a0af22d35
BEARER_TOKEN=9d7ed444f28745aa225d7ab219c00b1500414949121412002b2d34ad7f1bc97b
PORT=3000
```

**Common mistakes:**
- Extra spaces
- Quotes around values (should NOT have quotes)
- Typos in variable names
- Missing variables

### Step 3: Check Service Status

In Easy Panel:
1. Verify service status (Running/Stopped/Error)
2. Check resource usage (CPU/Memory)
3. Verify deployment succeeded

### Step 4: Test Build Locally

To verify the build works:

```bash
cd mcp-server
npm ci
npm run build
node build/index.js --sse --enable-write
```

Should start without errors.

### Step 5: Verify Actual Budget Connection

The server needs to connect to `https://actual.alw.lol`. Test:

```bash
curl https://actual.alw.lol/api/health
```

If this fails, the server won't initialize.

## Quick Fixes

### Fix 1: Add Startup Logging

The server already logs initialization, but you can add more verbose logging by setting:

```bash
DEBUG_PERFORMANCE=true
NODE_ENV=development
```

### Fix 2: Verify Start Command

Ensure the start command in Easy Panel is exactly:

```
node build/index.js --sse --enable-write
```

**Common mistakes:**
- Missing `--sse` flag
- Wrong path to `build/index.js`
- Extra spaces or quotes

### Fix 3: Check Port Binding

The server listens on `0.0.0.0:3000` by default. Verify:
- `PORT` environment variable is set to `3000`
- Easy Panel routes port 3000 correctly
- No port conflicts

### Fix 4: Verify Domain Configuration

In Easy Panel, check:
- Domain `personal-actualbudget-mcp.imklj5.easypanel.host` points to `actualbudget-mcp` service
- Port is 3000
- Path is `/`
- HTTPS is enabled

## What to Share for Further Help

If issues persist, share:

1. **Build logs** (from Easy Panel)
   - Full output of `npm ci` and `npm run build`

2. **Runtime logs** (from Easy Panel)
   - Full output after `node build/index.js --sse --enable-write` starts

3. **Service status**
   - Is the service showing as "Running"?
   - Any error indicators?

4. **Environment variables** (sanitized)
   - Confirm all are set (without showing values)

5. **Domain/Port configuration**
   - Screenshot or confirmation of Easy Panel settings

## Expected Behavior

When working correctly, you should see:

1. **Root endpoint:**
   ```bash
   curl https://personal-actualbudget-mcp.imklj5.easypanel.host/
   ```
   Should return HTML with "Actual Budget MCP Server" page

2. **MCP endpoint:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
        https://personal-actualbudget-mcp.imklj5.easypanel.host/mcp
   ```
   Should return JSON-RPC response with tools list

## Next Steps

1. **Check Easy Panel logs** - This will show the actual error
2. **Verify service is running** - Check status in Easy Panel
3. **Test build locally** - Ensure code builds correctly
4. **Verify environment variables** - Ensure all are set correctly
5. **Check Actual Budget connection** - Ensure server can reach actual.alw.lol

The logs will tell us exactly what's wrong!
