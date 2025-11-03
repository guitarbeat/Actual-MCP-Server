# MCP Client Configuration Guide

## Location of MCP Configuration File

The MCP client configuration file location depends on your client:

### For Claude Desktop:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### For Cursor IDE:
Cursor IDE may store MCP configuration in:
- `~/.config/cursor/mcp.json` or similar
- Or managed through Cursor's UI settings (Settings → Features → Model Context Protocol)

## Required Change

Add `"--enable-write"` to the `args` array in your MCP configuration.

### Example Configuration (Node.js - npx):
```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "ACTUAL_BUDGET_PASSWORD": "your-budget-password"
      }
    }
  }
}
```

### Example Configuration (Node.js - local):
```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/workspace/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "ACTUAL_BUDGET_PASSWORD": "your-budget-password"
      }
    }
  }
}
```

### Example Configuration (Docker):
```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/data:/data",
        "-e",
        "ACTUAL_PASSWORD=your-password",
        "-e",
        "ACTUAL_SERVER_URL=https://your-actual-server.com",
        "-e",
        "ACTUAL_BUDGET_SYNC_ID=your-budget-id",
        "-e",
        "ACTUAL_BUDGET_PASSWORD=your-budget-password",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

## What Changed

**FROM:**
```json
"args": ["/path/to/actual-mcp/build/index.js"]
```

**TO:**
```json
"args": ["/path/to/actual-mcp/build/index.js", "--enable-write"]
```

## Next Steps

1. Locate your MCP configuration file using the paths above
2. Add `"--enable-write"` to the `args` array
3. Save the configuration file
4. Restart your MCP client (Cursor IDE or Claude Desktop)

## Verification

After restarting, the budget tools (set-budget-amount, set-budget-carryover, hold-budget-for-next-month, reset-budget-hold, etc.) should be available in your client.
