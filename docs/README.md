# Actual Budget MCP Server - Documentation

Welcome to the Actual Budget MCP Server documentation.

## Quick Links

- **[MCP Configuration Guide](./MCP_CONFIG_GUIDE.md)** - Setup instructions for Claude Desktop, Cursor IDE, and Poke MCP
- **[Poke MCP Guide](./POKE_MCP.md)** - Comprehensive guide for using the server with Poke MCP
- **[Project Status](./PROJECT_STATUS.md)** - Current project status, API coverage, and outstanding issues

## Documentation Structure

### Getting Started

1. **New to MCP?** Start with the [MCP Configuration Guide](./MCP_CONFIG_GUIDE.md) to set up the server with your preferred client.

2. **Using Poke MCP?** See the dedicated [Poke MCP Guide](./POKE_MCP.md) for detailed setup instructions.

3. **Want to know what's implemented?** Check [Project Status](./PROJECT_STATUS.md) for API coverage and feature status.

### Configuration Guides

- **[MCP_CONFIG_GUIDE.md](./MCP_CONFIG_GUIDE.md)** - Configuration for all MCP clients
  - Claude Desktop setup
  - Cursor IDE setup
  - Poke MCP quick reference
  - Docker configuration examples

- **[POKE_MCP.md](./POKE_MCP.md)** - Complete Poke MCP guide
  - Server setup and configuration
  - Connection instructions
  - Security best practices
  - Troubleshooting
  - Example queries

### Project Information

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Development status
  - API coverage summary
  - Resolved issues
  - Outstanding issues
  - Recommendations

### Templates

- **[templates/INITIAL_TEMPLATE.md](./templates/INITIAL_TEMPLATE.md)** - Template for feature development

## Server Features

The Actual Budget MCP Server provides:

- **100+ Tools** for managing accounts, transactions, budgets, categories, payees, rules, and schedules
- **Resources** for accessing account and transaction data
- **Prompts** for financial insights and budget analysis
- **HTTP/SSE Transport** for modern MCP clients like Poke MCP
- **Standard MCP Protocol** for compatibility with Claude Desktop and Cursor IDE

## Common Tasks

### Deploy to Railway (Recommended)

See the main [README.md](../README.md) for step-by-step Railway deployment instructions using Nixpacks.

### Local Development (Optional)

For local testing or development:

```bash
# Build and start server
npm run build
node build/index.js --sse --enable-write

# With bearer authentication
export BEARER_TOKEN="your-secure-token"
node build/index.js --sse --enable-write --enable-bearer

# Test connection
node build/index.js --test-resources
```

## Need Help?

- Check the [troubleshooting section](./POKE_MCP.md#troubleshooting) in the Poke MCP guide
- Review [Project Status](./PROJECT_STATUS.md) for known issues
- See the main [README.md](../README.md) for feature documentation
