# Easy Panel Deployment Guide

Guide for deploying the Actual Budget MCP Server on Easy Panel using Nixpacks.

## Environment Variables

### Important: VITE_ Prefix Issue

**⚠️ Environment variables prefixed with `VITE_` are NOT available at runtime in Node.js applications.**

The `VITE_` prefix is specifically for Vite (frontend build tool) and these variables are:
- Only available during build time
- Stripped out before runtime
- Not accessible via `process.env` in Node.js

### Solution

**Remove the `VITE_` prefix** from environment variables that need to be accessed at runtime.

**Example:**
```bash
# ❌ Wrong - Won't work at runtime
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=...

# ✅ Correct - Will work at runtime
SUPABASE_URL=https://...
SUPABASE_PUBLISHABLE_KEY=...
```

## Required Environment Variables

For the Actual Budget MCP Server, set these in Easy Panel:

### Required
```bash
ACTUAL_SERVER_URL=https://your-actual-server.com
ACTUAL_PASSWORD=your-password
ACTUAL_BUDGET_SYNC_ID=your-budget-id
```

### Optional
```bash
BEARER_TOKEN=your-bearer-token  # Required if using --enable-bearer
PORT=3000                        # Default: 3000
DEBUG_PERFORMANCE=true           # Enable performance logging
```

## Easy Panel Configuration

### Version
```
1.34.1
```

### Install Command
```bash
npm ci
```

### Build Command
```bash
npm run build
```

### Start Command
```bash
node build/index.js --sse --enable-write
```

### Environment Variables Setup

1. **Go to your Easy Panel project settings**
2. **Navigate to "Environment Variables"**
3. **Add each variable WITHOUT the `VITE_` prefix:**

   ```
   ACTUAL_SERVER_URL=https://your-server.com
   ACTUAL_PASSWORD=your-password
   ACTUAL_BUDGET_SYNC_ID=your-budget-id
   BEARER_TOKEN=your-token
   PORT=3000
   ```

4. **Save and redeploy**

## Nixpacks Configuration

Nixpacks will automatically:
- Detect Node.js project from `package.json`
- Run `npm ci` to install dependencies
- Run `npm run build` if specified
- Start the application with your start command

### Custom Nixpacks Configuration (Optional)

If you need custom Nixpacks configuration, create a `nixpacks.toml` file:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "node build/index.js --sse --enable-write"
```

## Verifying Environment Variables

After deployment, you can verify environment variables are accessible:

1. **Check logs** - Environment variable errors will appear in logs
2. **Use Inspector** - Test the server with MCP Inspector
3. **Check server startup** - Look for initialization messages

### Common Issues

#### Issue: Environment variables not accessible
**Solution:** Remove `VITE_` prefix and redeploy

#### Issue: Server fails to start
**Check:**
- All required environment variables are set
- No typos in variable names
- Values don't contain extra quotes or spaces

#### Issue: Build fails
**Check:**
- Node.js version compatibility (requires Node >= 20.0.0)
- All dependencies install correctly
- Build command completes successfully

## Testing Deployment

### 1. Check Server Health

```bash
curl https://your-easypanel-domain.com/
```

Should return HTML with server information.

### 2. Test MCP Endpoint

```bash
curl https://your-easypanel-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 3. Use MCP Inspector

```bash
npx @modelcontextprotocol/inspector \
  -e ACTUAL_SERVER_URL=$ACTUAL_SERVER_URL \
  -e ACTUAL_PASSWORD=$ACTUAL_PASSWORD \
  -e ACTUAL_BUDGET_SYNC_ID=$ACTUAL_BUDGET_SYNC_ID \
  node build/index.js
```

## Security Best Practices

1. **Never commit `.env` files** - Use Easy Panel environment variables
2. **Use Bearer Token** - Enable `--enable-bearer` and set `BEARER_TOKEN`
3. **Restrict Access** - Use Easy Panel's network/firewall rules if available
4. **Rotate Credentials** - Regularly update passwords and tokens
5. **Use HTTPS** - Ensure Easy Panel provides HTTPS (usually automatic)

## Troubleshooting

### Environment Variables Not Working

1. **Check variable names** - Must match exactly (case-sensitive)
2. **Remove VITE_ prefix** - If present, remove it
3. **Redeploy** - Environment variable changes require redeployment
4. **Check logs** - Look for error messages about missing variables

### Server Won't Start

1. **Check logs** - Look for initialization errors
2. **Verify Actual Budget connection** - Ensure `ACTUAL_SERVER_URL` is reachable
3. **Check credentials** - Verify `ACTUAL_PASSWORD` and `ACTUAL_BUDGET_SYNC_ID`
4. **Test locally** - Try running the same command locally

### Build Fails

1. **Check Node.js version** - Requires Node >= 20.0.0
2. **Check dependencies** - Ensure `package.json` is valid
3. **Check build logs** - Look for specific error messages
4. **Try clean build** - Remove `node_modules` and rebuild

## Additional Resources

- [Easy Panel Documentation](https://easypanel.io/docs)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [MCP Server Debugging Guide](./debugging.md)
