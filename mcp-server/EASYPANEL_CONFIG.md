# Easy Panel Nixpacks Configuration

## Correct Configuration

Copy these exact values into Easy Panel's Nixpacks settings:

```
Version: 20
Install Command: npm ci
Build Command: npm run build
Start Command: node build/index.js --sse --enable-write
Nix Packages: (leave empty)
APT Packages: (leave empty)
```

## Important Notes

### Version Field
- ✅ **Use:** `20` or `22` (Node.js major version)
- ❌ **Don't use:** `1.34.1` (this is wrong - looks like a Nixpacks version number)

### Why Version Matters
The Version field tells Nixpacks which Node.js runtime to install:
- `20` → Installs Node.js 20.x
- `22` → Installs Node.js 22.x
- Your `package.json` requires `>=20.0.0`, so either works

### Environment Variables Required

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
- Exact variable names (case-sensitive)

## Quick Fix Steps

1. Go to Easy Panel → Your Service → Build Configuration
2. Find the **Version** field
3. Change from `1.34.1` to `20` (or `22`)
4. Save and redeploy

After changing, the build should:
- ✅ Install Node.js 20.x
- ✅ Run `npm ci` successfully
- ✅ Run `npm run build` successfully
- ✅ Start server with correct Node.js version

## Verification

After deployment, check logs for:
- ✅ Node.js version should be 20.x or 22.x
- ✅ Build completes successfully
- ✅ Server starts without "Cannot find module" errors
