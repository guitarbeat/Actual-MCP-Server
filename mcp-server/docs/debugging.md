# Debugging Guide

A comprehensive guide to debugging the Actual Budget MCP Server.

## Debugging Tools Overview

The MCP ecosystem provides several tools for debugging at different levels:

### MCP Inspector
- **Interactive debugging interface** - Test tools, resources, and prompts directly
- **Direct server testing** - Bypass client applications for isolated testing
- **Real-time message inspection** - See all MCP protocol messages

### Claude Desktop Developer Tools
- **Integration testing** - Test server behavior in production environment
- **Log collection** - Access detailed server logs
- **Chrome DevTools integration** - Inspect client-side behavior

### Server Logging
- **Structured logging** - Consistent log format with context
- **Error tracking** - Comprehensive error logging with stack traces
- **Performance monitoring** - Track operation timing and resource usage

## Quick Start

### Using MCP Inspector

The easiest way to debug the server:

```bash
# Build and start inspector with .env file
npm run inspector

# Or use custom environment variables
npm run inspector:custom
```

The inspector will start:
- **Client UI**: http://localhost:6274
- **Proxy Server**: http://localhost:6277

Open the UI in your browser to interact with the server directly.

### Viewing Logs

#### Claude Desktop Logs (macOS)

```bash
# Follow logs in real-time
tail -n 20 -F ~/Library/Logs/Claude/mcp*.log
```

#### Server Logs (Stdio Mode)

In stdio mode, logs are automatically sent via MCP logging protocol. They appear in:
- Claude Desktop logs
- Inspector console
- Any MCP client that supports logging

#### Server Logs (HTTP/SSE Mode)

In HTTP/SSE mode, logs go to `stderr` and can be captured:

```bash
# Run server and capture logs
node build/index.js --sse 2>&1 | tee server.log
```

## Debugging in Claude Desktop

### Checking Server Status

The Claude.app interface provides basic server status:

1. Click the **⚙️** icon to view:
   - Connected servers
   - Available prompts and resources

2. Click the **🔍 Search and tools** icon to view:
   - Tools made available to the model

### Using Chrome DevTools

Access Chrome's developer tools inside Claude Desktop:

1. Create `developer_settings.json`:
   ```bash
   echo '{"allowDevTools": true}' > ~/Library/Application\ Support/Claude/developer_settings.json
   ```

2. Open DevTools: **Command-Option-Shift-i**

   **Note**: You'll see two DevTools windows:
   - Main content window
   - App title bar window

3. Use the **Console** panel to inspect client-side errors
4. Use the **Network** panel to inspect:
   - Message payloads
   - Connection timing

## Common Issues

### Working Directory

When using MCP servers with Claude Desktop:

- The working directory may be undefined (like `/` on macOS)
- Always use **absolute paths** in configuration and `.env` files

**Example in `claude_desktop_config.json`:**

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/absolute/path/to/build/index.js"],
      "env": {
        "ACTUAL_SERVER_URL": "https://your-server.com",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

**Avoid relative paths** like `./build/index.js` or `../data`

### Environment Variables

MCP servers inherit only a subset of environment variables automatically (`USER`, `HOME`, `PATH`).

To provide your own variables, specify an `env` key in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "ACTUAL_SERVER_URL": "https://your-server.com",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id",
        "BEARER_TOKEN": "your-token",
        "PORT": "3000"
      }
    }
  }
}
```

### Server Initialization

Common initialization problems:

#### Path Issues
- ❌ Incorrect server executable path
- ❌ Missing required files
- ❌ Permission problems

**Solution**: Use absolute paths and verify file permissions

#### Configuration Errors
- ❌ Invalid JSON syntax
- ❌ Missing required fields
- ❌ Type mismatches

**Solution**: Validate JSON and check required environment variables

#### Environment Problems
- ❌ Missing environment variables
- ❌ Incorrect variable values
- ❌ Permission restrictions

**Solution**: Verify all required variables are set correctly

### Connection Problems

When servers fail to connect:

1. **Check Claude Desktop logs**
   ```bash
   tail -F ~/Library/Logs/Claude/mcp*.log
   ```

2. **Verify server process is running**
   ```bash
   ps aux | grep "node.*build/index.js"
   ```

3. **Test standalone with Inspector**
   ```bash
   npm run inspector
   ```

4. **Verify protocol compatibility**
   - Check MCP SDK version matches
   - Verify transport type (stdio vs HTTP)

## Logging Implementation

### Server-Side Logging

The server uses structured logging with the following features:

#### Stdio Transport (Default)

In stdio mode, all logs go through MCP logging protocol:
- Logs to `stderr` are captured automatically
- Logs are sent via `sendLoggingMessage()` to the client
- Prevents interference with JSON-RPC protocol on `stdout`

#### HTTP/SSE Transport

In HTTP/SSE mode:
- Logs go to `stderr` (can be captured)
- Also sent via MCP logging when transport is connected

#### Log Levels

The server uses standard log levels:

- **`info`**: General information, successful operations
- **`warning`**: Warnings, non-critical issues
- **`error`**: Errors, failures, exceptions

#### Structured Logging Format

Logs include:
- **Timestamp**: ISO 8601 format
- **Context**: Operation, tool, arguments
- **Level**: info, warning, or error
- **Message**: Human-readable description
- **Stack traces**: For errors (in development mode)

**Example log output:**

```
[ERROR] 2025-12-06T04:41:38.657Z [tool=get-transactions, account=abc123]: Failed to fetch transactions
[ERROR] Stack trace:
Error: Connection timeout
    at fetchTransactions (fetch-transactions.ts:45)
    at handleToolCall (tools.ts:123)
```

### Important Events Logged

The server logs the following events:

#### Initialization
- API connection attempts
- Budget loading
- Configuration validation
- Auto-sync setup

#### Resource Access
- Account fetching
- Transaction queries
- Category lookups
- Payee resolutions

#### Tool Execution
- Tool invocations
- Parameter validation
- Execution results
- Performance metrics

#### Error Conditions
- Connection failures
- Authentication errors
- Validation failures
- API errors

### Performance Tracking

Enable performance logging by setting:

```bash
DEBUG_PERFORMANCE=true
```

This logs:
- Operation timing
- Cache hit/miss rates
- API call counts
- Connection reuse statistics

## Debugging Workflow

### Development Cycle

#### 1. Initial Development
- Use **Inspector** for basic testing
- Implement core functionality
- Add logging points at key operations

#### 2. Integration Testing
- Test in **Claude Desktop**
- Monitor logs for errors
- Check error handling paths

#### 3. Production Debugging
- Review Claude Desktop logs
- Use Inspector to reproduce issues
- Check environment configuration

### Testing Changes

To test changes efficiently:

- **Configuration changes**: Restart Claude Desktop
- **Server code changes**: Use **Command-R** to reload in Claude Desktop
- **Quick iteration**: Use **Inspector** during development

### Debugging Checklist

When encountering issues:

- [ ] Check server logs for errors
- [ ] Verify environment variables are set
- [ ] Test with Inspector to isolate the issue
- [ ] Check Claude Desktop configuration
- [ ] Verify network connectivity (for remote servers)
- [ ] Check file permissions (for local data)
- [ ] Review recent code changes

## Best Practices

### Logging Strategy

#### Structured Logging
- ✅ Use consistent formats
- ✅ Include context (tool, operation, args)
- ✅ Add timestamps
- ✅ Track request IDs (when available)

#### Error Handling
- ✅ Log stack traces
- ✅ Include error context
- ✅ Track error patterns
- ✅ Monitor recovery attempts

#### Performance Tracking
- ✅ Log operation timing
- ✅ Monitor resource usage
- ✅ Track message sizes
- ✅ Measure latency

### Security Considerations

When debugging:

#### Sensitive Data
- ⚠️ Sanitize logs before sharing
- ⚠️ Protect credentials
- ⚠️ Mask personal information
- ⚠️ Don't commit `.env` files

#### Access Control
- ✅ Verify permissions
- ✅ Check authentication
- ✅ Monitor access patterns
- ✅ Use bearer tokens in production

## Getting Help

When encountering issues:

### First Steps
1. Check server logs
2. Test with Inspector
3. Review configuration
4. Verify environment

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share solutions

### Providing Information

When reporting issues, include:

- **Log excerpts**: Relevant error messages
- **Configuration files**: (sanitized) config and `.env.example`
- **Steps to reproduce**: Clear reproduction steps
- **Environment details**: OS, Node version, MCP SDK version

## Example Debugging Session

### Problem: Server fails to connect to Actual Budget

1. **Check logs**:
   ```bash
   tail -F ~/Library/Logs/Claude/mcp*.log
   ```

2. **Test with Inspector**:
   ```bash
   npm run inspector
   ```

3. **Verify environment**:
   ```bash
   cat .env
   # Check ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_BUDGET_SYNC_ID
   ```

4. **Test connection manually**:
   ```bash
   curl https://actual.alw.lol/api/health
   ```

5. **Check server initialization**:
   Look for initialization logs in Inspector console

### Problem: Tool returns unexpected results

1. **Enable debug logging**:
   ```bash
   DEBUG_PERFORMANCE=true npm run inspector
   ```

2. **Test tool in Inspector**:
   - Open Inspector UI
   - Navigate to Tools
   - Execute the tool
   - Review request/response

3. **Check tool implementation**:
   - Review tool handler code
   - Check parameter validation
   - Verify API calls

4. **Review logs**:
   - Check for errors or warnings
   - Review performance metrics
   - Verify cache behavior

## Next Steps

- See [Inspector Guide](./README.md#mcp-inspector) for detailed inspector usage
- Review [Error Handling](./error-handling.md) for error handling patterns
- Check [Transport Research](./transport-research.md) for transport-specific debugging
