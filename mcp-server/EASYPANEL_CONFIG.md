# Easy Panel Build Configuration

## Option 1: Nixpacks (Auto-Detection) - RECOMMENDED

If Easy Panel only shows Nixpacks version options (like `1.34.1`), use auto-detection:

### Configuration

```
Version: 1.34.1 (or latest available Nixpacks version)
Install Command: npm ci
Build Command: npm run build
Start Command: node build/index.js --sse --enable-write
Nix Packages: (leave empty)
APT Packages: (leave empty)
```

### How It Works

Nixpacks will auto-detect Node.js version from:
- ✅ `.nvmrc` file (created - specifies Node.js 20)
- ✅ `.node-version` file (created - specifies Node.js 20)
- ✅ `package.json` engines field (`"node": ">=20.0.0"`)

**The Version field (`1.34.1`) is for Nixpacks itself, not Node.js.** Nixpacks will read the `.nvmrc` file to determine which Node.js version to use.

## Option 2: Dockerfile (Full Control)

If Nixpacks auto-detection doesn't work, use the Dockerfile:

### Configuration

1. In Easy Panel, switch build method from **Nixpacks** to **Dockerfile**
2. The `Dockerfile` is already created and uses Node.js 20
3. No additional configuration needed

### Why Use Dockerfile?

- ✅ Explicit Node.js version control
- ✅ Reproducible builds
- ✅ Works regardless of Nixpacks version

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

### If Using Nixpacks (Option 1):

1. Ensure `.nvmrc` and `.node-version` files exist (already created)
2. Keep Version field as `1.34.1` (or latest Nixpacks version)
3. Verify other commands are set correctly
4. Save and redeploy

Nixpacks will read `.nvmrc` and use Node.js 20 automatically.

### If Using Dockerfile (Option 2):

1. Switch build method to **Dockerfile** in Easy Panel
2. No version field needed
3. Save and redeploy

Dockerfile explicitly uses Node.js 20.

## Verification

After deployment, check logs for:
- ✅ Node.js version should be 20.x or 22.x
- ✅ Build completes successfully
- ✅ Server starts without "Cannot find module" errors
