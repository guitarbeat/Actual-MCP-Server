# Fixing Actual Budget Database Migration Issue

## Problem

Your Actual Budget server has a database migration mismatch:
- Migration `1759260219000` is marked as applied
- But it's missing from the available migrations list
- This causes sync failures

## Error Details

```
Database is out of sync with migrations
Error: out-of-sync-migrations
TypeError: Cannot read properties of undefined (reading 'timestamp')
```

## Solutions

### Option 1: Update Actual Budget Server (Recommended)

The missing migration suggests your Actual Budget server version is outdated or corrupted.

1. **Check Actual Budget version:**
   - Go to `https://actual.alw.lol`
   - Check the version in the UI
   - Or check the Docker image version in Easy Panel

2. **Update to latest version:**
   - In Easy Panel, update the `actualbudget` service
   - Use latest image: `ghcr.io/actualbudget/actual:latest`
   - Restart the service

3. **Let migrations run:**
   - The updated version should have all required migrations
   - It will automatically apply missing migrations on startup

### Option 2: Reset Database (⚠️ Data Loss Warning)

**⚠️ WARNING: This will delete all your budget data!**

Only do this if you have backups or don't need the data:

1. **Stop Actual Budget service** in Easy Panel
2. **Delete the data volume:**
   - Go to Easy Panel → Volumes
   - Find the volume mounted to `/data` for `actualbudget` service
   - Delete it (or rename it as backup)
3. **Restart the service:**
   - Start `actualbudget` service
   - It will create a fresh database
4. **Re-sync your budget:**
   - Connect via web UI
   - Re-upload your budget file if needed

### Option 3: Manual Database Fix (Advanced)

If you have database access:

1. **Connect to the database** (SQLite file in `/data` volume)
2. **Check migration table:**
   ```sql
   SELECT * FROM __migrations__ ORDER BY id;
   ```
3. **Remove the problematic migration:**
   ```sql
   DELETE FROM __migrations__ WHERE id = '1759260219000';
   ```
4. **Restart Actual Budget server**

**⚠️ This is risky and may cause data corruption. Only attempt if you know what you're doing.**

### Option 4: Restore from Backup

If you have a backup of the Actual Budget data:

1. **Stop Actual Budget service**
2. **Restore the backup** to the `/data` volume
3. **Start the service**
4. **Verify migrations are in sync**

## Recommended Steps

1. **First, try updating Actual Budget:**
   ```bash
   # In Easy Panel, update actualbudget service
   # Use image: ghcr.io/actualbudget/actual:latest
   ```

2. **If that doesn't work, check Actual Budget logs:**
   - Look for migration-related errors
   - Check if there are any warnings

3. **As last resort, reset database** (if data loss is acceptable)

## After Fixing

Once the Actual Budget database is fixed:

1. **Verify Actual Budget works:**
   ```bash
   curl https://actual.alw.lol/api/health
   ```

2. **Restart MCP server:**
   - The MCP server will automatically reconnect
   - It should initialize successfully now

3. **Test MCP server:**
   ```bash
   curl https://your-mcp-domain/
   ```

## Prevention

To prevent this in the future:

1. **Keep Actual Budget updated** - Use `latest` tag or regular updates
2. **Backup your data** - Regularly backup the `/data` volume
3. **Monitor migrations** - Check logs for migration warnings

## Summary

**The issue is with Actual Budget server, not MCP server.**

The MCP server is working correctly - it's successfully connecting to Actual Budget, but Actual Budget's database has migration issues that prevent it from syncing.

**Fix Actual Budget first, then the MCP server will work automatically.**
